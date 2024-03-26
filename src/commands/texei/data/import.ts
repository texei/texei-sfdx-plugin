/* eslint-disable @typescript-eslint/no-unsafe-member-access */
/* eslint-disable @typescript-eslint/no-unsafe-call */
/* eslint-disable @typescript-eslint/restrict-template-expressions */
/* eslint-disable @typescript-eslint/restrict-plus-operands */
/* eslint-disable @typescript-eslint/no-unsafe-argument */
/* eslint-disable no-lonely-if */
/* eslint-disable @typescript-eslint/require-await */
/* eslint-disable complexity */
/* eslint-disable class-methods-use-this */
/* eslint-disable @typescript-eslint/await-thenable */
/* eslint-disable no-await-in-loop */
/* eslint-disable @typescript-eslint/explicit-function-return-type */
/* eslint-disable @typescript-eslint/no-explicit-any */
/* eslint-disable @typescript-eslint/no-unsafe-assignment */
import * as fs from 'node:fs';
import * as path from 'node:path';
import util = require('util');
import {
  SfCommand,
  Flags,
  orgApiVersionFlagWithDeprecations,
  requiredOrgFlagWithDeprecations,
  loglevel,
} from '@salesforce/sf-plugins-core';
import { Messages, SfError, Connection } from '@salesforce/core';
// @ts-ignore: TODO: Looks like types for RecordResult, SuccessResult, ErrorResult, ExecuteOptions are not exported
import { Record, RecordResult, SuccessResult, ErrorResult, ExecuteOptions, DescribeSObjectResult } from 'jsforce';

// Initialize Messages with the current plugin directory
Messages.importMessagesDirectory(__dirname);

// Load the specific messages for this file. Messages from @salesforce/command, @salesforce/core,
// or any library that is using the messages framework can also be loaded this way.
const messages = Messages.loadMessages('texei-sfdx-plugin', 'data.import');

let conn: Connection;
let recordIdsMap: Map<string, string>;
let lookupOverrideMap: Map<string, Set<string>>;
let batchSizeMap: Map<string, number>;
let queriedLookupOverrideRecords: Map<string, Record[]>;
let remainingDataFiles: Set<string>;
let isVerbose = false;
let sObjectDescribeMap: Map<string, DescribeSObjectResult>;

interface ErrorResultDetail {
  statusCode: string;
  message: string;
  fields: string[];
}

export type ImportResult = {
  message: string;
};

export default class Import extends SfCommand<ImportResult> {
  public static readonly summary = messages.getMessage('summary');

  public static readonly examples = [
    `$ sf texei data import --inputdir ./data --target-org texei-scratch
     Data imported!
  `,
  ];

  public static readonly flags = {
    'target-org': requiredOrgFlagWithDeprecations,
    'api-version': orgApiVersionFlagWithDeprecations,
    inputdir: Flags.string({
      char: 'd',
      summary: messages.getMessage('flags.inputdir.summary'),
      required: true,
    }),
    allornone: Flags.boolean({
      char: 'a',
      summary: messages.getMessage('flags.allornone.summary'),
      required: false,
    }),
    ignoreerrors: Flags.boolean({
      char: 'e',
      summary: messages.getMessage('flags.ignoreerrors.summary'),
      required: false,
    }),
    dataplan: Flags.string({
      char: 'p',
      summary: messages.getMessage('flags.dataplan.summary'),
      required: false,
    }),
    ignoreunavailablefields: Flags.boolean({
      char: 'i',
      summary: messages.getMessage('flags.ignoreunavailablefields.summary'),
      required: false,
    }),
    verbose: Flags.boolean({
      summary: messages.getMessage('flags.verbose.summary'),
    }),
    // loglevel is a no-op, but this flag is added to avoid breaking scripts and warn users who are using it
    loglevel,
  };

