import { core, SfdxCommand, flags } from '@salesforce/command';
import { Aliases } from '@salesforce/core';

// Initialize Messages with the current plugin directory
core.Messages.importMessagesDirectory(__dirname);

// Load the specific messages for this file. Messages from @salesforce/command, @salesforce/core,
// or any library that is using the messages framework can also be loaded this way.
const messages = core.Messages.loadMessages('texei-sfdx-plugin', 'sandbox-delete');

const invalidType = 'INVALID_TYPE';

export default class Delete extends SfdxCommand {

  public static description = messages.getMessage('commandDescription');

  public static examples = [
    `$ sfdx texei:sandbox:delete --targetusername myOrg@example.com`,
  ];

  protected static flagsConfig = {
    sandboxname: flags.string({ char: 's', required: true, description: messages.getMessage('sandboxnameFlagDescription') })
  };

  // Comment this out if your command does not require an org username
  protected static requiresUsername = true;

  // Set this to true if your command requires a project workspace; 'requiresProject' is false by default
  protected static requiresProject = false;

  public async run(): Promise<any> {

    const sandboxName = this.flags.sandboxname;

    // Look for a sandbox with the provided name
    const query = "SELECT Id FROM SandboxInfo where SandboxName = '"+sandboxName+"'";
    const conn = this.org.getConnection();

    try {

      // Query the org
      const result = await conn.tooling.query(query) as any;

      if (result.size == 0) {
        // No Sandbox found
        const errorMessage = 'Could not find any Sandbox named '+sandboxName+' for '+this.org.getUsername();
        throw new core.SfdxError(errorMessage);
      }

      // Sandbox found, confirm we want to delete it
      const isConfirmed = await this.ux.confirm('Delete Sandbox named: '+sandboxName+' for '+this.org.getUsername()+' ? Are you sure (y/n) ?');

      if (isConfirmed) {
        // Delete the Sandbox
        const sandboxId = result.records[0].Id;
        const deletionResult = await conn.tooling.sobject('SandboxInfo').delete(sandboxId) as any;

        if (deletionResult.success) {
          this.ux.log(messages.getMessage('sandboxDeleted'));
        }
        else {
          throw new core.SfdxError(deletionResult.errors);
        }
      }
    }
    catch (error) {

      let errorMessage = error;
      if (error.errorCode == invalidType) {
        // SandboxInfo not found, it's likely not a Prod org
        errorMessage = messages.getMessage('noSandboxInfo');
      }

      // Throw an error, sfdx library will manage the way to display it
      throw new core.SfdxError(errorMessage);
    }

    // Everything went fine, return an object that will be used for --json
    return { org: this.org.getOrgId() };
  }
}
