/* eslint-disable @typescript-eslint/no-unsafe-member-access */
/* eslint-disable @typescript-eslint/no-unsafe-call */
/* eslint-disable @typescript-eslint/restrict-template-expressions */
/* eslint-disable @typescript-eslint/no-unsafe-argument */
/* eslint-disable no-await-in-loop */
/* eslint-disable @typescript-eslint/no-explicit-any */
/* eslint-disable @typescript-eslint/no-unsafe-assignment */
import * as fs from 'fs';
import * as path from 'path';
import {
  SfCommand,
  Flags,
  orgApiVersionFlagWithDeprecations,
  requiredOrgFlagWithDeprecations,
} from '@salesforce/sf-plugins-core';
import { Messages, SfError } from '@salesforce/core';

// Initialize Messages with the current plugin directory
Messages.importMessagesDirectory(__dirname);

// Load the specific messages for this file. Messages from @salesforce/command, @salesforce/core,
// or any library that is using the messages framework can also be loaded this way.
const messages = Messages.loadMessages('texei-sfdx-plugin', 'picklist.restrict');

export type PicklistRestrictResult = {
  result: string[];
  picklists: string[];
};

export default class Restrict extends SfCommand<PicklistRestrictResult> {
  public static readonly summary = messages.getMessage('summary');

  public static readonly examples = ['$ sf texei picklist restrict -d my-unrestricted-picklists.json'];

  public static readonly requiresProject = true;

  public static readonly flags = {
    'target-org': requiredOrgFlagWithDeprecations,
    'api-version': orgApiVersionFlagWithDeprecations,
    inputdir: Flags.string({ char: 'd', summary: messages.getMessage('flags.inputdir.summary'), required: true }),
    ignoreerrors: Flags.string({
      char: 'e',
      summary: messages.getMessage('flags.ignoreerrors.summary'),
      required: true,
    }),
  };

  public async run(): Promise<PicklistRestrictResult> {
    const { flags } = await this.parse(Restrict);

    const conn = flags['target-org'].getConnection(flags['api-version']);

    const filePath = path.join(process.cwd(), flags.inputdir);
    const fileData = JSON.parse(await fs.promises.readFile(filePath, 'utf8'));

    const picklistMetadata = fileData?.result?.picklists;

    const metadataUpdateResults = [];
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
      this.log('Picklist successfully restricted:');
      for (const picklist of picklistUpdateSuccess) {
        this.log(picklist);
      }
    }
    if (picklistUpdateErrors.length > 0) {
      this.log('\n/!\\ Picklist restricted failed:');
      for (const picklist of picklistUpdateErrors) {
        this.log(picklist);
      }
      if (!flags.ignoreerrors) {
        throw new SfError(
          `Unable to restrict all picklists: ${picklistUpdateErrors}. You may need to rollback the updated metadata ${picklistUpdateSuccess}`
        );
      }
    }

    return { result: metadataUpdateResults, picklists: picklistMetadata };
  }
}
