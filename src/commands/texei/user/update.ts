/* eslint-disable @typescript-eslint/no-unsafe-member-access */
/* eslint-disable @typescript-eslint/no-unsafe-assignment */
import {
  SfCommand,
  Flags,
  orgApiVersionFlagWithDeprecations,
  requiredOrgFlagWithDeprecations,
  loglevel,
} from '@salesforce/sf-plugins-core';
import { Messages, SfError } from '@salesforce/core';
import childProcess = require('child-process-promise');

// Initialize Messages with the current plugin directory
Messages.importMessagesDirectoryFromMetaUrl(import.meta.url);

// Load the specific messages for this file. Messages from @salesforce/command, @salesforce/core,
// or any library that is using the messages framework can also be loaded this way.
const messages = Messages.loadMessages('texei-sfdx-plugin', 'user.update');

export type UpdateResult = {
  org: string;
  message: string;
};

export default class Update extends SfCommand<UpdateResult> {
  public static readonly summary = messages.getMessage('summary');

  public static readonly examples = [
    'sf texei user update --target-org myOrg@example.com --values "LanguageLocaleKey=\'fr\'" \nSuccessfully updated record: 005D2A90N8A11SVPE2.',
    'sf texei user update  --values "UserPermissionsKnowledgeUser=true" --json',
    'sf texei user update  --values "LanguageLocaleKey=en_US UserPermissionsMarketingUser=true" --json',
  ];

  public static readonly flags = {
    'target-org': requiredOrgFlagWithDeprecations,
    'api-version': orgApiVersionFlagWithDeprecations,
    values: Flags.string({ char: 'v', summary: messages.getMessage('flags.values.summary') }),
    // loglevel is a no-op, but this flag is added to avoid breaking scripts and warn users who are using it
    loglevel,
  };

  public async run(): Promise<UpdateResult> {
    const { flags } = await this.parse(Update);

    const values = flags.values;

    // this.org is guaranteed because requiresUsername=true, as opposed to supportsUsername
    const userName = flags['target-org'].getUsername();

    // TODO: update to use jsforce ?
    // https://jsforce.github.io/document/#update
    const updateUserCommand = `sfdx force:data:record:update -s User -w "UserName=${userName}" -v "${values}" -u ${userName}`;

    let result = '';
    try {
      const { stdout } = await childProcess.exec(updateUserCommand);
      result = stdout;

      // Remove line breaks from string
      result = result.replace(/(\r\n\t|\n|\r\t)/gm, '');

      this.log(result);
    } catch (error) {
      result = error.stderr;

      // Remove line breaks from string
      result = result?.replace(/(\r\n\t|\n|\r\t)/gm, '');

      // Throw an error, sfdx library will manage the way to display it
      throw new SfError(result);
    }

    // Everything went fine, return an object that will be used for --json
    return { org: flags['target-org'].getOrgId(), message: result };
  }
}
