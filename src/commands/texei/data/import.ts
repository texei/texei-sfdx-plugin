import { flags, SfdxCommand } from "@salesforce/command";
import { Messages, SfdxError } from "@salesforce/core";
import { AnyJson } from "@salesforce/ts-types";
import * as fs from "fs";
import * as path from "path";
import { Record, RecordResult, SuccessResult, ErrorResult, Connection } from 'jsforce';
const util = require("util");
const csv = require("csvtojson");

// Initialize Messages with the current plugin directory
Messages.importMessagesDirectory(__dirname);

// Load the specific messages for this file. Messages from @salesforce/command, @salesforce/core,
// or any library that is using the messages framework can also be loaded this way.
const messages = Messages.loadMessages("texei-sfdx-plugin", "data-import");

let conn: Connection;
let recordIdsMap: Map<string, string>;
let lookupOverrideMap: Map<string, Set<string>>;
let queriedLookupOverrideRecords: Map<string, Record[]>;
let remainingDataFiles: Set<string>;
let isVerbose: boolean = false;

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
    verbose: flags.builtin({
      description: messages.getMessage('verbose'),
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
    isVerbose = this.flags.verbose;

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

    // Used later to parse remaining files if a lookup override is found
    remainingDataFiles = new Set(dataFiles);

    // Read and import data
    for (let i = 0; i < dataFiles.length; i++) {
      const dataFile = dataFiles[i];

      // If file doesn't start with a number, just don't parse it (could be data-plan.json)
      if (!isNaN(dataFile.substring(0,1))) {
        const objectName = await this.getObjectNameFromFile(dataFile);

        this.ux.startSpinner(`Importing ${dataFile}`, null, { stdout: true });

        const objectData:any = (await this.readFile(dataFile));
        const externalIdField = objectData?.attributes?.externalId;
        const objectRecords:Array<Record> = objectData.records;

        // TODO: If there is a lookupOverride, query all records from sObject
        // Parse file 1st record if there are lookup override
        // If yes, collect all needed fields + Id, and query all records for all needed sObjects
        // Create a map with constructed Ids from lookupOverride, mapped with the real record Id
        // Use it later to replace correctly before insert
        // Clean everything at the end
        // Look for performance: maybe it's better once a file with a lookupOverride is found to:
        // Pre-read all next files and see what sObjects are needed to see if we need to keep the query result
        // Maybe do it at first from the very beginning to have all fields needed from all files ? (should be better)
        // Also keep a number of files using the sObject, so that once it's not useful anymore we can clean the memory from list not useful anymore
        // conn.bulk.query("SELECT Id, Name, NumberOfEmployees FROM Account")
        await this.prepareDataForInsert(objectName, objectRecords);
        await this.upsertData(objectRecords, objectName, externalIdField);

        this.ux.stopSpinner(`Done.`);
      }

      remainingDataFiles.delete(dataFile);
    }

    return { message: "Data imported" };
  }

  private async prepareDataForInsert(sobjectName: string, jsonData: any) {
    // TODO: Move getLookupsForObject here and check record types at the same time
    const lookups: any[] = await this.getLookupsForObject(sobjectName);
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

        // Regular lookups
        if (sobject[lookup.name] && !(sobjectName === 'PricebookEntry' && sobject.Pricebook2Id === 'StandardPriceBook' && lookup.name === 'Pricebook2Id')) {
          sobject[lookup.name] = recordIdsMap.get(sobject[lookup.name]);
        }

        // Overridden lookups
        if (sobject[lookup.relationshipName]) {

          this.debug(`### Overridden lookup found: ${lookup.relationshipName}:`);
          this.debug(`Reference to: ${lookup.referenceTo}`);
          this.debug(`fields to query: ${JSON.stringify(sobject[lookup.relationshipName])}`);

          if (lookupOverrideMap === undefined) {
            // If the first override we find, parse all files to get all needed fields
            // Do it only know so that the command won't be slower if there is no override used
            lookupOverrideMap = await this.createLookupOverrideMap();

            if (lookupOverrideMap === undefined) {
              throw new SfdxError(`A lookupOverride is specified in your data plan for sObject ${lookup.referenceTo}, but no field is associated to it. Either remove the lookupOverride for this sObject or add field(s).`);
            }
            queriedLookupOverrideRecords = new Map<string, Record[]>();
          }
          
          const sObjectName = sobject[lookup.relationshipName].attributes.type;
          let sObjectRecords: Record[];

          if (queriedLookupOverrideRecords[sObjectName]) {
            // Records already queried, use them
            sObjectRecords = queriedLookupOverrideRecords[sObjectName];
          }
          else {
            // Records not previously queried, do it now
            sObjectRecords = await this.getObjectRecords(sObjectName, lookupOverrideMap[sObjectName]);
            queriedLookupOverrideRecords[sObjectName] = sObjectRecords;
          }

          let filterList = Object.assign({}, sobject[lookup.relationshipName]);
          delete filterList.attributes;

          const start = Date.now();
          this.debug(`Searching for record for lookup override`);

          const foundRecord = sObjectRecords.find(element => {            
            for (const [key, value] of Object.entries(filterList)) {
              this.debug(`Looking for value ${value} for field ${key}`);
              this.debug(`Value for current record: ${element[key]}`);

              // Can't use !== because numbers and string values having only numbers in them are returned the same way by the bulk API
              if (element[key] != value) {
                return;
              }
            }

            return element;
          });
          const duration = Date.now() - start;
          this.debug(`Finished searching record in ${duration} milliseconds`);

          // TODO: better output than Object.entries(filterList)
          // Instead of looping for every record, create a map first from all needed values (so only one loop)
          if (foundRecord === undefined) {
            throw new SfdxError(`No ${lookup.referenceTo} record found for filter ${Object.entries(filterList)}`);
          }
          
          const queriedRecordId = foundRecord.Id;
          if (isVerbose) {
            this.ux.log(`RecordId found (${queriedRecordId}) for sObject ${sObjectName} and filter ${Object.entries(filterList)}`);
          }

          // Replace relationship name with field name + found Id
          delete sobject[lookup.relationshipName];
          sobject[lookup.name] = queriedRecordId;
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
      // external id field is specified --> upsert
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
          throw new SfdxError(`Error importing record ${records[i].attributes.referenceId}: ${errors.statusCode}-${errors.message}${errors.fields?.length > 0?'('+errors.fields+')':''}`);
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
        lookups.push(field);
      }
    }

    return lookups;
  }

  private async createLookupOverrideMap(): Promise<Map<string, Set<string>>> {
    let overrideMap: Map<string, Set<string>> = new Map<string, Set<string>>();

    for (const dataFile of remainingDataFiles) {

      // If file doesn't start with a number, just don't parse it (could be data-plan.json)
      if (!isNaN(dataFile.substring(0,1) as any)) {
        const objectRecords:Array<Record> = (await this.readFile(dataFile)).records;
        if (objectRecords.length > 0) {
          const currentRec = objectRecords[0];

          // For all fields, look if one if a lookup override
          for (const [key] of Object.entries(currentRec)) {

            if (currentRec[key]?.attributes) {
              const sobjectName = currentRec[key]?.attributes.type;
              let fieldsToQuery: Set<string> = new Set<string>();

              // If there is a lookup override, look all fields needed
              for (const [objectkey] of Object.entries(currentRec[key])) {
                
                // Don't do anything if it's the "attributes" key containing technical info
                if (objectkey !== 'attributes') {
                  fieldsToQuery.add(objectkey);
                }
              }

              // If there are already fields to query for this object, append them
              if (overrideMap[sobjectName]) {
                fieldsToQuery.forEach(item => overrideMap[sobjectName].add(item));
              }
              else {
                // Else create the Set first
                overrideMap[sobjectName] = new Set<string>();
                fieldsToQuery.forEach(item => overrideMap[sobjectName].add(item));
              }
            }
          }
        }
      }
    }

    return overrideMap;
  }

  private async getObjectRecords(sObjectName: string, fieldsToQuery: Set<string>): Promise<Array<Record>> {

    const bulkQuery =  async (sObjectName: string, fieldsToQuery: Set<string>) => new Promise<Array<Record>>(async (resolve, reject) => {
      let retrievedRecords: Array<Record> = new Array<Record>();

      // In case it's not, add Id field
      fieldsToQuery.add('Id');

      conn.bulk.pollTimeout = 250000;
      this.debug(`Querying ${sObjectName} for lookup override`);

      // Manually reading stream instead on using jsforce directly
      // Because jsforce will return '75008.0' instead of 75008 for a number
      const recordStream = conn.bulk.query(
        `Select ${Array.from(fieldsToQuery).join(',')} from ${sObjectName}`
      );
      const readStream = recordStream.stream();
      const csvToJsonParser = csv({flatKeys: false, checkType: true});
      readStream.pipe(csvToJsonParser);
  
      csvToJsonParser.on("data", (data) => {
        retrievedRecords.push(JSON.parse(data.toString('utf8')));
      });

      recordStream.on("error", (error) => {
        reject(error);
      });
  
      csvToJsonParser.on("error", (error) => {
        reject(error);
      });
  
      csvToJsonParser.on("done", async () => {
        resolve(retrievedRecords);
      });
    });

    return await bulkQuery(sObjectName, fieldsToQuery);
  }
}