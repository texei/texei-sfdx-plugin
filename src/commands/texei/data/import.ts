import { flags, SfdxCommand } from "@salesforce/command";
import { Messages, SfdxError, Connection } from "@salesforce/core";
import { AnyJson } from "@salesforce/ts-types";
import * as fs from "fs";
import * as path from "path";
import { Record, RecordResult, SuccessResult, ErrorResult, ExecuteOptions, DescribeSObjectResult } from 'jsforce';
const util = require("util");

// Initialize Messages with the current plugin directory
Messages.importMessagesDirectory(__dirname);

// Load the specific messages for this file. Messages from @salesforce/command, @salesforce/core,
// or any library that is using the messages framework can also be loaded this way.
const messages = Messages.loadMessages("texei-sfdx-plugin", "data-import");

let conn: Connection;
let recordIdsMap: Map<string, string>;
let lookupOverrideMap: Map<string, Set<string>>;
let batchSizeMap: Map<string, number>;
let queriedLookupOverrideRecords: Map<string, Record[]>;
let remainingDataFiles: Set<string>;
let isVerbose: boolean = false;
let sObjectDescribeMap: Map<string, DescribeSObjectResult>;

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
    ignoreerrors: flags.boolean({
      char: "o",
      description: messages.getMessage("ignoreErrorsFlagDescription"),
      required: false
    }),
    dataplan: flags.string({
      char: "p",
      description: messages.getMessage("dataPlanFlagDescription"),
      required: false
    }),
    ignoreunavailablefields: flags.boolean({
      char: "i",
      description: messages.getMessage("ignoreUnavailableFieldsFlagDescription"),
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
    conn = this.org.getConnection();
    recordIdsMap = new Map<string, string>();
    batchSizeMap = new Map<string, number>();
    sObjectDescribeMap = new Map<string, DescribeSObjectResult>();
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

    // Get potential batch sizes
    if (this.flags.dataplan) {
      batchSizeMap = await this.getObjectsBatchSize(this.flags.dataplan);
    }

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

        await this.prepareDataForInsert(objectName, objectRecords);
        await this.upsertData(objectRecords, objectName, externalIdField, dataFile);

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

      // Remove fields that are not on target org if requested
      if (this.flags.ignoreunavailablefields) {
        for (const [key, value] of Object.entries(sobject)) {
          this.debug(`${key}: ${value}`);

          if (key !== 'attributes' && !value?.hasOwnProperty('attributes')) {
            if (sObjectDescribeMap.get(sobjectName).fields.find(element => element.name === key) === undefined) {
              this.ux.warn(`Field doesn't exist on org or you don't have access to it, ignoring it for import: ${sobjectName}.${key}`);
              delete sobject[key];
            }
          }
        }
      }
      
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
            lookupOverrideMap = await this.createLookupOverrideMapV2();

            if (lookupOverrideMap === undefined) {
              throw new SfdxError(`A lookupOverride is specified in your data plan for sObject ${lookup.referenceTo}, but no field is associated to it. Either remove the lookupOverride for this sObject or add field(s).`);
            }
            queriedLookupOverrideRecords = new Map<string, Record[]>();
          }
          
          const sObjectLookupName: string = sobject[lookup.relationshipName].attributes.type;
          let sObjectRecords: Record[];

          if (queriedLookupOverrideRecords[sObjectLookupName]) {
            // Records already queried, use them
            sObjectRecords = queriedLookupOverrideRecords[sObjectLookupName];
          }
          else {
            // Records not previously queried, do it now
            sObjectRecords = await this.getObjectRecords(sObjectLookupName, lookupOverrideMap.get(sObjectLookupName));
            queriedLookupOverrideRecords[sObjectLookupName] = sObjectRecords;
          }

          let filterList = Object.assign({}, sobject[lookup.relationshipName]);
          delete filterList.attributes;

          const start = Date.now();
          
          let searchedKeyValues: string = '';

          const foundRecord = sObjectRecords.find(element => {   
            
            searchedKeyValues = '';

            for (const [key, value] of Object.entries(filterList)) {
              
              // It's a child relationship
              // TODO: Do it correctly with a recursive function
              if (filterList[key]?.attributes) {
                for (const [childkey, childvalue] of Object.entries(filterList[key])) {

                  if (childkey !== 'attributes') {
                    searchedKeyValues += `${key}.${childkey}: ${childvalue}, `;
                    
                    if (element[key] == null || element[key][childkey] != childvalue) {
                      //this.debug("Filter KO (Child)");
                      return;
                    }
                    else {
                      //this.debug("Filter OK (Child)");
                    }
                  }
                }
              }
              else {
                searchedKeyValues += `${key}: ${value}, `;

                // Can't use !== because numbers and string values having only numbers in them are returned the same way by the bulk API
                if (element[key] != value) {
                  //this.debug("Filter KO");
                  return;
                }
                else {
                  //this.debug("Filter OK");
                }
              }
            }

            return element;
          });
          if (searchedKeyValues?.length > 1) {
            searchedKeyValues = searchedKeyValues.substring(0, searchedKeyValues.length - 2);
          }

          const duration = Date.now() - start;
          this.debug(`Finished searching record in ${duration} milliseconds`);

          // Instead of looping for every record, create a map first from all needed values (so only one loop)
          if (foundRecord === undefined) {
            if (this.flags.ignoreerrors) {
              this.ux.log(`No ${lookup.referenceTo} record found for filter ${searchedKeyValues}`);
            }
            else {
              //throw new SfdxError(`No ${lookup.referenceTo} record found for filter ${searchedKeyValues}`);
              throw new SfdxError(`No ${lookup.referenceTo} record found for filter ${Object.entries(filterList)}`);
            }
          }
          else {
            const queriedRecordId = foundRecord.Id;
            if (isVerbose) {
              this.ux.log(`RecordId found (${queriedRecordId}) for sObject ${sObjectLookupName} and filter ${searchedKeyValues}`);
            }

            // Replace relationship name with field name + found Id
            delete sobject[lookup.relationshipName];
            sobject[lookup.name] = queriedRecordId;
          }
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

  private async upsertData(records: Array<any>, sobjectName: string, externalIdField: string, dataFileName: string) {
    
    let sobjectsResult:Array<RecordResult> = new Array<RecordResult>();

    // So far, a whole file will be either upserted, inserted or updated
    if (externalIdField) {
      // external id field is specified --> upsert
      this.debug(`DEBUG upserting ${sobjectName} records using external id field '${externalIdField}'`);

      // max. parallel upsert requests as supported by jsforce (default)
      // https://github.com/jsforce/jsforce/blob/82fcc5284215e95047d0f735dd3037a1aeba5d88/lib/connection.js#L82
      const maxParallelUpsertRequests = batchSizeMap.get(dataFileName) ? batchSizeMap.get(dataFileName) : 10;
      
      for (var i = 0; i < records.length; i += maxParallelUpsertRequests) {
        // @ts-ignore: Don't know why, but TypeScript doesn't use the correct method override
        const chunkResults: RecordResult[] = await conn.sobject(sobjectName)
          .upsert(records.slice(i, i + maxParallelUpsertRequests), externalIdField, { allowRecursive: true, allOrNone: this.flags.allornone })
          .catch((err) => {
            if (this.flags.ignoreerrors) {
              this.ux.log(`Error upserting records: ${err}`);
            }
            else {
              throw new SfdxError(`Error upserting records: ${err}`);
            }
          });
        sobjectsResult.push(...chunkResults);
      }
    }
    else {
      if (records && records.length > 0) {
        let recordsToInsert:Array<any> = new Array<any>();
        let recordsToUpdate:Array<any> = new Array<any>();
        for (const record of records) {
          if (record.Id) {
            // There is an Id, so it's an update
            recordsToUpdate.push(record);
          }
          else {
            // No Id, insert record
            recordsToInsert.push(record);
          }
        }

        // UPDATING RECORDS
        if (recordsToUpdate.length > 0) {
          this.debug(`DEBUG updating ${sobjectName} records`);
    
          // Checking if a batch size is specified
          const batchSize = batchSizeMap.get(dataFileName) ? batchSizeMap.get(dataFileName) : 200;  
          for (var i = 0; i < recordsToUpdate.length; i += batchSize) {
            // @ts-ignore: Don't know why, but TypeScript doesn't use the correct method override
            const chunkResults: RecordResult[] = await conn.sobject(sobjectName).update(recordsToUpdate.slice(i, i + batchSize), { allowRecursive: true, allOrNone: this.flags.allornone })
                                                            .catch(err => {
                                                              if (this.flags.ignoreerrors) {
                                                                this.ux.log(`Error importing records: ${err}`);
                                                              }
                                                              else {
                                                                throw new SfdxError(`Error importing records: ${err}`);
                                                              }
                                                            });
            sobjectsResult.push(...chunkResults);
          }
        }

        // INSERTING RECORDS
        if (recordsToInsert.length > 0) {
          // No Id, insert
          this.debug(`DEBUG inserting ${sobjectName} records`);
    
          // Checking if a batch size is specified
          const batchSize = batchSizeMap.get(dataFileName) ? batchSizeMap.get(dataFileName) : 200;  
          for (var i = 0; i < recordsToInsert.length; i += batchSize) {
            // @ts-ignore: Don't know why, but TypeScript doesn't use the correct method override
            const chunkResults: RecordResult[] = await conn.sobject(sobjectName).insert(recordsToInsert.slice(i, i + batchSize), { allowRecursive: true, allOrNone: this.flags.allornone })
                                                            .catch(err => {
                                                              if (this.flags.ignoreerrors) {
                                                                this.ux.log(`Error importing records: ${err}`);
                                                              }
                                                              else {
                                                                throw new SfdxError(`Error importing records: ${err}`);
                                                              }
                                                            });
            sobjectsResult.push(...chunkResults);
          }
        }
      }
    }
    
    // Some errors are part of RecordResult but don't throw an exception
    for (let i = 0; i < sobjectsResult.length; i++) {
      
      if (!sobjectsResult[i].success) {
        const res:ErrorResult = sobjectsResult[i] as ErrorResult;
        const errors:ErrorResultDetail = res.errors[0] as any;
        // TODO: add a flag to allow this to be added to the logs
        if (externalIdField && errors.statusCode === 'METHOD_NOT_ALLOWED') {
          if (this.flags.ignoreerrors) {
            this.ux.log(`Unable to upsert records. Make sure you're not importing records where ${externalIdField} External Id field is missing.`);
          }
          else {
            throw new SfdxError(`Unable to upsert records. Make sure you're not importing records where ${externalIdField} External Id field is missing.`);
          }
        }
        else if (errors.statusCode !== 'ALL_OR_NONE_OPERATION_ROLLED_BACK') {
          if (this.flags.ignoreerrors) {
            this.ux.log(`Error importing record ${records[i].attributes.referenceId}: ${errors.statusCode}-${errors.message}${errors.fields?.length > 0?'('+errors.fields+')':''}`);
          }
          else {
            throw new SfdxError(`Error importing record ${records[i].attributes.referenceId}: ${errors.statusCode}-${errors.message}${errors.fields?.length > 0?'('+errors.fields+')':''}`);
          }
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
    let describeResult: DescribeSObjectResult;
    if (sObjectDescribeMap.get(objectName) !== undefined) {
      // sObject has already been described, use it
      describeResult = sObjectDescribeMap.get(objectName);
    }
    else {
      // Call describe
      describeResult = await conn.sobject(objectName).describe();
      sObjectDescribeMap.set(objectName, describeResult);
    }

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

  private async createLookupOverrideMapV2(): Promise<Map<string, Set<string>>> {
    let overrideMap: Map<string, Set<string>> = new Map<string, Set<string>>();

    if (this.flags.dataplan) {
      // Read objects list from file
      const readFile = util.promisify(fs.readFile);
      const dataPlan: DataPlan = JSON.parse(await readFile(this.flags.dataplan, "utf8"));
      // Save lookup override
      for (const [key, value] of Object.entries(dataPlan.lookupOverride)) {
        const values: Set<string> = new Set<string>((value as string).split(',').map(el => el.trim()));
        overrideMap.set(key, values);
      }  
    }
    else {
      throw new SfdxError(`dataplan flag is mandatory when using lookup overrides`);
    }

    return overrideMap;
  }

  private async getObjectRecords(sObjectName: string, fieldsToQuery: Set<string>): Promise<Array<Record>> {

    let retrievedRecords: Array<Record> = new Array<Record>();

    // In case it's not, add Id field
    fieldsToQuery.add('Id');

    // API Default limit is 10 000, just check if we need to extend it
    const recordNumber:number = ((await conn.query(`Select count(Id) numberOfRecords from ${sObjectName}`)).records[0] as any).numberOfRecords;
    let options:ExecuteOptions = {};
    if (recordNumber > 10000) {
      options.maxFetch = recordNumber;
    }
    retrievedRecords = (await conn.autoFetchQuery(`Select ${Array.from(fieldsToQuery).join(',')} from ${sObjectName}`, options)).records;
    
    return retrievedRecords;
  }

  // TODO: refactor with createLookupOverrideMapV2 to avoid reading dataplan twice
  private async getObjectsBatchSize(dataplan: string): Promise<Map<string, number>> {
    let bsMap: Map<string, number> = new Map<string, number>();

    // Read objects list from file
    const readFile = util.promisify(fs.readFile);
    const dataPlan: DataPlan = JSON.parse(await readFile(dataplan, "utf8"));
    // Save batch size
    let index = 1;
    for (const sObject of dataPlan.sObjects) {
      if (sObject.batchSize) {
        const fileName = `${index}-${sObject.name}${sObject.label ? '-'+sObject.label : ''}.json`;
        bsMap.set(fileName, sObject.batchSize);
      }
      index++;
    }      

    return bsMap;
  }
}