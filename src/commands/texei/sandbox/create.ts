import { core, SfdxCommand, flags } from '@salesforce/command';
var exec = require('child-process-promise').exec;

// Initialize Messages with the current plugin directory
core.Messages.importMessagesDirectory(__dirname);

// Load the specific messages for this file. Messages from @salesforce/command, @salesforce/core,
// or any library that is using the messages framework can also be loaded this way.
const messages = core.Messages.loadMessages('texei-sfdx-plugin', 'create');

export default class Create extends SfdxCommand {

  public static description = messages.getMessage('commandDescription');

  public static examples = [
    `$ sfdx texei:sandbox:create --targetusername myOrg@example.com --name SandboxName`,
  ];

  //public static args = [{ name: 'file' }];

  protected static flagsConfig = {
    // TODO: add flag for time color to warn refresh
    name: flags.string({ char: 'n', description: 'Enter the name of your new Sandbox', required: true }),
    confirmed: { type: 'boolean',  char: 'c', description: 'Auto-confirm Sandbox creation'}
  };

  // Comment this out if your command does not require an org username
  protected static requiresUsername = true;

  // Comment this out if your command does not support a hub org username
  protected static supportsDevhubUsername = true;

  // Set this to true if your command requires a project workspace; 'requiresProject' is false by default
  protected static requiresProject = false;

  public async run(): Promise<any> {

    const values = this.flags.values;

    // Define the query for retrieving Sandboxes informations
    //const query = "SELECT Id, SandboxName, Description, LicenseType FROM SandboxInfo";
    //const conn = this.org.getConnection();

  try {

  if (this.flags.name) {
    this.flags.confirmed = await this.ux.confirm('Are you sure to create a sandbox named ' + this.flags.name + '? (Y/n)');
  }

  console.log('confirmer : ', this.flags.confirmed);
 

  } catch (error) {


      // Throw an error, sfdx library will manage the way to display it
      //throw new core.SfdxError(records);
    }

    // Everything went fine, return an object that will be used for --json
    return;// { org: this.org.getOrgId(), message: result };
  }
}
