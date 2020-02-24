import { flags, SfdxCommand } from "@salesforce/command";
import { Messages, SfdxError } from "@salesforce/core";
import { AnyJson } from "@salesforce/ts-types";
import * as fs from "fs";
import * as path from "path";
import { Record, RecordResult, SuccessResult, Connection } from 'jsforce';
const util = require("util");

// Initialize Messages with the current plugin directory
Messages.importMessagesDirectory(__dirname);

// Load the specific messages for this file. Messages from @salesforce/command, @salesforce/core,
// or any library that is using the messages framework can also be loaded this way.
const messages = Messages.loadMessages("texei-sfdx-plugin", "data-import");

let conn: Connection;
let recordIdsMap: Map<string, string>;

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
    let dataFiles = (await readDir(filesPath, "utf8")).sort(function(a, b) {
      return a.substr(0, a.indexOf('-'))-b.substr(0, b.indexOf('-'))
    });
    
    // Read and import data
    for (const dataFile of dataFiles) {

      // If file doesn't start with a number, just don't parse it (could be data-plan.json)
      if (!isNaN(dataFile.substring(0,1))) {
        const objectName = await this.getObjectNameFromFile(dataFile);

        this.ux.startSpinner(`Importing ${dataFile}`, null, { stdout: true });

        const objectRecords:Array<Record> = (await this.readFile(dataFile)).records;

        await this.prepareDataForInsert(objectName, objectRecords);
        await this.insertData(objectRecords, objectName);

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

    // Replace data to import with newly generated Record Type Ids
    for (const sobject of jsonData) {
      // Replace all lookups
      for (const lookup of lookups) {
        sobject[lookup] = recordIdsMap.get(sobject[lookup]);
      }

      // Replace Record Types, if any
      if (recTypeInfos.size > 0) {
        sobject.RecordTypeId = recTypeInfos.get(sobject.RecordTypeId);
      }

      //delete product.attributes;
    }
  }

  private async insertData(records: Array<any>, sobjectName: string) {
    // Using jsforce directly to be able to create several records in one call
    // https://jsforce.github.io/blog/posts/20180726-jsforce19-features.html
    // https://github.com/forcedotcom/sfdx-core/issues/141
    
    // @ts-ignore: Don't know why, but TypeScript doesn't use the correct method override
    const sobjectsResult:Array<RecordResult> = await conn.sobject(sobjectName).create(records, { allowRecursive: true, allOrNone: true })
                                                                              .catch(err => {
                                                                                throw new SfdxError(`Error importing records: ${err}`);
                                                                              });

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