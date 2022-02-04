import { SfdxCommand } from '@salesforce/command';
import { Messages, SfdxError } from '@salesforce/core';

// Initialize Messages with the current plugin directory
Messages.importMessagesDirectory(__dirname);

// Load the specific messages for this file. Messages from @salesforce/command, @salesforce/core,
// or any library that is using the messages framework can also be loaded this way.
const messages = Messages.loadMessages('texei-sfdx-plugin', 'debug-lwc-enable');

export default class Enable extends SfdxCommand {

  public static description = messages.getMessage('commandDescription');

  public static examples = [
    `sfdx texei:debug:lwc:enable --targetusername myOrg@example.com`
  ];

  protected static flagsConfig = {};

  // Comment this out if your command does not require an org username
  protected static requiresUsername = true;

  // Comment this out if your command does not support a hub org username
  protected static supportsDevhubUsername = false;

  // Set this to true if your command requires a project workspace; 'requiresProject' is false by default
  protected static requiresProject = false;

  public async run(): Promise<any> {

    const userName = this.org.getUsername();
    const conn = this.org.getConnection();

    const res = await conn.sobject('User').upsert([{ 
      UserPreferencesUserDebugModePref : true,
      Username : userName
    }], 'Username');

    let debugModePref = false;
    if (res[0]?.success === true) {
      debugModePref = true;
      this.ux.log(`Lightning Component Debug Mode enabled for user ${userName}`);
    }
    else {
      throw new SfdxError(`${res[0].errors[0].statusCode}: ${res[0].errors[0].message}`);
    }

    // Everything went fine, return an object that will be used for --json
    return { username: userName, UserPreferencesUserDebugModePref: debugModePref };
  }
}
