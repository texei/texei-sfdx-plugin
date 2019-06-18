import { flags, SfdxCommand } from '@salesforce/command';
import { Messages } from '@salesforce/core';
import * as fs from 'fs';
import * as path from 'path';

const util = require('util');
const xml2js = require('xml2js');

// Initialize Messages with the current plugin directory
Messages.importMessagesDirectory(__dirname);

const defaultApprovalProcessFolder = 'force-app/main/default/approvalProcesses';
const approvalProcessSourceExtension = '.approvalProcess-meta.xml';
const approvalProcessMetadataExtension = '.approvalProcess';

// Load the specific messages for this file. Messages from @salesforce/command, @salesforce/core,
// or any library that is using the messages framework can also be loaded this way.
const messages = Messages.loadMessages('texei-sfdx-plugin', 'approvalprocess-replaceapprover');

export default class ReplaceApprover extends SfdxCommand {

  public static description = messages.getMessage('commandDescription');

  public static examples = [
    '$ texei:metadata:approvalprocess:replaceapprover'
  ];

  protected static flagsConfig = {
    path: flags.string({ char: 'p', required: false, description: `path to approval process' metadata` }),
    approver: flags.string({ char: 'a', required: false, description: `approver's username` })
  };

  // Comment this out if your command does not require an org username
  protected static requiresUsername = true;

  // Comment this out if your command does not require a hub org username
  protected static requiresDevhubUsername = false;

  // Set this to true if your command requires a project workspace; 'requiresProject' is false by default
  protected static requiresProject = true;

  public async run(): Promise<any> {

    let updatedApprovalProcesses = [];

    const approverUsername = this.flags.approver ? this.flags.approver : this.org.getUsername();

    // Promisify functions
    const readdir = util.promisify(fs.readdir);
    const readFile = util.promisify(fs.readFile);
    const writeFile = util.promisify(fs.writeFile);

    // Read files in directory
    const pathToFiles = this.flags.path ? this.flags.path : defaultApprovalProcessFolder;
    const filesInDir = await readdir(pathToFiles);

    // Read files
    for (const fileInDir of filesInDir) {

      const filePath = path.join(
        process.cwd(),
        pathToFiles,
        fileInDir
      );

      // Look only for approval process metadata files (even though nothing else should be there)
      if (!fs.lstatSync(filePath).isDirectory() 
          && (fileInDir.endsWith(approvalProcessSourceExtension) || fileInDir.endsWith(approvalProcessMetadataExtension))) {

        let isUpdated:boolean = false;

        // Read file
        const data = await readFile(filePath, 'utf8');

        // Parsing file
        // According to xml2js doc it's better to recreate a parser for each file
        // https://www.npmjs.com/package/xml2js#user-content-parsing-multiple-files
        var parser = new xml2js.Parser();
        const parseString = util.promisify(parser.parseString);
        const approvalProcessJson = await parseString(data);

        // Replace approver
        for (const approvalStep of approvalProcessJson.ApprovalProcess.approvalStep) {

          for (const assignedApprover of approvalStep.assignedApprover) {

            for (const approver of assignedApprover.approver) {
              
              if (approver.type == 'user') {
                approver.name = approverUsername;
                isUpdated = true;
              }
              else {
                // TODO: queue...
              }
            }
          }
        }

        // If file was updated, save it
        if (isUpdated) {
            
          // Building back as an xml
          const builder = new xml2js.Builder();
          var xmlFile = builder.buildObject(approvalProcessJson);
          
          // Writing back to file
          await writeFile(filePath, xmlFile, 'utf8');

          updatedApprovalProcesses.push(fileInDir);
          this.ux.log(`Replaced approver in ${fileInDir}`);

          // TODO: error management
          /*, function (err) {
            if (err) {
              throw new SfdxError(`Unable to write file at path ${filePath}: ${err}`);
            }
          });
          */
        }
      }
    }

    updatedApprovalProcesses = updatedApprovalProcesses;

    return { updatedApprovalProcesses: updatedApprovalProcesses };
  }
}