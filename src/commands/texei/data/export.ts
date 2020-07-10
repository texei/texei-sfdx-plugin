import { flags, SfdxCommand } from '@salesforce/command';
import { Messages, SfdxError, Connection } from '@salesforce/core';
import { AnyJson } from '@salesforce/ts-types';
import { ExecuteOptions } from 'jsforce';
import * as fs from 'fs';
import * as path from 'path';
const util = require("util");

interface DataPlan {
  name: string;
  label: string;
  filters: string;
  excludedFields: Array<string>;
}

// Initialize Messages with the current plugin directory
Messages.importMessagesDirectory(__dirname);

// Load the specific messages for this file. Messages from @salesforce/command, @salesforce/core,
// or any library that is using the messages framework can also be loaded this way.
const messages = Messages.loadMessages('texei-sfdx-plugin', 'data-export');
let conn:Connection;
let objectList:Array<DataPlan>;
let lastReferenceIds: Map<string, number> = new Map<string, number>();
let globallyExcludedFields: Array<string>;

export default class Export extends SfdxCommand {

  public static description = messages.getMessage('commandDescription');

  public static examples = [
  `sfdx texei:data:export --objects Account,Contact,MyCustomObject__c --outputdir ./data --targetusername texei`,
  'sfdx texei:data:export --dataplan ./data/data-plan.json --outputdir ./data --targetusername texei'
  ];

  protected static flagsConfig = {
    outputdir: flags.string({char: 'd', description: messages.getMessage('outputdirFlagDescription'), required: true}),
    objects: flags.string({char: 'o', description: messages.getMessage('objectsFlagDescription'), required: false}),
    dataplan: flags.string({char: 'p', description: messages.getMessage('dataPlanFlagDescription'), required: false})
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
      const dataPlan = JSON.parse(await readFile(this.flags.dataplan, "utf8"));
      objectList = dataPlan.sObjects;

      // If there are some globally excluded fields, add them
      if (dataPlan.excludedFields) {
        globallyExcludedFields = dataPlan.excludedFields;
      }
    }
    else {
      throw new SfdxError(`Either objects or dataplan flag is mandatory`);
    }

    let index = 1;
    for (const obj of objectList) {

      this.ux.startSpinner(`Exporting ${obj.name}${obj.label?' ('+obj.label+')':''}`, null, { stdout: true });

      const fileName = `${index}-${obj.name}${obj.label ? '-'+obj.label : ''}.json`;
      const objectRecords:any = {};
      objectRecords.records = await this.getsObjectRecords(obj, recordIdsMap);
      await this.saveFile(objectRecords, fileName);
      index++;

      this.ux.stopSpinner(`${fileName} saved.`);
    }

    return { message: 'Data exported' };
  }

  private async getsObjectRecords(sobject: DataPlan, recordIdsMap: Map<string, string>) {

    // Query to retrieve creatable sObject fields
    let fields = [];
    let lookups = [];
    let userFieldsReference = [];
    const describeResult = await conn.sobject(sobject.name).describe();

    const sObjectLabel = describeResult.label;

    // Add fields to exclude, if any
    let fieldsToExclude = globallyExcludedFields ? globallyExcludedFields : [];
    if (sobject.excludedFields) {
      fieldsToExclude = fieldsToExclude.concat(sobject.excludedFields);
    }

    for (const field of describeResult.fields) {
      if (field.createable && !fieldsToExclude.includes(field.name)) {
        
        fields.push(field.name);
        // If it's a lookup, also add it to the lookup list, to be replaced later
        // Excluding OwnerId as we are not importing users anyway
        if (field.referenceTo && field.referenceTo.length > 0 && field.name != 'OwnerId' && field.name != 'RecordTypeId') {

          // If User is queried, use the reference, otherwise use the Scratch Org User
          if (!objectList.find(x => x.name === 'User') && field.referenceTo.includes('User')) {
            userFieldsReference.push(field.name);
          }
          else {
            lookups.push(field.name);
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
    
    // Query to get sObject data
    const recordQuery = `SELECT Id, ${fields.join()}
                         FROM ${sobject.name}
                         ${sobject.filters ? 'WHERE '+sobject.filters : ''}`;
    // API Default limit is 10 000, just check if we need to extend it
    const recordNumber:number = ((await conn.query(`Select count(Id) numberOfRecords from ${sobject.name}`)).records[0] as any).numberOfRecords;
    let options:ExecuteOptions = {};
    if (recordNumber > 10000) {
      options.maxFetch = recordNumber;
    }
    const recordResults = (await conn.autoFetchQuery(recordQuery, options)).records;

    // Replace Lookup Ids + Record Type Ids by references
    await this.cleanJsonRecord(sobject, sObjectLabel, recordResults, recordIdsMap, lookups, userFieldsReference);

    return recordResults;
  }

  // Clean JSON to have the same output format as force:data:tree:export
  // Main difference: RecordTypeId is replaced by DeveloperName
  private async cleanJsonRecord(sobject: DataPlan, objectLabel: string, records, recordIdsMap, lookups: Array<string>, userFieldsReference: Array<string>,) {

    let refId = 0;
    // If this object was already exported before, start the numbering after the last one already used
    if (lastReferenceIds.get(objectLabel)) {
      refId = lastReferenceIds.get(objectLabel);
    }

    for (const record of records) {

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