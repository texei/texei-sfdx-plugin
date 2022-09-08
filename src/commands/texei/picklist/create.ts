import { flags, SfdxCommand } from '@salesforce/command';
import { Messages } from '@salesforce/core';
import { AnyJson } from '@salesforce/ts-types';
import { promises as fs } from 'fs';
import * as path from "path";
const xml2js = require('xml2js');

// Initialize Messages with the current plugin directory
Messages.importMessagesDirectory(__dirname);

// Load the specific messages for this file. Messages from @salesforce/command, @salesforce/core,
// or any library that is using the messages framework can also be loaded this way.
const messages = Messages.loadMessages('texei-sfdx-plugin', 'picklist-create');

export default class Restrict extends SfdxCommand {

  public static description = messages.getMessage('commandDescription');

  public static examples = [
    `sfdx texei:picklist:create --inputdir ./my-file.csv --outputdir ./force-app/main/default/objects/Opportunity/fields --label "My Field" --apiname MyField__c`
  ];

  protected static flagsConfig = {
    inputdir: flags.string({
      char: "d",
      description: messages.getMessage("inputFlagDescription"),
      required: true
    }),
    outputdir: flags.string({
      char: "o",
      description: messages.getMessage("outputFlagDescription"),
      required: true
    }),
    apiname: flags.string({
      char: "a",
      description: messages.getMessage("apiNameFlagDescription"),
      required: true
    }),
    label: flags.string({
      char: "l",
      description: messages.getMessage("labelFlagDescription"),
      required: true
    }),
    type: flags.string({
      char: "t",
      description: messages.getMessage("typeFlagDescription"),
      options: ['Picklist', 'MultiselectPicklist'], 
      default: 'Picklist',
      required: false
    })
  };

  // Comment this out if your command does not require an org username
  protected static requiresUsername = false;

  // Comment this out if your command does not support a hub org username
  protected static requiresDevhubUsername = false;

  // Set this to true if your command requires a project workspace; 'requiresProject' is false by default
  protected static requiresProject = false;

  public async run(): Promise<AnyJson> {

    const inputFilePath = path.join(process.cwd(), this.flags.inputdir);
    const outputFilePath = path.join(process.cwd(), this.flags.outputdir, `${this.flags.apiname}.field-meta.xml`);
    const fileData = await fs.readFile(inputFilePath, 'utf8');

    let picklistValueSet:AnyJson = {};
    picklistValueSet.valueSet =  {};
    picklistValueSet.valueSet.restricted = true;
    picklistValueSet.valueSet.valueSetDefinition = {};
    picklistValueSet.valueSet.valueSetDefinition.sorted = false;
    picklistValueSet.valueSet.valueSetDefinition.value = [];

    for (const line of fileData.split('\r\n')) {

      const lineValues = line.split(';');

      // Skipping empty line (like ending line)
      if (lineValues[0] != '') {
        let picklistVal:AnyJson = {};
        picklistVal.fullName = await this.cleanData(lineValues[0]);
        picklistVal.default = false;
        picklistVal.label = await this.cleanData(lineValues[1]);
        picklistValueSet.valueSet.valueSetDefinition.value.push(picklistVal);
      }
    }

    let metadataFile:AnyJson = {
      'CustomField': {
          $: { xmlns: 'http://soap.sforce.com/2006/04/metadata' },
          fullName: this.flags.apiname,
          externalId: false,
          label: this.flags.label,
          required: false,
          trackFeedHistory: false,
          trackTrending: false,
          type: this.flags.type,
          valueSet: picklistValueSet.valueSet,
          visibleLines: 4
      }
    };

    // Building back as an xml
    const builder = new xml2js.Builder();
    var xmlFile = builder.buildObject(metadataFile);

    // Writing back to file
    await fs.writeFile(outputFilePath, xmlFile, 'utf8');

    return {};
  }

  private async cleanData(value: string):Promise<string> {
    if  (value.charAt(0) === `"` && value.charAt(value.length-1) === `"`) {
      value = value.substring(1, value.length-1);
    }
    return value;
  }
}