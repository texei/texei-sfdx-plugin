import { flags, SfdxCommand } from '@salesforce/command';
import { Messages, SfdxError, Connection } from '@salesforce/core';
import { AnyJson } from '@salesforce/ts-types';
import { Record, ExecuteOptions } from 'jsforce';
import * as fs from 'fs';
import * as path from 'path';
const util = require("util");
const csv = require("csvtojson");

// Initialize Messages with the current plugin directory
Messages.importMessagesDirectory(__dirname);

// Load the specific messages for this file. Messages from @salesforce/command, @salesforce/core,
// or any library that is using the messages framework can also be loaded this way.
const messages = Messages.loadMessages('texei-sfdx-plugin', 'data-export');
let conn:Connection;
let objectList:Array<DataPlanSObject>;
let lastReferenceIds: Map<string, number> = new Map<string, number>();
let globallyExcludedFields: Array<string>;
let globallyOverridenLookup: Map<string, string>;

export default class Export extends SfdxCommand {

  public static description = messages.getMessage('commandDescription');

  public static examples = [
  `sfdx texei:data:export --objects Account,Contact,MyCustomObject__c --outputdir ./data --targetusername texei`,
  'sfdx texei:data:export --dataplan ./data/data-plan.json --outputdir ./data --targetusername texei'
  ];

  protected static flagsConfig = {
    outputdir: flags.string({char: 'd', description: messages.getMessage('outputdirFlagDescription'), required: true}),
    objects: flags.string({char: 'o', description: messages.getMessage('objectsFlagDescription'), required: false}),
    dataplan: flags.string({char: 'p', description: messages.getMessage('dataPlanFlagDescription'), required: false}),
    apitype: flags.string({ char: 'a', description: messages.getMessage('apiTypeFlagDescription'), options: ['rest', 'bulk'], default: 'rest' })
  };

  // Comment this out if your command does not require an org username
  protected static requiresUsername = true;

  // Comment this out if your command does not support a hub org username
  protected static requiresDevhubUsername = false;

  // Set this to true if your command requires a project workspace; 'requiresProject' is false by default
  protected static requiresProject = false;

  public async run(): Promise<AnyJson> {

    // this.org is guaranteed because requiresUsername=true, as opposed to supportsUsername
    conn = this.org.getConnection();

    let recordIdsMap: Map<string, string> = new Map<string, string>();

    if (this.flags.objects) {
      // Read objects list from flag, mapping to data plan format
      objectList = this.flags.objects.split(',').map(
        function(elem) {
          return {
            "name": elem
          }
        });
    }
    else if (this.flags.dataplan) {
      // Read objects list from file
      const readFile = util.promisify(fs.readFile);
      const dataPlan: DataPlan = JSON.parse(await readFile(this.flags.dataplan, "utf8"));
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
    }
    else {
      throw new SfdxError(`Either objects or dataplan flag is mandatory`);
    }

    let index = 1;
    for (const obj of objectList) {

      this.ux.startSpinner(`Exporting ${obj.name}${obj.label?' ('+obj.label+')':''}`, null, { stdout: true });

      const fileName = `${index}-${obj.name}${obj.label ? '-'+obj.label : ''}.json`;
      const objectRecords:any = await this.getsObjectRecords(obj, recordIdsMap);
      await this.saveFile(objectRecords, fileName);
      index++;

      this.ux.stopSpinner(`${fileName} saved.`);
    }

    return { message: 'Data exported' };
  }

