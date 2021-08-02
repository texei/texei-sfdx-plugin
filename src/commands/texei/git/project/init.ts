import { core, SfdxCommand, flags } from "@salesforce/command";
import { resolve } from "node:path";
import { mainModule } from "node:process";
import * as readline from 'readline';

// Initialize Messages with the current plugin directory
core.Messages.importMessagesDirectory(__dirname);

// Load the specific messages for this file. Messages from @salesforce/command, @salesforce/core,
// or any library that is using the messages framework can also be loaded this way.
const messages = core.Messages.loadMessages(
  "texei-sfdx-plugin",
  "git-project-init"
);



export default class Fix extends SfdxCommand {
  public static description = messages.getMessage("commandDescription");

  public static examples = [
    `$ sfdx texei:org:contractfieldhistory:fix" \nHistory tracking fixed.\n`
  ];

  protected static flagsConfig = {
    //findall: flags.string({char: 'a', description: messages.getMessage('findallFlagDescription'), required: false}),
  };

  // Comment this out if your command does not require an org username
  protected static requiresUsername = false;

  // Comment this out if your command does not support a hub org username
  protected static requiresDevhubUsername = false;

  // Set this to true if your command requires a project workspace; 'requiresProject' is false by default
  protected static requiresProject = false;



  public async run(): Promise<any> {

    const GREEN = "\x1b[32m";
    const WHITE = "\x1b[0m";
    const RED = "\x1b[31m"

    const project = {
      name: '',
      repositoryName: '', // Name of the repository in 
      branchingStrategy: '', // Standard - Custom
    };


    let rl = readline.createInterface({
      input: process.stdin,
      output: process.stdout,
    });

    
    const question1 = () => {
      return new Promise((resolve, reject) => {
        rl.question('What is the name of your sfdx project ? ', (answer) => {
          project.name = answer;
          resolve();
        });
      });
    }

    const question2 = () => {
      return new Promise((resolve, reject) => {
        rl.question('What is the name of your repository ? ', (answer) => {
          project.repositoryName = answer;
          resolve();
        });
      });
    }

    const question3 = () => {
      return new Promise((resolve, reject) => {
        rl.question('What is your branching strategy ? (s = Standard, c = Custom) ', (answer) => {
          switch(answer.toLowerCase()) {
            case 'c':
              console.log('Custom');
              break;
            case 's':
              console.log('Standard');
              break;
            default:
              console.log('Invalid');
          }
          resolve();
        });
      });
    }

    const main = async () => {
      await question1();
      await question2();
      await question3();
      rl.close;
    }

    main();

  }
}