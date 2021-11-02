import { flags, SfdxCommand } from "@salesforce/command";
import { Messages, SfdxError } from "@salesforce/core";
import { AnyJson } from "@salesforce/ts-types";
import * as fs from "fs";
import * as path from "path";
import { Record, RecordResult, SuccessResult, ErrorResult, Connection } from 'jsforce';
const util = require("util");

// Initialize Messages with the current plugin directory
Messages.importMessagesDirectory(__dirname);

// Load the specific messages for this file. Messages from @salesforce/command, @salesforce/core,
// or any library that is using the messages framework can also be loaded this way.
const messages = Messages.loadMessages("texei-sfdx-plugin", "data-import");

let conn: Connection;
let objectList:Array<DataPlanSObject>;
let recordIdsMap: Map<string, string>;

interface ErrorResultDetail {
  statusCode: string;
  message: string;
  fields: string[];
}

export default class Import extends SfdxCommand {
  public static description = messages.getMessage("commandDescription");

  public static examples = [
    `$ sfdx texei:data:import --inputdir ./data --targetusername texei-scratch
  Data imported!
  `
  ];

  protected static flagsConfig = {
    inputdir: flags.string({
      char: "d",
      description: messages.getMessage("inputFlagDescription"),
      required: true
    }),
    allornone: flags.boolean({
      char: "a",
      description: messages.getMessage("allOrNoneFlagDescription"),
      required: false
    }),
    dataplan: flags.string({
      char: 'p',
      description: messages.getMessage('dataPlanFlagDescription'),
      required: false
    })
  };

  // Comment this out if your command does not require an org username
  protected static requiresUsername = true;

  // Comment this out if your command does not support a hub org username
  protected static requiresDevhubUsername = false;

  // Set this to true if your command requires a project workspace; 'requiresProject' is false by default
  protected static requiresProject = false;

  public async run(): Promise<AnyJson> {
    conn = await this.org.getConnection();
    recordIdsMap = new Map<string, string>();

    // Just add potential SfdxOrgUser that could be used during export
    const scratchOrgUserId: any = ((await conn.query(
      `Select Id from User where username = '${this.org.getUsername()}'`
    )).records[0] as any).Id;
    recordIdsMap.set("SfdxOrgUser", scratchOrgUserId);

    // Get files in directory
    const filesPath = path.join(process.cwd(), this.flags.inputdir);

    // Read data file
    const readDir = util.promisify(fs.readdir);
    let dataFiles = (await readDir(filesPath, "utf8")).filter(f => {
      return !isNaN(f.substr(0, f.indexOf('-')));
    }).sort(function(a, b) {
      return a.substr(0, a.indexOf('-'))-b.substr(0, b.indexOf('-'))
    });

    if (this.flags.dataplan) {
      // Read objects list from file
      const readFile = util.promisify(fs.readFile);
      const dataPlan: DataPlan = JSON.parse(await readFile(this.flags.dataplan, "utf8"));
      objectList = dataPlan.sObjects;
      if (dataFiles.length != objectList.length) {
        throw new SfdxError(`Object count in data-plan.json and import file count do not match!`);
      }
    }
    
    // Read and import data
    for (let i = 0; i < dataFiles.length; i++) {
      const dataFile = dataFiles[i];
      const externalIdField = objectList?.[i]?.externalId;

      // If file doesn't start with a number, just don't parse it (could be data-plan.json)
      if (!isNaN(dataFile.substring(0,1))) {
        const objectName = await this.getObjectNameFromFile(dataFile);

        this.ux.startSpinner(`Importing ${dataFile}`, null, { stdout: true });

        const objectRecords:Array<Record> = (await this.readFile(dataFile)).records;

        await this.prepareDataForInsert(objectName, objectRecords);
        await this.upsertData(objectRecords, objectName, externalIdField);

        this.ux.stopSpinner(`Done.`);
      }
    }

    return { message: "Data imported" };
  }

  private async prepareDataForInsert(sobjectName: string, jsonData: any) {
    // TODO: Move getLookupsForObject here and check record types at the same time
    const lookups: Array<string> = await this.getLookupsForObject(sobjectName);
    let recTypeInfos = new Map<string, string>();

    // Get Record Types information with newly generated Ids
    recTypeInfos = await this.getRecordTypeMap(sobjectName);

    // If object is PricebookEntry, look for standard price book
    let standardPriceBookId = '';
    if (sobjectName === 'PricebookEntry') {
      standardPriceBookId = ((await conn.query('Select Id from Pricebook2 where IsStandard = true')).records[0] as any).Id;
    }
    
    // Replace data to import with newly generated Record Type Ids
    for (const sobject of jsonData) {

      // Replace all lookups
      for (const lookup of lookups) {
        if (sobject[lookup] && !(sobjectName === 'PricebookEntry' && sobject.Pricebook2Id === 'StandardPriceBook' && lookup === 'Pricebook2Id')) {
          sobject[lookup] = recordIdsMap.get(sobject[lookup]);
        }   
      }

      // Replace Record Types, if any
      if (recTypeInfos.size > 0) {
        sobject.RecordTypeId = recTypeInfos.get(sobject.RecordTypeId);
      }

      // If object is PricebookEntry, use standard price book from target org
      if (sobjectName === 'PricebookEntry' && sobject.Pricebook2Id === 'StandardPriceBook') {
        sobject.Pricebook2Id = standardPriceBookId;
      }

      // If object was already inserted in a previous batch, add Id to update it
      if (recordIdsMap.get(sobject.attributes.referenceId)) {
        sobject.Id = recordIdsMap.get(sobject.attributes.referenceId);
      }
    }
  }

