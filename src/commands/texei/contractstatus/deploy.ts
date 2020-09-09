import { core, flags, SfdxCommand } from "@salesforce/command";
import { SfdxError } from '@salesforce/core';
import { StandardValueSetHelper } from "../../../shared/standardValueSetHelper";
import * as fs from 'fs';
import * as path from 'path';
const util = require("util");
const xml2js = require('xml2js');

// Initialize Messages with the current plugin directory
core.Messages.importMessagesDirectory(__dirname);

// Load the specific messages for this file. Messages from @salesforce/command, @salesforce/core,
// or any library that is using the messages framework can also be loaded this way.
const messages = core.Messages.loadMessages(
  "texei-sfdx-plugin",
  "contractstatus-deploy"
);

const contractStatusSourceFileName = 'ContractStatus.standardValueSet-meta.xml';

export default class Deploy extends SfdxCommand {
  public static description = messages.getMessage("commandDescription");

  public static examples = [
    `sfdx texei:contractstatus:deploy --path ./myPathToContractStatusSourceFile/ --targetusername texei`,
  ];

  protected static flagsConfig = {
    path: flags.string({char: 'p', description: messages.getMessage('pathToContractStatusSourceFile'), required: true}) 
  };

  // Comment this out if your command does not require an org username
  protected static requiresUsername = true;

  // Comment this out if your command does not support a hub org username
  protected static requiresDevhubUsername = false;

  // Set this to true if your command requires a project workspace; 'requiresProject' is false by default
  protected static requiresProject = false;

  public async run(): Promise<any> {

    this.debug('Reading ContractStatus file');
    const readFile = util.promisify(fs.readFile);
    contractStatusSourceFileName
    const filePath = path.join(
      process.cwd(),
      this.flags.path,
      contractStatusSourceFileName
    );
    const contractStatusXML = await readFile(filePath, "utf8");

    // Parsing file
    // According to xml2js doc it's better to recreate a parser for each file
    // https://www.npmjs.com/package/xml2js#user-content-parsing-multiple-files
    var parser = new xml2js.Parser();
    const parseString = util.promisify(parser.parseString);
    const contractStatusJson = await parseString(contractStatusXML);

    const svsh = new StandardValueSetHelper(this.org.getConnection(), 'ContractStatus');
    await svsh.init();
    
    /*****************/
    await svsh.deleteValue('Activated');
    /*****************/
    /*
    for (const standardValueSet of contractStatusJson.StandardValueSet.standardValue) {
      this.ux.startSpinner(`Deploying ContractStatus value ${standardValueSet.label}/${standardValueSet.fullName}`, null, { stdout: true });

      try {
        const result = await svsh.addValue(standardValueSet.label, standardValueSet.fullName);
        this.ux.stopSpinner(result);
      }
      catch(err) {
        await svsh.close();
        this.ux.stopSpinner('ERROR');
        throw new SfdxError(err);
      }
    }

    await svsh.close();

    return { message: `ContractStatus deployed` };
    */
  }
}