  private async getsObjectRecords(sobject: DataPlanSObject, recordIdsMap: Map<string, string>) {

    // Query to retrieve creatable sObject fields
    let fields = [];
    let lookups = [];
    let overriddenLookups = [];
    let relationshipFields = [];
    let userFieldsReference = [];
    const describeResult = await conn.sobject(sobject.name).describe();

    const sObjectLabel = describeResult.label;

    // If sObject can't be created, don't export it and throw an error
    if (!describeResult.createable) {
      throw new SfdxError(`Object ${sObjectLabel} can't be created (see Salesforce documentation), so you shoudn't export it.`);
    }

    // Add fields to exclude, if any
    let fieldsToExclude = globallyExcludedFields ? globallyExcludedFields : [];
    if (sobject.excludedFields) {
      fieldsToExclude = fieldsToExclude.concat(sobject.excludedFields);
    }

    for (const field of describeResult.fields) {

      if (field.createable && !fieldsToExclude.includes(field.name)) {
        
        // If it's a lookup field and it's overridden at the field level, use the override 
        if (sobject.lookupOverride
            && sobject.lookupOverride[field.name]) {
          
          this.debug(`Field found in override: ${field.name}`);

          if (!(field.referenceTo && field.referenceTo.length > 0)) {
            throw new SfdxError(`Field ${field.name} is listed in lookupOverride but isn't a lookup field`);
          }
          else {
            overriddenLookups.push(field.relationshipName);
            sobject.lookupOverride[field.name]?.split(',')?.forEach(relationshipField => {
              relationshipFields.push(`${field.relationshipName}.${relationshipField}`);
            });
          }
        }
        else {
          // If it's a lookup, also add it to the lookup list, to be replaced later
          // Excluding OwnerId as we are not importing users anyway
          if (field.referenceTo && field.referenceTo.length > 0 && field.name != 'OwnerId' && field.name != 'RecordTypeId') {

            if (globallyOverridenLookup?.get(field.referenceTo[0])) {
              this.debug(`FOUND ${field.name}: ${globallyOverridenLookup.get(field.referenceTo[0])}`);

              // If it's a lookup field and it's overridden at the field level, use the override
              overriddenLookups.push(field.relationshipName);
              globallyOverridenLookup.get(field.referenceTo[0])?.split(',')?.forEach(relationshipField => {
                relationshipFields.push(`${field.relationshipName}.${relationshipField}`);
              });
            }
            else {
              fields.push(field.name);

              // If User is queried, use the reference, otherwise use the Scratch Org User
              if (!objectList.find(x => x.name === 'User') && field.referenceTo.includes('User')) {
                userFieldsReference.push(field.name);
              }
              else {
                lookups.push(field.name);
              }
            }
          }
          else {
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
                         ${sobject.filters ? 'WHERE '+sobject.filters : ''}
                         ${sobject.orderBy ? 'ORDER BY '+sobject.orderBy : ''}`;

    let recordResults;

    if (this.flags.apitype === 'bulk') {

      const bulkQuery =  async (sObjectQuery: string) => new Promise<Array<Record>>(async (resolve, reject) => {
        let retrievedRecords: Array<Record> = new Array<Record>();
  
        conn.bulk.pollTimeout = 250000;
  
        // Manually reading stream instead on using jsforce directly
        // Because jsforce will return '75008.0' instead of 75008 for a number
        const recordStream = conn.bulk.query(sObjectQuery);
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
  
      recordResults = await bulkQuery(recordQuery);
    }
    else {
      // API Default limit is 10 000, just check if we need to extend it
      const recordNumber:number = ((await conn.query(`Select count(Id) numberOfRecords from ${sobject.name}`)).records[0] as any).numberOfRecords;
      let options:ExecuteOptions = {};
      if (recordNumber > 10000) {
        options.maxFetch = recordNumber;
      }
      recordResults = (await conn.autoFetchQuery(recordQuery, options)).records;
    }

    // Replace Lookup Ids + Record Type Ids by references
    await this.cleanJsonRecord(sobject, sObjectLabel, recordResults, recordIdsMap, lookups, overriddenLookups, userFieldsReference);

    const objectAttributes: any = {};
    objectAttributes.type = sobject.name;
    if (sobject.externalId) {
      objectAttributes.externalId = sobject.externalId;
    }

    const recordFile: any = {};
    recordFile.attributes = objectAttributes;
    recordFile.records = recordResults;

    return recordFile;
  }

  // Clean JSON to have an output format inspired by force:data:tree:export
  // Main difference: RecordTypeId is replaced by DeveloperName
  private async cleanJsonRecord(sobject: DataPlanSObject, objectLabel: string, records, recordIdsMap, lookups: Array<string>, overriddenLookups: Array<string>, userFieldsReference: Array<string>,) {

    let refId = 0;
    // If this object was already exported before, start the numbering after the last one already used
    if (lastReferenceIds.get(objectLabel)) {
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
      }
      else {

        // Add the new ReferenceId
        if (sobject.name === 'Pricebook2' && record.IsStandard) { 
          // Specific use case for Standard Price Book that will need to be queried from target org
          // TODO: Maybe not even save this record
          const standardPriceBookLabel = 'StandardPriceBook';
          record.attributes.referenceId = standardPriceBookLabel;
          recordIdsMap.set(record.Id, standardPriceBookLabel);    
        }
        else {
          refId++;
          record.attributes.referenceId = `${objectLabel.replace(/ /g,'').replace(/'/g,'')}Ref${refId}`;
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
        }
        else {
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
      //Object.keys(record).forEach(key => (!record[key] && record[key] !== undefined) && delete record[key]);

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

  private async saveFile(records: {}[], fileName: string) {

    // Save results in a file
    let filePath = fileName;
    if (this.flags.outputdir) {
      filePath = path.join(
        this.flags.outputdir,
        fileName
      );
    }
    
    // Write product.json file
    const saveToPath = path.join(
      process.cwd(),
      filePath
    );

    await fs.writeFile(saveToPath, JSON.stringify(records, null, 2), 'utf8', function (err) {
      if (err) {
        throw new SfdxError(`Unable to write file at path ${saveToPath}: ${err}`);
      }
    });
  }
}