  private async upsertData(records: Array<any>, sobjectName: string, externalIdField: string) {
    
    let sobjectsResult:Array<RecordResult> = new Array<RecordResult>();

    // So far, a whole file will be either upserted, inserted or updated
    if (externalIdField) {
      // external id field is specified in data-plan.json --> upsert
      this.debug(`DEBUG upserting ${sobjectName} records using external id field '${externalIdField}'`);

      // @ts-ignore: Don't know why, but TypeScript doesn't use the correct method override
      sobjectsResult = await conn.sobject(sobjectName).upsert(records, externalIdField, { allowRecursive: true, allOrNone: this.flags.allornone })
                                                      .catch(err => {
                                                        throw new SfdxError(`Error upserting records: ${err}`);
                                                      });
    }
    else if (records[0] && records[0].Id) {
      // There is an Id, so it's an update
      this.debug(`DEBUG updating ${sobjectName} records`);

      // @ts-ignore: Don't know why, but TypeScript doesn't use the correct method override
      sobjectsResult = await conn.sobject(sobjectName).update(records, { allowRecursive: true, allOrNone: this.flags.allornone })
                                                      .catch(err => {
                                                        throw new SfdxError(`Error importing records: ${err}`);
                                                      });
    }
    else {
      // No Id, insert
      this.debug(`DEBUG inserting ${sobjectName} records`);

      // @ts-ignore: Don't know why, but TypeScript doesn't use the correct method override
      sobjectsResult = await conn.sobject(sobjectName).insert(records, { allowRecursive: true, allOrNone: this.flags.allornone })
                                                      .catch(err => {
                                                        throw new SfdxError(`Error importing records: ${err}`);
                                                      });
    }

    // Some errors are part of RecordResult but don't throw an exception
    for (let i = 0; i < sobjectsResult.length; i++) {
      
      if (!sobjectsResult[i].success) {
        const res:ErrorResult = sobjectsResult[i] as ErrorResult;
        const errors:ErrorResultDetail = res.errors[0] as any;
        // TODO: add a flag to allow this to be added to the logs
        if (errors.statusCode !== 'ALL_OR_NONE_OPERATION_ROLLED_BACK') {
          this.ux.error(`Error importing record ${records[i].attributes.referenceId}: ${errors.statusCode}-${errors.message}${errors.fields.length > 0?'('+errors.fields+')':''}`);
        }
      }
    }
    
    // Update the map of Refs/Ids
    this.updateMapIdRef(records, sobjectsResult, recordIdsMap);
  }

  private async readFile(fileName: string) {
    // Get product data file path
    let filePath = fileName;
    if (this.flags.inputdir) {
      filePath = path.join(this.flags.inputdir, fileName);
    }

    filePath = path.join(process.cwd(), filePath);

    // Read data file
    const readFile = util.promisify(fs.readFile);
    return JSON.parse(await readFile(filePath, "utf8"));
  }

  // Get a map of DeveloperName/Id for RecordTypes
  private async getRecordTypeMap(sobjectName) {
    let recTypesMap = new Map();

    const conn = this.org.getConnection();
    const recTypeResults = (await conn.query(
      `SELECT Id, DeveloperName FROM RecordType WHERE SobjectType = '${sobjectName}'`
    )).records as any;

    for (const recType of recTypeResults) {
      recTypesMap.set(recType.DeveloperName, recType.Id);
    }

    return recTypesMap;
  }

  private async updateMapIdRef(
    inputRecords: Array<any>,
    inputResults: Array<RecordResult>,
    recordIdsMap: Map<string, string>
  ) {
    // Update the map of Refs/Ids
    let index = 0;
    for (let input of inputResults) {
      input = input as SuccessResult;
      recordIdsMap.set(inputRecords[index].attributes.referenceId, input.id);

      index++;
    }
  }

  private async getObjectNameFromFile(filePath: string) {
    // Check expected file name format
    if (filePath.indexOf("-") === -1 || filePath.indexOf(".json") === -1) {
      throw new SfdxError(`Invalid file name: ${filePath}`);
    }

    // From 1-MyCustomObject__c.json or 1-MyCustomObject-MyLabel__c.json to MyCustomObject__c
    let fileName: string = '';
    fileName = filePath.substring(filePath.indexOf("-") + 1).replace(".json", "");
    if (fileName.indexOf("-") > 0) {
      // Format is 1-MyCustomObject-MyLabel__c.json
      fileName = fileName.substring(0, fileName.indexOf("-"));
    }

    return fileName;
  }

  private async getLookupsForObject(objectName: string) {

    let lookups = [];
    const describeResult = await conn.sobject(objectName).describe();

    for (const field of describeResult.fields) {
      // If it's a lookup, also add it to the lookup list, to be replaced later
      // Excluding OwnerId as we are not importing users anyway
      if (
        field.createable &&
        field.referenceTo &&
        field.referenceTo.length > 0 &&
        field.name != "OwnerId" &&
        field.name != "RecordTypeId"
      ) {
        lookups.push(field.name);
      }
    }

    return lookups;
  }
}