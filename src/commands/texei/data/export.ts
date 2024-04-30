/* eslint-disable @typescript-eslint/no-unsafe-member-access */
/* eslint-disable @typescript-eslint/no-misused-promises */
/* eslint-disable @typescript-eslint/no-unsafe-call */
/* eslint-disable @typescript-eslint/restrict-template-expressions */
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
import csv = require('csvtojson');
import {
  SfCommand,
  Flags,
  orgApiVersionFlagWithDeprecations,
  requiredOrgFlagWithDeprecations,
  loglevel,
} from '@salesforce/sf-plugins-core';
import { Messages, SfError, Connection } from '@salesforce/core';
import { Record } from 'jsforce';

// Initialize Messages with the current plugin directory
Messages.importMessagesDirectory(__dirname);

// Load the specific messages for this file. Messages from @salesforce/command, @salesforce/core,
// or any library that is using the messages framework can also be loaded this way.
const messages = Messages.loadMessages('texei-sfdx-plugin', 'data.export');

let conn: Connection;
let objectList: DataPlanSObject[];
const lastReferenceIds: Map<string, number> = new Map<string, number>();
let globallyExcludedFields: string[];
let globallyOverridenLookup: Map<string, string>;

export type ExportResult = {
  message: string;
};

export default class Export extends SfCommand<ExportResult> {
  public static readonly summary = messages.getMessage('summary');

  public static readonly examples = [
    'sf texei data export --objects Account,Contact,MyCustomObject__c --outputdir ./data --target-prg texei',
    'sf texei data export --dataplan ./data/data-plan.json --outputdir ./data --target-org texei',
  ];

  public static readonly flags = {
    'target-org': requiredOrgFlagWithDeprecations,
    'api-version': orgApiVersionFlagWithDeprecations,
    outputdir: Flags.string({ char: 'd', summary: messages.getMessage('flags.outputdir.summary'), required: true }),
    objects: Flags.string({ char: 's', summary: messages.getMessage('flags.objects.summary'), required: false }),
    dataplan: Flags.string({ char: 'p', summary: messages.getMessage('flags.dataplan.summary'), required: false }),
    apitype: Flags.string({
      char: 'a',
      summary: messages.getMessage('flags.apitype.summary'),
      options: ['rest', 'bulk'],
      default: 'rest',
    }),
    // new flag to exclude null fields
    'exclude-null-fields': Flags.boolean({
      char: 'e',
      summary: messages.getMessage('flags.exclude-null-fields.summary'),
      default: false,
    }),
    // loglevel is a no-op, but this flag is added to avoid breaking scripts and warn users who are using it
    loglevel,
  };

  public async run(): Promise<ExportResult> {
    const { flags } = await this.parse(Export);

    // this.org is guaranteed because requiresUsername=true, as opposed to supportsUsername
    conn = flags['target-org'].getConnection(flags['api-version']);

    const recordIdsMap: Map<string, string> = new Map<string, string>();

    if (flags.objects) {
      // Read objects list from flag, mapping to data plan format
      // @ts-ignore: TODO: working code, but look at TS warning
      objectList = flags.objects.split(',').map(
        // eslint-disable-next-line prefer-arrow-callback
        function (elem) {
          return {
            name: elem,
          };
        }
      );
    } else if (flags.dataplan) {
      // Read objects list from file
      const dataPlan: DataPlan = JSON.parse(fs.readFileSync(flags.dataplan, 'utf8')) as DataPlan;
      objectList = dataPlan.sObjects;

      // If there are some globally excluded fields, add them
      if (dataPlan.excludedFields) {
        globallyExcludedFields = dataPlan.excludedFields;
      }
      // If there are some global lookup override, add them
      if (dataPlan.lookupOverride) {
        globallyOverridenLookup = new Map<string, string>();

        for (const [key, value] of Object.entries(dataPlan.lookupOverride)) {
          globallyOverridenLookup.set(key, value as string);
        }
      }
    } else {
      throw new SfError('Either objects or dataplan flag is mandatory');
    }

    let index = 1;
    for (const obj of objectList) {
      this.spinner.start(`Exporting ${obj.name}${obj.label ? ' (' + obj.label + ')' : ''}`, undefined, {
        stdout: true,
      });

      const fileName = `${index}-${obj.name}${obj.label ? '-' + obj.label : ''}.json`;
      const objectRecords: any = await this.getsObjectRecords(obj, recordIdsMap, flags.apitype, flags);
      await this.saveFile(objectRecords, fileName, flags.outputdir);
      index++;

      this.spinner.stop(`${fileName} saved.`);
    }

    return { message: 'Data exported' };
  }