  public async run(): Promise<ImportResult> {
    const { flags } = await this.parse(Import);

    conn = flags['target-org'].getConnection(flags['api-version']);
    recordIdsMap = new Map<string, string>();
    batchSizeMap = new Map<string, number>();
    sObjectDescribeMap = new Map<string, DescribeSObjectResult>();
    isVerbose = flags.verbose;

    // Just add potential SfdxOrgUser that could be used during export
    const scratchOrgUserId: any = (
      (await conn.query(`Select Id from User where username = '${flags['target-org'].getUsername()}'`))
        .records[0] as any
    ).Id;
    recordIdsMap.set('SfdxOrgUser', scratchOrgUserId);

    // Get files in directory
    const filesPath = path.join(process.cwd(), flags.inputdir);

    // Read data file
    const readDir = util.promisify(fs.readdir);
    // eslint-disable-next-line arrow-body-style
    const dataFiles = (await readDir(filesPath, 'utf8'))
      // eslint-disable-next-line arrow-body-style
      .filter((f) => {
        // @ts-ignore: TODO: working code, but look at TS warning
        return !isNaN(f.substr(0, f.indexOf('-')));
        // eslint-disable-next-line prefer-arrow-callback
      })
      // eslint-disable-next-line prefer-arrow-callback
      .sort(function (a, b) {
        // @ts-ignore: TODO: working code, but look at TS warning
        return a.substr(0, a.indexOf('-')) - b.substr(0, b.indexOf('-'));
      });

    // Used later to parse remaining files if a lookup override is found
    remainingDataFiles = new Set(dataFiles);

    // Get potential batch sizes
    if (flags.dataplan) {
      batchSizeMap = await this.getObjectsBatchSize(flags.dataplan);
    }

    // Read and import data
    // eslint-disable-next-line @typescript-eslint/prefer-for-of
    for (let i = 0; i < dataFiles.length; i++) {
      const dataFile = dataFiles[i];

      // If file doesn't start with a number, just don't parse it (could be data-plan.json)
      // @ts-ignore: TODO: working code, but look at TS warning
      if (!isNaN(dataFile.substring(0, 1))) {
        const objectName = await this.getObjectNameFromFile(dataFile);

        this.spinner.start(`Importing ${dataFile}`, undefined, { stdout: true });

        const objectData: any = await this.readFile(dataFile, flags.inputdir);
        const externalIdField = objectData?.attributes?.externalId;
        const objectRecords: Record[] = objectData.records;

        await this.prepareDataForInsert(
          objectName,
          objectRecords,
          flags.ignoreunavailablefields,
          flags.ignoreerrors,
          flags.dataplan
        );
        await this.upsertData(
          objectRecords,
          objectName,
          externalIdField,
          dataFile,
          flags.ignoreerrors,
          flags.allornone
        );

        this.spinner.stop('Done.');
      }

      remainingDataFiles.delete(dataFile);
    }

    return { message: 'Data imported' };
  }

