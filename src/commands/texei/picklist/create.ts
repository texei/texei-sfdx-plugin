/* eslint-disable @typescript-eslint/no-unsafe-member-access */
/* eslint-disable @typescript-eslint/restrict-template-expressions */
/* eslint-disable @typescript-eslint/no-unsafe-argument */
/* eslint-disable @typescript-eslint/require-await */
/* eslint-disable class-methods-use-this */
/* eslint-disable @typescript-eslint/no-unsafe-assignment */
/* eslint-disable no-await-in-loop */
import { promises as fs } from 'fs';
import * as path from 'path';
import { SfCommand, Flags, loglevel } from '@salesforce/sf-plugins-core';
import { Messages } from '@salesforce/core';
import { AnyJson } from '@salesforce/ts-types';
import xml2js = require('xml2js');

// Initialize Messages with the current plugin directory
Messages.importMessagesDirectory(__dirname);

// Load the specific messages for this file. Messages from @salesforce/command, @salesforce/core,
// or any library that is using the messages framework can also be loaded this way.
const messages = Messages.loadMessages('texei-sfdx-plugin', 'picklist.create');

export type PicklistCreateResult = {
  message: string;
};

export default class Create extends SfCommand<PicklistCreateResult> {
  public static readonly summary = messages.getMessage('summary');

  public static readonly examples = [
    'sf texei picklist create --inputdir ./my-file.csv --outputdir ./force-app/main/default/objects/Opportunity/fields --label "My Field" --apiname MyField__c',
  ];

  public static readonly flags = {
    inputdir: Flags.string({ char: 'd', summary: messages.getMessage('flags.inputdir.summary'), required: true }),
    outputdir: Flags.string({ char: 'p', summary: messages.getMessage('flags.outputdir.summary'), required: true }),
    apiname: Flags.string({ char: 'a', summary: messages.getMessage('flags.apiname.summary'), required: true }),
    label: Flags.string({ char: 'l', summary: messages.getMessage('flags.label.summary'), required: true }),
    type: Flags.string({
      char: 't',
      summary: messages.getMessage('flags.type.summary'),
      options: ['Picklist', 'MultiselectPicklist'],
      default: 'Picklist',
      required: false,
    }),
    // loglevel is a no-op, but this flag is added to avoid breaking scripts and warn users who are using it
    loglevel,
  };

  public async run(): Promise<PicklistCreateResult> {
    const { flags } = await this.parse(Create);

    const inputFilePath = path.join(process.cwd(), flags.inputdir);
    const outputFilePath = path.join(process.cwd(), flags.outputdir, `${flags.apiname}.field-meta.xml`);
    const fileData = await fs.readFile(inputFilePath, 'utf8');

    const picklistValueSet: AnyJson = {};
    picklistValueSet.valueSet = {};
    picklistValueSet.valueSet.restricted = true;
    picklistValueSet.valueSet.valueSetDefinition = {};
    picklistValueSet.valueSet.valueSetDefinition.sorted = false;
    picklistValueSet.valueSet.valueSetDefinition.value = [];

    for (const line of fileData.split('\r\n')) {
      const lineValues = line.split(';');

      // Skipping empty line (like ending line)
      // eslint-disable-next-line eqeqeq
      if (lineValues[0] != '') {
        const picklistVal: AnyJson = {};
        picklistVal.fullName = await this.cleanData(lineValues[0]);
        picklistVal.default = false;
        picklistVal.label = await this.cleanData(lineValues[1]);
        picklistValueSet.valueSet.valueSetDefinition.value.push(picklistVal);
      }
    }

    const metadataFile: AnyJson = {
      CustomField: {
        $: { xmlns: 'http://soap.sforce.com/2006/04/metadata' },
        fullName: flags.apiname,
        externalId: false,
        label: flags.label,
        required: false,
        trackFeedHistory: false,
        trackTrending: false,
        type: flags.type,
        valueSet: picklistValueSet.valueSet,
        visibleLines: 4,
      },
    };

    // Building back as an xml
    const builder = new xml2js.Builder();
    const xmlFile = builder.buildObject(metadataFile);

    // Writing back to file
    await fs.writeFile(outputFilePath, xmlFile, 'utf8');

    return { message: 'Picklist created' };
  }

  private async cleanData(value: string): Promise<string> {
    // eslint-disable-next-line @typescript-eslint/prefer-string-starts-ends-with
    if (value.charAt(0) === '"' && value.charAt(value.length - 1) === '"') {
      value = value.substring(1, value.length - 1);
    }
    return value;
  }
}
