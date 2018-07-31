import { core, SfdxCommand, flags } from '@salesforce/command';
var exec = require('child-process-promise').exec;

// Initialize Messages with the current plugin directory
core.Messages.importMessagesDirectory(__dirname);

// Load the specific messages for this file. Messages from @salesforce/command, @salesforce/core,
// or any library that is using the messages framework can also be loaded this way.
const messages = core.Messages.loadMessages('texei-sfdx-plugin', 'update');

export default class Update extends SfdxCommand {

  public static description = messages.getMessage('commandDescription');

  public static examples = [
    `$ sfdx texei:user:update --targetusername myOrg@example.com --values "LanguageLocaleKey='fr'" \nSuccessfully updated record: 005D2A90N8A11SVPE2.`,
    `$ sfdx texei:user:update  --values "UserPermissionsKnowledgeUser=true --json"`
  ];

  //public static args = [{ name: 'file' }];

  protected static flagsConfig = {
    values: flags.string({ char: 'v', description: messages.getMessage('valuesFlagDescription') })
  };

  // Comment this out if your command does not require an org username
  protected static requiresUsername = true;

  // Comment this out if your command does not support a hub org username
  protected static supportsDevhubUsername = false;

  // Set this to true if your command requires a project workspace; 'requiresProject' is false by default
  protected static requiresProject = false;

  public async run(): Promise<any> {

    const values = this.flags.values;

    // this.org is guaranteed because requiresUsername=true, as opposed to supportsUsername
    const userName = this.org.getUsername();

    // TODO: update to use jsforce ?
    // https://jsforce.github.io/document/#update
    const updateUserCommand = `sfdx force:data:record:update -s User -w "UserName=${userName}" -v "${values}"`;

    let result = '';
    try {

      const { stdout, stderr } = await exec(updateUserCommand);
      result = stdout;

      // Remove line breaks from string
      result = result.replace(/(\r\n\t|\n|\r\t)/gm,'');

      this.ux.log(result);
    } catch (error) {

      result = error.stderr;

      // Remove line breaks from string
      result = result.replace(/(\r\n\t|\n|\r\t)/gm,'');

      // Throw an error, sfdx library will manage the way to display it
      throw new core.SfdxError(result);
    }

    // Everything went fine, return an object that will be used for --json
    return { org: this.org.getOrgId(), message: result };
  }
}
