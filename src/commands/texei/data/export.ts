import { flags, SfdxCommand } from '@salesforce/command';
import { Messages, SfdxError, Connection } from '@salesforce/core';
import { AnyJson } from '@salesforce/ts-types';
import * as fs from 'fs';
import * as path from 'path';

// Initialize Messages with the current plugin directory
Messages.importMessagesDirectory(__dirname);

// Load the specific messages for this file. Messages from @salesforce/command, @salesforce/core,
// or any library that is using the messages framework can also be loaded this way.
const messages = Messages.loadMessages('texei-sfdx-plugin', 'data-export');
let conn:Connection;
let objectList:Array<string>;

export default class Export extends SfdxCommand {

  public static description = messages.getMessage('commandDescription');

  public static examples = [
  `$ sfdx texei:data:export --objects Account,Contact,MyCustomObject__c --outputdir ./data --targetusername texei
  Data exported!
  `
  ];

  protected static flagsConfig = {
    objects: flags.string({char: 'o', description: messages.getMessage('objectsFlagDescription'), required: true}),
    outputdir: flags.string({char: 'd', description: messages.getMessage('outputdirFlagDescription'), required: true})
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

    objectList = this.flags.objects.split(',');
    let index = 1;

    for (const objectName of objectList) {

      this.ux.startSpinner(`Exporting ${objectName}`);
      
      const fileName = `${index}-${objectName}.json`;
      const objectRecords:any = {};
      objectRecords.records = await this.getsObjectRecords(objectName, null, recordIdsMap);
      await this.saveFile(objectRecords, fileName);
      index++;

      this.ux.stopSpinner(`${fileName} saved.`);
    }

    return { message: 'Data exported' };
  }

  private async getsObjectRecords(sobjectName: string, fieldsToExclude: Array<string>, recordIdsMap: Map<string, string>) {

    // Query to retrieve creatable sObject fields
    let fields = [];
    let lookups = [];
    let userFieldsReference = [];
    const describeResult = await conn.sobject(sobjectName).describe();

    const sObjectLabel = describeResult.label;

    // Just in case fieldsToExclude is passed as null
    if (!fieldsToExclude) {
      fieldsToExclude = [];
    }

    for (const field of describeResult.fields) {
      if (field.createable && !fieldsToExclude.includes(field.name)) {
        
        fields.push(field.name);
        // If it's a lookup, also add it to the lookup list, to be replaced later
        // Excluding OwnerId as we are not importing users anyway
        if (field.referenceTo && field.referenceTo.length > 0 && field.name != 'OwnerId' && field.name != 'RecordTypeId') {

          // If User is queried, use the reference, otherwise use the Scratch Org User
          if (!objectList.includes('User') && field.referenceTo.includes('User')) {
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

    // Query to get sObject data
    const recordQuery = `SELECT Id, ${fields.join()}
                         FROM ${sobjectName}`;
    const recordResults = (await conn.autoFetchQuery(recordQuery)).records;

    // Replace Lookup Ids + Record Type Ids by references
    await this.cleanJsonRecordLookup(sObjectLabel, recordResults, recordIdsMap, lookups, userFieldsReference);

    return recordResults;
  }

  // Clean JSON to have the same output format as force:data:tree:export
  // Main difference: RecordTypeId is replaced by DeveloperName
  private async cleanJsonRecordLookup(objectLabel: string, records, recordIdsMap, lookups: Array<string>, userFieldsReference: Array<string>,) {

    let refId = 1;
    for (const record of records) {
      
      // Delete record url, useless to reimport somewhere else
      delete record.attributes.url;

      // Add the new ReferenceId
      record.attributes.referenceId = `${objectLabel}Ref${refId}`;
      recordIdsMap.set(record.Id, record.attributes.referenceId);

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

      // Delete unused fields
      delete record.Id;
      delete record.RecordType;
      delete record.OwnerId;

      refId++;
    }
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