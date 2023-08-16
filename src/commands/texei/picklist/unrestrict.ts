/* eslint-disable @typescript-eslint/no-unsafe-member-access */
/* eslint-disable @typescript-eslint/no-unsafe-call */
/* eslint-disable @typescript-eslint/restrict-template-expressions */
/* eslint-disable @typescript-eslint/no-unsafe-argument */
/* eslint-disable no-await-in-loop */
/* eslint-disable @typescript-eslint/no-explicit-any */
/* eslint-disable @typescript-eslint/no-unsafe-assignment */
import util = require('util');
import * as path from 'path';
import * as fs from 'fs';
import {
  SfCommand,
  Flags,
  orgApiVersionFlagWithDeprecations,
  requiredOrgFlagWithDeprecations,
} from '@salesforce/sf-plugins-core';
import { Messages, SfError } from '@salesforce/core';
import xml2js = require('xml2js');

// Initialize Messages with the current plugin directory
Messages.importMessagesDirectory(__dirname);

// Load the specific messages for this file. Messages from @salesforce/command, @salesforce/core,
// or any library that is using the messages framework can also be loaded this way.
const messages = Messages.loadMessages('texei-sfdx-plugin', 'picklist.unrestrict');

export type PicklistUnrestrictResult = {
  result: string[];
  picklists: string[];
};
export default class Unrestrict extends SfCommand<PicklistUnrestrictResult> {
  public static readonly summary = messages.getMessage('summary');

  public static readonly examples = [
    '$ sf texei picklist unrestrict',
    '$ sf texei picklist unrestrict --json > my-unrestricted-picklists.json',
  ];

  public static readonly requiresProject = true;

  public static readonly flags = {
    'target-org': requiredOrgFlagWithDeprecations,
    'api-version': orgApiVersionFlagWithDeprecations,
    ignoreerrors: Flags.string({
      char: 'e',
      summary: messages.getMessage('flags.ignoreerrors.summary'),
      required: true,
    }),
  };

  public async run(): Promise<PicklistUnrestrictResult> {
    const { flags } = await this.parse(Unrestrict);

    const conn = flags['target-org'].getConnection(flags['api-version']);

    const picklistMetadata = [];

    const filesPath = path.join(process.cwd(), 'force-app', 'main', 'default', 'objects');
    const objectFolders = await fs.promises.readdir(filesPath, 'utf8');

    for (const folder of objectFolders) {
      // Excluse Custom Metadata
      if (!folder.endsWith('__mdt')) {
        const fieldsPath = path.join(filesPath, folder, 'fields');
        if (fs.existsSync(fieldsPath)) {
          const fieldsFolder = await fs.promises.readdir(fieldsPath, 'utf8');
          for (const fieldFile of fieldsFolder) {
            // Read File file
            const fieldFilePath = path.join(fieldsPath, fieldFile);
            const fieldData = await fs.promises.readFile(fieldFilePath, 'utf8');

            // Parsing file
            // According to xml2js doc it's better to recreate a parser for each file
            // https://www.npmjs.com/package/xml2js#user-content-parsing-multiple-files
            const parser = new xml2js.Parser({ explicitArray: false });
            // eslint-disable-next-line @typescript-eslint/unbound-method
            const parseString = util.promisify(parser.parseString);
            // @ts-ignore: TODO: working code, but look at TS warning
            const fieldJson = JSON.parse(JSON.stringify(await parseString(fieldData)));
            if (
              (fieldJson.CustomField.type === 'Picklist' || fieldJson.CustomField.type === 'MultiselectPicklist') &&
              fieldJson.CustomField.valueSet?.valueSetName === undefined &&
              fieldJson.CustomField.valueSet?.restricted === 'true'
            ) {
              // Clean Json for update
              const fieldMetadata = fieldJson.CustomField;
              fieldMetadata.fullName = `${folder}.${fieldJson.CustomField.fullName}`;
              fieldMetadata.valueSet.restricted = 'false';
              delete fieldMetadata['$'];
              delete fieldMetadata['@xsi:type'];
              // @ts-ignore: TODO: working code, but look at TS warning
              picklistMetadata.push(fieldMetadata);
            }
          }
        }
      }
    }

    const metadataUpdateResults = [];
    const picklistUpdateSuccess = [];
    const picklistUpdateErrors = [];

    if (picklistMetadata.length > 0) {
      // EXCEEDED_ID_LIMIT: record limit reached. cannot submit more than 10 records in this operation
      const maxParallelUpsertRequests = 10;

      for (let i = 0; i < picklistMetadata.length; i += maxParallelUpsertRequests) {
        const chunkResults: any = await conn.metadata.update(
          'CustomField',
          picklistMetadata.slice(i, i + maxParallelUpsertRequests)
        );
        // @ts-ignore: TODO: working code, but look at TS warning
        metadataUpdateResults.push(...chunkResults);
      }

      // Handle results
      for (const metadataRes of metadataUpdateResults) {
        // @ts-ignore: TODO: working code, but look at TS warning
        if (metadataRes.success === true) {
          // @ts-ignore: TODO: working code, but look at TS warning
          picklistUpdateSuccess.push(metadataRes.fullName);
        } else {
          picklistUpdateErrors.push(
            // @ts-ignore: TODO: working code, but look at TS warning
            `${metadataRes.fullName}: ${metadataRes.errors?.statusCode} - ${metadataRes.errors?.message}`
          );
        }
      }
    }

    if (picklistUpdateSuccess.length > 0) {
      this.log('Picklist successfully unrestricted:');
      for (const picklist of picklistUpdateSuccess) {
        this.log(picklist);
      }
    }
    if (picklistUpdateErrors.length > 0) {
      this.log('\n/!\\ Picklist unrestricted failed:');
      for (const picklist of picklistUpdateErrors) {
        this.log(picklist);
      }
      if (!flags.ignoreerrors) {
        throw new SfError(
          `Unable to unrestrict all picklists: ${picklistUpdateErrors}. You may need to rollback the updated metadata ${picklistUpdateSuccess}`
        );
      }
    }

    return { result: metadataUpdateResults, picklists: picklistMetadata };
  }
}
