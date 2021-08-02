import { core, SfdxCommand, flags } from "@salesforce/command";

// Initialize Messages with the current plugin directory
core.Messages.importMessagesDirectory(__dirname);

// Load the specific messages for this file. Messages from @salesforce/command, @salesforce/core,
// or any library that is using the messages framework can also be loaded this way.
const messages = core.Messages.loadMessages(
  "texei-sfdx-plugin",
  "git-branches"
);

const {exec} = require("child_process");


export default class Fix extends SfdxCommand {
  public static description = messages.getMessage("commandDescription");

  public static examples = [
    `$ sfdx texei:org:contractfieldhistory:fix" \nHistory tracking fixed.\n`
  ];

  protected static flagsConfig = {
    //findall: flags.string({char: 'a', description: messages.getMessage('findallFlagDescription'), required: false}),
    findbranches: flags.string({char: 'f', description: messages.getMessage('findbranchesFlagDescription'), required: false}),
    delete: flags.boolean({char: 'd', description: messages.getMessage('deletebranchesFlagDescription'), required: false})
  };

  // Comment this out if your command does not require an org username
  protected static requiresUsername = false;

  // Comment this out if your command does not support a hub org username
  protected static requiresDevhubUsername = false;

  // Set this to true if your command requires a project workspace; 'requiresProject' is false by default
  protected static requiresProject = false;

  public async run(): Promise<any> {
    // Check if user specified a branch name
    if (this.flags.findbranches) {
      //console.log(`stdout: ${this.flags.findbranches}`);
      exec(`git branch --all --list *${this.flags.findbranches}* | tr '*' ' '`, (error, stdout, stderr) => {
        if (error) {
            console.error(`${error.message}`);
            return;
        }
        if (stderr) {
            console.error(`${stderr}`);
            return;
        }

        const branchToDelete = stdout.replace(/remotes\/origin\//g, ' ').replace(/ /g, '').replace(/\n/g, ' ');
        
          console.log(stdout);
          // it's ok
          if (this.flags.delete) {
            if (branchToDelete.search("master") == -1) {
            // Exec deletion
            exec(`git push origin --delete ${branchToDelete}`, (error, stdout, stderr) => {
              if (error) {
                  console.error(`${error.message}`);
                  return;
              }
              if (stderr) {
                  console.error(`${stderr}`);
                  return;
              }
              else {
                console.log('Removed');
                return;
              }
          });
            }
            else {
              console.log('Delete error: One branch of the selected results is or containing Master. Please add more filters.');
              return;
            }
      
      }
      });
    }
  }
}