import { flags, SfdxCommand } from "@salesforce/command";
import { Messages, SfdxError } from "@salesforce/core";
import * as fs from "fs";
import * as path from "path";
import {
  getMetadata,
  getRecordTypesForObject
} from "../../../../../shared/sfdxProjectFolder";

const util = require("util");
const xml2js = require("xml2js");

// Initialize Messages with the current plugin directory
Messages.importMessagesDirectory(__dirname);

const defaultProjectFolder = "force-app/main/default/";

// Load the specific messages for this file. Messages from @salesforce/command, @salesforce/core,
// or any library that is using the messages framework can also be loaded this way.
const messages = Messages.loadMessages(
  "texei-sfdx-plugin",
  "source-package-references-delete"
);

export default class Delete extends SfdxCommand {
  public static description = messages.getMessage("commandDescription");

  public static examples = [
    "$ texei:source:package:references:delete --namespaces GreatSalesforceBlog --value https://blog.texei.com"
  ];

  protected static flagsConfig = {
    namespaces: flags.string({
      char: "n",
      required: true,
      description: `comma-separated list of namespaces to remove from source`
    })
  };

  // Comment this out if your command does not require an org username
  protected static requiresUsername = false;

  // Comment this out if your command does not require a hub org username
  protected static requiresDevhubUsername = false;

  // Set this to true if your command requires a project workspace; 'requiresProject' is false by default
  protected static requiresProject = true;

  // Promisify functions
  protected readFile = util.promisify(fs.readFile);
  protected writeFile = util.promisify(fs.writeFile);

  public async run(): Promise<any> {
    let updatedSource = [];

    const namespacesToRemove = this.flags.namespaces.split(",");

    for (const obj of await getMetadata("objects")) {
      // Record Types
      for (const recType of await getRecordTypesForObject(obj, "FileName")) {
        await this.cleanRecordType(
          path.join(process.cwd(), defaultProjectFolder, 'objects', obj, 'recordTypes', recType),
          namespacesToRemove
        );

        //console.log(`Object: ${obj} - Record Type: ${recType}`);
        updatedSource.push(recType);
      }
    }

    /*

    // Parsing file
    // According to xml2js doc it's better to recreate a parser for each file
    // https://www.npmjs.com/package/xml2js#user-content-parsing-multiple-files
    var parser = new xml2js.Parser();
    const parseString = util.promisify(parser.parseString);
    const customLabelJson = await parseString(customLabelFile);
    let labelUpdated = false;

    const labelIndex = customLabelJson.CustomLabels.labels.findIndex(label => label.fullName == this.flags.label);

    if (labelIndex != -1) {
        customLabelJson.CustomLabels.labels[labelIndex].value = this.flags.value;
        labelUpdated = true;
    }
    else {
        throw new SfdxError(`Custom Label ${this.flags.label} not found.`);
    }

    // If a label was updated, save the file
    if (labelUpdated) {
        
        // Building back as an xml
        const builder = new xml2js.Builder();
        var xmlFile = builder.buildObject(customLabelJson);
        
        // Writing back to file
        await writeFile(filePath, xmlFile, 'utf8');

        updatedCustomLabels.push(this.flags.label);
        this.ux.log(`Custom Label ${this.flags.label} has been replaced with value ${this.flags.value}`);
    }

    */
    return { sourceUpdated: updatedSource };
  }

  private async cleanRecordType(filePath: string, namespacesToRemove: string[]) {

    const recTypeFile = await this.readFile(filePath, 'utf8');
    //console.log(`######################## ${filePath} ########################`);
    //console.log(recTypeFile);

    // Parsing file
    // According to xml2js doc it's better to recreate a parser for each file
    // https://www.npmjs.com/package/xml2js#user-content-parsing-multiple-files
    var parser = new xml2js.Parser();
    const parseString = util.promisify(parser.parseString);
    const recTypeJson = await parseString(recTypeFile);

    // If there is no picklist field, there is no picklistValues tag
    if (recTypeJson.RecordType.picklistValues) {
      for (const pl of recTypeJson.RecordType.picklistValues) {
        
        const picklistValue = pl.picklist[0];

        // If picklist is from one of the namespaces to remove, well, remove :D
        if (picklistValue.includes('__')) {

          const fieldNamespace = picklistValue.split('__')[0];
          
          //console.log(fieldNamespace);
          if (namespacesToRemove.includes(fieldNamespace)) {
            // Just checking in case it's not just the name of the field (unlikely but easy to test anyway)
            // ex: check it's not a custom field named NAMESPACE__c
            if (picklistValue == `${fieldNamespace}__c`) {
              console.log(`DEBUG Ignoring field ${picklistValue} as it looks like a namespace, but it's not!`);
              this.debug(`DEBUG Ignoring field ${picklistValue} as it looks like a namespace, but it's not!`);
              break;
            }

            console.log(`Deleting field ${picklistValue}.`);
            // TODO: Delete namespaced picklist
          }
        }
      }
      // TODO: Save file
      // TODO: Update list of updated file to return it with --json
    }
  }
}
