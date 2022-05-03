import { flags, SfdxCommand } from '@salesforce/command';
import { Messages, SfdxError } from '@salesforce/core';
import { AnyJson } from '@salesforce/ts-types';
import * as fs from "fs";
import * as path from "path";
const xml2js = require('xml2js');
const util = require("util");

// Initialize Messages with the current plugin directory
Messages.importMessagesDirectory(__dirname);

// Load the specific messages for this file. Messages from @salesforce/command, @salesforce/core,
// or any library that is using the messages framework can also be loaded this way.
const messages = Messages.loadMessages('texei-sfdx-plugin', 'picklist-unrestrict');

export default class Unrestrict extends SfdxCommand {

  public static description = messages.getMessage('commandDescription');

  public static examples = [
    `$ sfdx texei:picklist:unrestrict`,
    `$ sfdx texei:picklist:unrestrict --json > my-unrestricted-picklists.json`
  ];

  protected static flagsConfig = {
    ignoreerrors: flags.boolean({
      char: "o",
      description: messages.getMessage("ignoreErrorsFlagDescription"),
      required: false
    })
  };

  // Comment this out if your command does not require an org username
  protected static requiresUsername = true;

  // Comment this out if your command does not support a hub org username
  protected static requiresDevhubUsername = false;

  // Set this to true if your command requires a project workspace; 'requiresProject' is false by default
  protected static requiresProject = true;

  public async run(): Promise<AnyJson> {

    const conn = this.org.getConnection();

    let picklistMetadata = [];

    const filesPath = path.join(process.cwd(), 'force-app', 'main', 'default', 'objects');
    const objectFolders = await fs.promises.readdir(filesPath, "utf8");

    for (const folder of objectFolders) {

      // Excluse Custom Metadata
      if (!folder.endsWith('__mdt')) {
        const fieldsPath = path.join(filesPath, folder, 'fields');
        if (fs.existsSync(fieldsPath)) {
          const fieldsFolder = await fs.promises.readdir(fieldsPath, "utf8");
          for (const fieldFile of fieldsFolder) {

            // Read File file
            const fieldFilePath = path.join(fieldsPath, fieldFile);
            const fieldData = (await fs.promises.readFile(fieldFilePath, 'utf8'));
            
            // Parsing file
            // According to xml2js doc it's better to recreate a parser for each file
            // https://www.npmjs.com/package/xml2js#user-content-parsing-multiple-files
            var parser = new xml2js.Parser({ explicitArray: false });
            const parseString = util.promisify(parser.parseString);
            const fieldJson = await parseString(fieldData);
            if ((fieldJson.CustomField.type === 'Picklist'
                || fieldJson.CustomField.type === 'MultiselectPicklist')
                && fieldJson.CustomField.valueSet?.valueSetName === undefined
                && fieldJson.CustomField.valueSet?.restricted === 'true') {

              // Clean Json for update
              const fieldMetadata = fieldJson.CustomField;
              fieldMetadata.fullName = `${folder}.${fieldJson.CustomField.fullName}`;
              fieldMetadata.valueSet.restricted = 'false';
              delete fieldMetadata['$'];
              delete fieldMetadata['@xsi:type'];
              picklistMetadata.push(fieldMetadata);
            }
          }
        }
      }
    }

    let metadataUpdateResults = [];
    const picklistUpdateSuccess = [];
    const picklistUpdateErrors = [];

    if (picklistMetadata.length > 0) {
      // EXCEEDED_ID_LIMIT: record limit reached. cannot submit more than 10 records in this operation
      const maxParallelUpsertRequests = 10;
      
      for (let i = 0; i < picklistMetadata.length; i += maxParallelUpsertRequests) {
        const chunkResults: any = await conn.metadata.update('CustomField', picklistMetadata.slice(i, i + maxParallelUpsertRequests));
        metadataUpdateResults.push(...chunkResults);
      }

      // Handle results
      for (const metadataRes of metadataUpdateResults) {
        if (metadataRes.success === true) {
          picklistUpdateSuccess.push(metadataRes.fullName);
        }
        else {
          picklistUpdateErrors.push(`${metadataRes.fullName}: ${metadataRes.errors?.statusCode} - ${metadataRes.errors?.message}`);
        }
      }
    }

    if (picklistUpdateSuccess.length > 0) {
      this.ux.log('Picklist successfully unrestricted:');
      for (const picklist of picklistUpdateSuccess) {
        this.ux.log(picklist);
      }
    }
    if (picklistUpdateErrors.length > 0) {
      this.ux.log(`\n/!\\ Picklist unrestricted failed:`);
      for (const picklist of picklistUpdateErrors) {
        this.ux.log(picklist);
      }
      if (!this.flags.ignoreerrors) {
        throw new SfdxError(`Unable to unrestrict all picklists: ${picklistUpdateErrors}. You may need to rollback the updated metadata ${picklistUpdateSuccess}`);
      }
    }

    return { result: metadataUpdateResults, picklists: picklistMetadata };
  }
}