  private async prepareDataForInsert(
    sobjectName: string,
    jsonData: any,
    ignoreunavailablefields: boolean,
    ignoreerrors: boolean,
    dataplan
  ) {
    // TODO: Move getLookupsForObject here and check record types at the same time
    const lookups: any[] = await this.getLookupsForObject(sobjectName);
    let recTypeInfos = new Map<string, string>();

    // Get Record Types information with newly generated Ids
    recTypeInfos = await this.getRecordTypeMap(sobjectName);

    // If object is PricebookEntry, look for standard price book
    let standardPriceBookId = '';
    if (sobjectName === 'PricebookEntry') {
      standardPriceBookId = ((await conn.query('Select Id from Pricebook2 where IsStandard = true')).records[0] as any)
        .Id;
    }

    // Replace data to import with newly generated Record Type Ids
    for (const sobject of jsonData) {
      // Remove fields that are not on target org if requested
      if (ignoreunavailablefields) {
        for (const [key, value] of Object.entries(sobject)) {
          this.debug(`${key}: ${value}`);

          // eslint-disable-next-line no-prototype-builtins
          if (key !== 'attributes' && !value?.hasOwnProperty('attributes')) {
            if (sObjectDescribeMap.get(sobjectName)?.fields.find((element) => element.name === key) === undefined) {
              this.warn(
                `Field doesn't exist on org or you don't have access to it, ignoring it for import: ${sobjectName}.${key}`
              );
              delete sobject[key];
            }
          }
        }
      }

      // Replace all lookups
      for (const lookup of lookups) {
        // Regular lookups
        if (
          sobject[lookup.name] &&
          !(
            sobjectName === 'PricebookEntry' &&
            sobject.Pricebook2Id === 'StandardPriceBook' &&
            lookup.name === 'Pricebook2Id'
          )
        ) {
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
            lookupOverrideMap = await this.createLookupOverrideMapV2(dataplan);

            if (lookupOverrideMap === undefined) {
              throw new SfError(
                `A lookupOverride is specified in your data plan for sObject ${lookup.referenceTo}, but no field is associated to it. Either remove the lookupOverride for this sObject or add field(s).`
              );
            }
            queriedLookupOverrideRecords = new Map<string, Record[]>();
          }

          const sObjectLookupName: string = sobject[lookup.relationshipName].attributes.type;
          let sObjectRecords: Record[];

          if (queriedLookupOverrideRecords[sObjectLookupName]) {
            // Records already queried, use them
            sObjectRecords = queriedLookupOverrideRecords[sObjectLookupName];
          } else {
            // Records not previously queried, do it now
            // @ts-ignore: TODO: working code, but look at TS warning
            sObjectRecords = await this.getObjectRecords(sObjectLookupName, lookupOverrideMap.get(sObjectLookupName));
            queriedLookupOverrideRecords[sObjectLookupName] = sObjectRecords;
          }

          const filterList = Object.assign({}, sobject[lookup.relationshipName]);
          delete filterList.attributes;

          const start = Date.now();

          let searchedKeyValues = '';

          const foundRecord = sObjectRecords.find((element) => {
            searchedKeyValues = '';

            for (const [key, value] of Object.entries(filterList)) {
              // It's a child relationship
              // TODO: Do it correctly with a recursive function
              if (filterList[key]?.attributes) {
                for (const [childkey, childvalue] of Object.entries(filterList[key])) {
                  if (childkey !== 'attributes') {
                    searchedKeyValues += `${key}.${childkey}: ${childvalue}, `;

                    if (element[key] == null || element[key][childkey] !== childvalue) {
                      // this.debug("Filter KO (Child)");
                      return;
                    } else {
                      // this.debug("Filter OK (Child)");
                    }
                  }
                }
              } else {
                searchedKeyValues += `${key}: ${value}, `;

                // Can't use !== because numbers and string values having only numbers in them are returned the same way by the bulk API
                if (element[key] !== value) {
                  // this.debug("Filter KO");
                  return;
                } else {
                  // this.debug("Filter OK");
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
            if (ignoreerrors) {
              this.log(`No ${lookup.referenceTo} record found for filter ${searchedKeyValues}`);
            } else {
              // throw new SfdxError(`No ${lookup.referenceTo} record found for filter ${searchedKeyValues}`);
              throw new SfError(`No ${lookup.referenceTo} record found for filter ${Object.entries(filterList)}`);
            }
          } else {
            const queriedRecordId = foundRecord.Id;
            if (isVerbose) {
              this.log(
                `RecordId found (${queriedRecordId}) for sObject ${sObjectLookupName} and filter ${searchedKeyValues}`
              );
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

  private async upsertData(
    records: any[],
    sobjectName: string,
    externalIdField: string,
    dataFileName: string,
    ignoreerrors: boolean,
    allornone: boolean
  ) {
    const sobjectsResult: RecordResult[] = new Array<RecordResult>();

    // So far, a whole file will be either upserted, inserted or updated
    if (records && records.length > 0) {
      const recordsToInsert: any[] = new Array<any>();
      const recordsToUpdate: any[] = new Array<any>();
      for (const record of records) {
        if (record.Id) {
          // There is an Id, so it's an update
          recordsToUpdate.push(record);
        } else {
          // No Id, insert or upsert record
          recordsToInsert.push(record);
        }
      }

      // UPDATING RECORDS
      if (recordsToUpdate.length > 0) {
        this.debug(`DEBUG updating ${sobjectName} records`);

        // Checking if a batch size is specified
        const batchSize = batchSizeMap.get(dataFileName) ? batchSizeMap.get(dataFileName) : 200;
        // @ts-ignore: TODO: working code, but look at TS warning
        for (let i = 0; i < recordsToUpdate.length; i += batchSize) {
          // @ts-ignore: Don't know why, but TypeScript doesn't use the correct method override
          const chunkResults: RecordResult[] = await conn
            .sobject(sobjectName) // @ts-ignore: TODO: working code, but look at TS warning
            .update(recordsToUpdate.slice(i, i + batchSize), { allowRecursive: true, allOrNone: allornone })
            .catch((err) => {
              if (ignoreerrors) {
                this.log(`Error importing records: ${err}`);
              } else {
                throw new SfError(`Error importing records: ${err}`);
              }
            });
          sobjectsResult.push(...chunkResults);
        }
      }

      // INSERTING RECORDS
      if (recordsToInsert.length > 0) {
        if (externalIdField) {
          // external id field is specified --> upsert
          this.debug(`DEBUG upserting ${sobjectName} records using external id field '${externalIdField}'`);

          recordsToInsert.forEach((record) => {
            record[externalIdField] = encodeURIComponent(record[externalIdField]);
          });
          // max. parallel upsert requests as supported by jsforce (default)
          // https://github.com/jsforce/jsforce/blob/82fcc5284215e95047d0f735dd3037a1aeba5d88/lib/connection.js#L82
          const batchSize = batchSizeMap.get(dataFileName) ? batchSizeMap.get(dataFileName) : 10;

          // @ts-ignore: TODO: working code, but look at TS warning
          for (let i = 0; i < recordsToInsert.length; i += batchSize) {
            // @ts-ignore: Don't know why, but TypeScript doesn't use the correct method override
            const chunkResults: RecordResult[] = await conn
              .sobject(sobjectName) // @ts-ignore: TODO: working code, but look at TS warning
              .upsert(recordsToInsert.slice(i, i + batchSize), externalIdField, {
                allowRecursive: true,
                allOrNone: allornone,
              })
              .catch((err) => {
                if (ignoreerrors) {
                  this.log(`Error upserting records: ${err}`);
                } else {
                  throw new SfError(`Error upserting records: ${err}`);
                }
              });
            sobjectsResult.push(...chunkResults);
          }
        } else {
          // No Id and no external id, insert
          this.debug(`DEBUG inserting ${sobjectName} records`);

          // Checking if a batch size is specified
          const batchSize = batchSizeMap.get(dataFileName) ? batchSizeMap.get(dataFileName) : 200;
          // @ts-ignore: TODO: working code, but look at TS warning
          for (let i = 0; i < recordsToInsert.length; i += batchSize) {
            // @ts-ignore: Don't know why, but TypeScript doesn't use the correct method override
            const chunkResults: RecordResult[] = await conn
              .sobject(sobjectName) // @ts-ignore: TODO: working code, but look at TS warning
              .insert(recordsToInsert.slice(i, i + batchSize), { allowRecursive: true, allOrNone: allornone })
              .catch((err) => {
                if (ignoreerrors) {
                  this.log(`Error importing records: ${err}`);
                } else {
                  throw new SfError(`Error importing records: ${err}`);
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
        const res: ErrorResult = sobjectsResult[i] as ErrorResult;
        const errors: ErrorResultDetail = res.errors[0] as any;
        // TODO: add a flag to allow this to be added to the logs
        if (externalIdField && errors.statusCode === 'METHOD_NOT_ALLOWED') {
          if (ignoreerrors) {
            this.log(
              `Unable to upsert records. Make sure you're not importing records where ${externalIdField} External Id field is missing.`
            );
          } else {
            throw new SfError(
              `Unable to upsert records. Make sure you're not importing records where ${externalIdField} External Id field is missing.`
            );
          }
        } else if (errors.statusCode !== 'ALL_OR_NONE_OPERATION_ROLLED_BACK') {
          if (ignoreerrors) {
            this.log(
              `Error importing record ${records[i].attributes.referenceId}: ${errors.statusCode}-${errors.message}${
                errors.fields?.length > 0 ? '(' + errors.fields + ')' : ''
              }`
            );
          } else {
            throw new SfError(
              `Error importing record ${records[i].attributes.referenceId}: ${errors.statusCode}-${errors.message}${
                errors.fields?.length > 0 ? '(' + errors.fields + ')' : ''
              }`
            );
          }
        }
      }
    }

    // Update the map of Refs/Ids
    await this.updateMapIdRef(records, sobjectsResult, recordIdsMap);
  }

  private async readFile(fileName: string, inputdir: string) {
    // Get product data file path
    let filePath = fileName;
    if (inputdir) {
      filePath = path.join(inputdir, fileName);
    }

    filePath = path.join(process.cwd(), filePath);

    // Read data file
    const readFile = util.promisify(fs.readFile);
    // eslint-disable-next-line @typescript-eslint/no-unsafe-return
    return JSON.parse(await readFile(filePath, 'utf8'));
  }

  // Get a map of DeveloperName/Id for RecordTypes
  private async getRecordTypeMap(sobjectName) {
    const recTypesMap = new Map();

    const recTypeResults = (
      await conn.query(`SELECT Id, DeveloperName FROM RecordType WHERE SobjectType = '${sobjectName}'`)
    ).records;

    for (const recType of recTypeResults) {
      recTypesMap.set(recType.DeveloperName, recType.Id);
    }

    return recTypesMap;
  }

  // eslint-disable-next-line @typescript-eslint/no-shadow
  private updateMapIdRef(inputRecords: any[], inputResults: RecordResult[], recordIdsMap: Map<string, string>) {
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
    // eslint-disable-next-line @typescript-eslint/prefer-includes
    if (filePath.indexOf('-') === -1 || filePath.indexOf('.json') === -1) {
      throw new SfError(`Invalid file name: ${filePath}`);
    }

    // From 1-MyCustomObject__c.json or 1-MyCustomObject-MyLabel__c.json to MyCustomObject__c
    let fileName = '';
    fileName = filePath.substring(filePath.indexOf('-') + 1).replace('.json', '');
    if (fileName.indexOf('-') > 0) {
      // Format is 1-MyCustomObject-MyLabel__c.json
      fileName = fileName.substring(0, fileName.indexOf('-'));
    }

    return fileName;
  }

  private async getLookupsForObject(objectName: string) {
    const lookups = [];
    let describeResult: DescribeSObjectResult;
    if (sObjectDescribeMap.get(objectName) !== undefined) {
      // sObject has already been described, use it
      // @ts-ignore: TODO: working code, but look at TS warning
      describeResult = sObjectDescribeMap.get(objectName);
    } else {
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
        field.name !== 'OwnerId' &&
        field.name !== 'RecordTypeId'
      ) {
        // @ts-ignore: TODO: working code, but look at TS warning
        lookups.push(field);
      }
    }

    return lookups;
  }

  private async createLookupOverrideMapV2(dataplan): Promise<Map<string, Set<string>>> {
    const overrideMap: Map<string, Set<string>> = new Map<string, Set<string>>();

    if (dataplan) {
      // Read objects list from file
      const readFile = util.promisify(fs.readFile);
      const dataPlan: DataPlan = JSON.parse(await readFile(dataplan, 'utf8'));
      // Save lookup override
      // @ts-ignore: TODO: working code, but look at TS warning
      for (const [key, value] of Object.entries(dataPlan.lookupOverride)) {
        const values: Set<string> = new Set<string>((value as string).split(',').map((el) => el.trim()));
        overrideMap.set(key, values);
      }
    } else {
      throw new SfError('dataplan flag is mandatory when using lookup overrides');
    }

    return overrideMap;
  }

  private async getObjectRecords(sObjectName: string, fieldsToQuery: Set<string>): Promise<Record[]> {
    let retrievedRecords: Record[] = new Array<Record>();

    // In case it's not, add Id field
    fieldsToQuery.add('Id');

    // API Default limit is 10 000, just check if we need to extend it
    const recordNumber: number = (
      (await conn.query(`Select count(Id) numberOfRecords from ${sObjectName}`)).records[0] as any
    ).numberOfRecords;
    const options: ExecuteOptions = {};
    if (recordNumber > 10000) {
      options.maxFetch = recordNumber;
    }
    retrievedRecords = (
      await conn.autoFetchQuery(`Select ${Array.from(fieldsToQuery).join(',')} from ${sObjectName}`, options)
    ).records;

    return retrievedRecords;
  }

  // TODO: refactor with createLookupOverrideMapV2 to avoid reading dataplan twice
  private async getObjectsBatchSize(dataplan: string): Promise<Map<string, number>> {
    const bsMap: Map<string, number> = new Map<string, number>();

    // Read objects list from file
    const readFile = util.promisify(fs.readFile);
    const dataPlan: DataPlan = JSON.parse(await readFile(dataplan, 'utf8'));
    // Save batch size
    let index = 1;
    for (const sObject of dataPlan.sObjects) {
      if (sObject.batchSize) {
        const fileName = `${index}-${sObject.name}${sObject.label ? '-' + sObject.label : ''}.json`;
        bsMap.set(fileName, sObject.batchSize);
      }
      index++;
    }

    return bsMap;
  }
}