  private async getsObjectRecords(
    sobject: DataPlanSObject,
    recordIdsMap: Map<string, string>,
    apitype: string,
    flags: { [key: string]: any }
  ) {
    // Query to retrieve creatable sObject fields
    let fields: string[] = [];
    const lookups = [];
    const overriddenLookups: string[] = [];
    const relationshipFields = [];
    const userFieldsReference = [];
    const describeResult = await conn.sobject(sobject.name).describe();

    const sObjectLabel = describeResult.label;

    // If sObject can't be created, don't export it and throw an error
    if (!describeResult.createable) {
      throw new SfError(
        `Object ${sObjectLabel} can't be created (see Salesforce documentation), so you shoudn't export it.`
      );
    }

    // Add fields to exclude, if any
    let fieldsToExclude = globallyExcludedFields ? globallyExcludedFields : [];
    if (sobject.excludedFields) {
      fieldsToExclude = fieldsToExclude.concat(sobject.excludedFields);
    }

    for (const field of describeResult.fields) {
      if (field.createable && !fieldsToExclude.includes(field.name)) {
        // If it's a lookup field and it's overridden at the field level, use the override
        if (sobject.lookupOverride?.[field.name]) {
          this.debug(`Field found in override: ${field.name}`);

          if (!(field.referenceTo && field.referenceTo.length > 0)) {
            throw new SfError(`Field ${field.name} is listed in lookupOverride but isn't a lookup field`);
          } else {
            // @ts-ignore: TODO: working code, but look at TS warning
            overriddenLookups.push(field.relationshipName);
            sobject.lookupOverride[field.name]?.split(',')?.forEach((relationshipField) => {
              // @ts-ignore: TODO: working code, but look at TS warning
              relationshipFields.push(`${field.relationshipName}.${relationshipField}`);
            });
          }
        } else {
          // If it's a lookup, also add it to the lookup list, to be replaced later
          // Excluding OwnerId as we are not importing users anyway
          if (
            field.referenceTo &&
            field.referenceTo.length > 0 &&
            field.name !== 'OwnerId' &&
            field.name !== 'RecordTypeId'
          ) {
            if (globallyOverridenLookup?.get(field.referenceTo[0])) {
              this.debug(`FOUND ${field.name}: ${globallyOverridenLookup.get(field.referenceTo[0])}`);

              // If it's a lookup field and it's overridden at the field level, use the override
              // @ts-ignore: TODO: working code, but look at TS warning
              overriddenLookups.push(field.relationshipName);
              globallyOverridenLookup
                .get(field.referenceTo[0])
                ?.split(',')
                ?.forEach((relationshipField) => {
                  // @ts-ignore: TODO: working code, but look at TS warning
                  relationshipFields.push(`${field.relationshipName}.${relationshipField}`);
                });
            } else {
              fields.push(field.name);

              // If User is queried, use the reference, otherwise use the Scratch Org User
              if (!objectList.find((x) => x.name === 'User') && field.referenceTo.includes('User')) {
                // @ts-ignore: TODO: working code, but look at TS warning
                userFieldsReference.push(field.name);
              } else {
                // @ts-ignore: TODO: working code, but look at TS warning
                lookups.push(field.name);
              }
            }
          } else {
            fields.push(field.name);
          }
        }
      }
    }

    // Add RecordType.DeveloperName to the query if there are Record Types for this object
    if (describeResult.recordTypeInfos.length > 1) {
      // Looks like that there is always at least 1 RT (Master) returned by the describe
      // So having more than 2 means there are some custom RT created
      // Is there a better way to do this ?
      fields.push('RecordType.DeveloperName');
    }

    // If sObject is PriceBook, we need the IsStandard field
    if (sobject.name === 'Pricebook2') {
      fields.push('IsStandard');
    }

    // Adding relationship fields from lookupOverride, if any
    if (relationshipFields) {
      fields = fields.concat(relationshipFields);
    }

    // Query to get sObject data
    const recordQuery = `SELECT Id, ${fields.join()}
                         FROM ${sobject.name}
                         ${sobject.filters ? 'WHERE ' + sobject.filters : ''}
                         ${sobject.orderBy ? 'ORDER BY ' + sobject.orderBy : ''}`;

    let recordResults;

    if (apitype === 'bulk') {
      // eslint-disable-next-line no-async-promise-executor
      const bulkQuery = async (sObjectQuery: string) =>
        // eslint-disable-next-line no-async-promise-executor
        new Promise<Record[]>(async (resolve, reject) => {
          const retrievedRecords: Record[] = new Array<Record>();

          conn.bulk.pollTimeout = 250000;

          // Manually reading stream instead on using jsforce directly
          // Because jsforce will return '75008.0' instead of 75008 for a number
          const recordStream = conn.bulk.query(sObjectQuery);
          const readStream = recordStream.stream();
          const csvToJsonParser = csv({ flatKeys: false, checkType: true });
          // eslint-disable-next-line @typescript-eslint/no-floating-promises
          readStream.pipe(csvToJsonParser);

          // eslint-disable-next-line @typescript-eslint/no-floating-promises
          csvToJsonParser.on('data', (data) => {
            retrievedRecords.push(JSON.parse(data.toString('utf8')));
          });

          recordStream.on('error', (error) => {
            reject(error);
          });

          // eslint-disable-next-line @typescript-eslint/no-floating-promises
          csvToJsonParser.on('error', (error) => {
            reject(error);
          });

          // eslint-disable-next-line @typescript-eslint/no-floating-promises
          csvToJsonParser.on('done', async () => {
            resolve(retrievedRecords);
          });
        });

      recordResults = await bulkQuery(recordQuery);
    } else {
      // API Default limit is 10 000, just check if we need to extend it
      const recordNumber: number = (
        (await conn.query(`Select count(Id) numberOfRecords from ${sobject.name}`)).records[0] as any
      ).numberOfRecords;
      // @ts-ignore: TODO: working code, but look at TS warning
      const options: ExecuteOptions = {};
      if (recordNumber > 10000) {
        options.maxFetch = recordNumber;
      }
      recordResults = (await conn.autoFetchQuery(recordQuery, options)).records;
    }

    // Replace Lookup Ids + Record Type Ids by references
    await this.cleanJsonRecord(
      sobject,
      sObjectLabel,
      recordResults,
      recordIdsMap,
      lookups,
      overriddenLookups,
      userFieldsReference
    );

    const objectAttributes: any = {};
    objectAttributes.type = sobject.name;
    if (sobject.externalId) {
      objectAttributes.externalId = sobject.externalId;
    }

    const recordFile: any = {};
    recordFile.attributes = objectAttributes;

    recordFile.records = recordResults.map((record) => removeNullFields(record, flags['exclude-null-fields']));

    // eslint-disable-next-line @typescript-eslint/no-unsafe-return
    return recordFile;
  }

