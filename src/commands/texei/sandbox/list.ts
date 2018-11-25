import { core, SfdxCommand, flags } from '@salesforce/command';
var exec = require('child-process-promise').exec;

// Initialize Messages with the current plugin directory
core.Messages.importMessagesDirectory(__dirname);

// Load the specific messages for this file. Messages from @salesforce/command, @salesforce/core,
// or any library that is using the messages framework can also be loaded this way.
const messages = core.Messages.loadMessages('texei-sfdx-plugin', 'list');

export default class List extends SfdxCommand {

  public static description = messages.getMessage('commandDescription');

  public static examples = [
    `$ sfdx texei:sandbox:list --targetusername myOrg@example.com`,
  ];

  //public static args = [{ name: 'file' }];

  protected static flagsConfig = {
    // TODO: add flag for time color to warn refresh
    list: flags.string({ char: 'l', description: messages.getMessage('valuesFlagDescription') })
  };

  // Comment this out if your command does not require an org username
  protected static requiresUsername = true;

  // Comment this out if your command does not support a hub org username
  protected static supportsDevhubUsername = true;

  // Set this to true if your command requires a project workspace; 'requiresProject' is false by default
  protected static requiresProject = false;

  public async run(): Promise<any> {

    const values = this.flags.values;

    // this.org is guaranteed because requiresUsername=true, as opposed to supportsUsername
    //const userName = this.org.getUsername();

    // TODO: update to use jsforce ?
    // https://jsforce.github.io/document/#update
    //const updateUserCommand = `sfdx force:data:record:update -s User -w "UserName=${userName}" -v "${values}"`;

    let result = [];
    const conn = this.hubOrg.getConnection();

    try {

      var sandboxList = {};
conn.query("SELECT Id, DisplayName, MemberEntity, Instance, IsSandbox, OrgStatus, OrgEdition FROM EnvironmentHubMember WHERE OrgStatus != 'Deleted'ORDER BY DisplayName", function(err, result) {
  if (err) { return console.error(err); }
  for (var i = 0; i < result.totalSize; i++) {
      console.log('id:' + result.records[i].Id, ' name: 'result.records[i].DisplayName, ' isSandbox: 'result.records[i].IsSandbox);
  }
});


    


      this.ux.table(sandboxList);
    } catch (error) {

      result = error.stderr;


      // Throw an error, sfdx library will manage the way to display it
      //throw new core.SfdxError(records);
    }

    // Everything went fine, return an object that will be used for --json
    return { org: this.org.getOrgId(), message: result };
  }
}
