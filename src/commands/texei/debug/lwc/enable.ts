/* eslint-disable @typescript-eslint/no-unsafe-member-access */
/* eslint-disable @typescript-eslint/no-unsafe-call */
/* eslint-disable @typescript-eslint/restrict-template-expressions */
/* eslint-disable @typescript-eslint/no-unsafe-assignment */
import {
  SfCommand,
  orgApiVersionFlagWithDeprecations,
  requiredOrgFlagWithDeprecations,
} from '@salesforce/sf-plugins-core';
import { Messages, SfError } from '@salesforce/core';

// Initialize Messages with the current plugin directory
Messages.importMessagesDirectoryFromMetaUrl(import.meta.url);

// Load the specific messages for this file. Messages from @salesforce/command, @salesforce/core,
// or any library that is using the messages framework can also be loaded this way.
const messages = Messages.loadMessages('texei-sfdx-plugin', 'debug.lwc.enable');

export type DebugLwcEnableResult = {
  username: string;
  UserPreferencesUserDebugModePref: boolean;
};

export default class Enable extends SfCommand<DebugLwcEnableResult> {
  public static readonly summary = messages.getMessage('summary');

  public static readonly examples = ['sf texei debug lwc enable --target-org myOrg@example.com'];

  public static readonly flags = {
    'target-org': requiredOrgFlagWithDeprecations,
    'api-version': orgApiVersionFlagWithDeprecations,
  };

  public async run(): Promise<DebugLwcEnableResult> {
    const { flags } = await this.parse(Enable);

    const userName = flags['target-org'].getUsername() as string;
    const conn = flags['target-org'].getConnection(flags['api-version']);

    const res = await conn.sobject('User').upsert(
      [
        {
          UserPreferencesUserDebugModePref: true,
          Username: userName,
        },
      ],
      'Username'
    );

    let debugModePref = false;
    if (res[0]?.success === true) {
      debugModePref = true;
      this.log(`Lightning Component Debug Mode enabled for user ${userName}`);
    } else {
      // @ts-ignore: TODO: working code, but look at TS warning
      throw new SfError(`${res[0].errors[0].statusCode}: ${res[0].errors[0].message}`);
    }

    // Everything went fine, return an object that will be used for --json
    return { username: userName, UserPreferencesUserDebugModePref: debugModePref };
  }
}