  // Clean JSON to have an output format inspired by force:data:tree:export
  // Main difference: RecordTypeId is replaced by DeveloperName
  private async cleanJsonRecord(
    sobject: DataPlanSObject,
    objectLabel: string,
    records,
    recordIdsMap,
    lookups: string[],
    overriddenLookups: string[],
    userFieldsReference: string[]
  ) {
    let refId = 0;
    // If this object was already exported before, start the numbering after the last one already used
    if (lastReferenceIds.get(objectLabel)) {
      // @ts-ignore: TODO: working code, but look at TS warning
      refId = lastReferenceIds.get(objectLabel);
    }

    for (const record of records) {
      if (record.attributes === undefined) {
        // Not returned by bulk API
        record.attributes = {};
      }

      // Delete record url, useless to reimport somewhere else
      delete record.attributes.url;

      // If Id was already exported and has a referenceId, use it (used for update)
      if (recordIdsMap.get(record.Id)) {
        record.attributes.referenceId = recordIdsMap.get(record.Id);
      } else {
        // Add the new ReferenceId
        if (sobject.name === 'Pricebook2' && record.IsStandard) {
          // Specific use case for Standard Price Book that will need to be queried from target org
          // TODO: Maybe not even save this record
          const standardPriceBookLabel = 'StandardPriceBook';
          record.attributes.referenceId = standardPriceBookLabel;
          recordIdsMap.set(record.Id, standardPriceBookLabel);
        } else {
          refId++;
          record.attributes.referenceId = `${objectLabel.replace(/ /g, '').replace(/'/g, '')}Ref${refId}`;
          recordIdsMap.set(record.Id, record.attributes.referenceId);
        }
      }

      // Replace lookup Ids
      for (const lookup of lookups) {
        record[lookup] = recordIdsMap.get(record[lookup]);
      }

      // Replace overridden lookups
      for (const lookup of overriddenLookups) {
        if (record[lookup]) {
          // If lookup isn't empty, remove useless information
          // Keeping "type" so we don't have to do a describe to know what is the related sObject at import
          delete record[lookup]?.attributes?.url;
        } else {
          // Remove empty lookup relationship field
          delete record[lookup];
        }
      }

      // Replace RecordTypeId with DeveloperName, to replace later with newly generated Id
      if (record.RecordTypeId && record.RecordType) {
        record.RecordTypeId = record.RecordType.DeveloperName;
      }

      // If User is queried, use the reference, otherwise use the Scratch Org User
      for (const userField of userFieldsReference) {
        record[userField] = 'SfdxOrgUser';
      }

      // TODO: As we are now iterating on all fields to remove null values:
      // --> refactor all previous for loops to do the work here
      // FIXME: Exclude value at 0 for now :'(
      // Object.keys(record).forEach(key => (!record[key] && record[key] !== undefined) && delete record[key]);

      // Delete unused fields
      delete record.Id;
      delete record.RecordType;
      delete record.OwnerId;

      if (sobject.name === 'Pricebook2') {
        delete record.IsStandard;
      }
    }

    // Save last used number for this object
    lastReferenceIds.set(objectLabel, refId);
  }

  private async saveFile(records, fileName: string, outputdir: string) {
    // Save results in a file
    let filePath = fileName;
    if (outputdir) {
      filePath = path.join(outputdir, fileName);
    }

    // Write product.json file
    const saveToPath = path.join(process.cwd(), filePath);

    await fs.writeFile(saveToPath, JSON.stringify(records, null, 2), 'utf8', (err) => {
      if (err) {
        throw new SfError(`Unable to write file at path ${saveToPath}: ${err}`);
      }
    });
  }
}

// add function to remove null values from object
function removeNullFields(record: { [key: string]: any }, excludeNullFields: boolean): { [key: string]: any } {
  if (!excludeNullFields) {
    return record;
  }

  const filteredRecord: { [key: string]: any } = {};
  for (const key in record) {
    if (record[key] !== null) {
      filteredRecord[key] = record[key];
    }
  }
  return filteredRecord;
}
