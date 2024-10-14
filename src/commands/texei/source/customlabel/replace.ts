/* eslint-disable @typescript-eslint/no-unsafe-member-access */
/* eslint-disable @typescript-eslint/no-unsafe-call */
/* eslint-disable @typescript-eslint/restrict-template-expressions */
/* eslint-disable @typescript-eslint/no-unsafe-argument */
/* eslint-disable @typescript-eslint/no-unsafe-assignment */
import * as path from 'node:path';
import util = require('util');
import * as fs from 'node:fs';
import { SfCommand, Flags, loglevel } from '@salesforce/sf-plugins-core';
import { Messages, SfError } from '@salesforce/core';
import xml2js = require('xml2js');

// Initialize Messages with the current plugin directory
Messages.importMessagesDirectoryFromMetaUrl(import.meta.url);

const defaultCustomLabelsFolder = 'force-app/main/default/labels';
const customLabelsFileName = 'CustomLabels.labels-meta.xml';

// Load the specific messages for this file. Messages from @salesforce/command, @salesforce/core,
// or any library that is using the messages framework can also be loaded this way.
const messages = Messages.loadMessages('texei-sfdx-plugin', 'source.customlabel.replace');

export type SourceCustomlabelReplaceResult = {
  updatelabels: string[];
};

export default class Replace extends SfCommand<SourceCustomlabelReplaceResult> {
  public static readonly summary = messages.getMessage('summary');

  public static readonly examples = [
    '$ sf texei source customlabel replace --label GreatSalesforceBlog --value https://blog.texei.com',
  ];

  public static readonly requiresProject = true;

  public static readonly flags = {
    path: Flags.string({ char: 'p', summary: messages.getMessage('flags.path.summary'), required: false }),
    label: Flags.string({ char: 'l', summary: messages.getMessage('flags.label.summary'), required: true }),
    value: Flags.string({ char: 'v', summary: messages.getMessage('flags.value.summary'), required: true }),
    // loglevel is a no-op, but this flag is added to avoid breaking scripts and warn users who are using it
    loglevel,
  };

  public async run(): Promise<SourceCustomlabelReplaceResult> {
    const { flags } = await this.parse(Replace);

    const updatedCustomLabels = [];

    // Promisify functions
    const readFile = util.promisify(fs.readFile);
    const writeFile = util.promisify(fs.writeFile);

    // Read files in directory
    const pathToFile = flags.path ? flags.path : defaultCustomLabelsFolder;

    const filePath = path.join(process.cwd(), pathToFile, customLabelsFileName);

    // Read file
    const customLabelFile = await readFile(filePath, 'utf8');

    // Parsing file
    // According to xml2js doc it's better to recreate a parser for each file
    // https://www.npmjs.com/package/xml2js#user-content-parsing-multiple-files
    const parser = new xml2js.Parser();
    // eslint-disable-next-line @typescript-eslint/unbound-method
    const parseString = util.promisify(parser.parseString);
    // @ts-ignore: TODO: working code, but look at TS warning
    const customLabelJson = JSON.parse(JSON.stringify(await parseString(customLabelFile)));
    let labelUpdated = false;

    // eslint-disable-next-line eqeqeq
    const labelIndex = customLabelJson.CustomLabels.labels.findIndex((label) => label.fullName == flags.label);

    // eslint-disable-next-line eqeqeq
    if (labelIndex != -1) {
      customLabelJson.CustomLabels.labels[labelIndex].value = flags.value;
      labelUpdated = true;
    } else {
      throw new SfError(`Custom Label ${flags.label} not found.`);
    }

    // If a label was updated, save the file
    if (labelUpdated) {
      // Building back as an xml
      const builder = new xml2js.Builder();
      const xmlFile = builder.buildObject(customLabelJson);

      // Writing back to file
      await writeFile(filePath, xmlFile, 'utf8');

      // @ts-ignore: TODO: working code, but look at TS warning
      updatedCustomLabels.push(flags.label);
      this.log(`Custom Label ${flags.label} has been replaced with value ${flags.value}`);
    }

    return { updatelabels: updatedCustomLabels };
  }
}
