import { flags, SfdxCommand } from '@salesforce/command';
import { Messages, SfdxError } from '@salesforce/core';
import { AnyJson } from '@salesforce/ts-types';
import * as fs from "fs";
import * as path from "path";

// Initialize Messages with the current plugin directory
Messages.importMessagesDirectory(__dirname);

// Load the specific messages for this file. Messages from @salesforce/command, @salesforce/core,
// or any library that is using the messages framework can also be loaded this way.
const messages = Messages.loadMessages('texei-sfdx-plugin', 'picklist-restrict');

export default class Restrict extends SfdxCommand {

  public static description = messages.getMessage('commandDescription');

  public static examples = [
    `$ sfdx texei:picklist:restrict -d my-unrestricted-picklists.json`
  ];

  protected static flagsConfig = {
    inputdir: flags.string({
      char: "d",
      description: messages.getMessage("inputFlagDescription"),
      required: true
    }),
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
  protected static requiresProject = false;

  public async run(): Promise<AnyJson> {

    const conn = this.org.getConnection();

    const filePath = path.join(process.cwd(), this.flags.inputdir);
    const fileData = JSON.parse(await fs.promises.readFile(filePath, 'utf8'));

    const picklistMetadata = fileData?.result?.picklists;

    let metadataUpdateResults = [];
    const picklistUpdateSuccess = [];
    const picklistUpdateErrors = [];

    if (picklistMetadata && picklistMetadata.length > 0) {

      // Set back restricted value
      for (const picklist of picklistMetadata) {
        picklist.valueSet.restricted = true;
      }

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
      this.ux.log('Picklist successfully restricted:');
      for (const picklist of picklistUpdateSuccess) {
        this.ux.log(picklist);
      }
    }
    if (picklistUpdateErrors.length > 0) {
      this.ux.log(`\n/!\\ Picklist restricted failed:`);
      for (const picklist of picklistUpdateErrors) {
        this.ux.log(picklist);
      }
      if (!this.flags.ignoreerrors) {
        throw new SfdxError(`Unable to restrict all picklists: ${picklistUpdateErrors}. You may need to rollback the updated metadata ${picklistUpdateSuccess}`);
      }
    }

    return { result: metadataUpdateResults, picklists: picklistMetadata };
  }
}