import * as fs from 'node:fs';
import * as path from 'node:path';
import { SfCommand, Flags } from '@salesforce/sf-plugins-core';
import { Messages, SfError } from '@salesforce/core';
import { XMLParser, XMLBuilder } from 'fast-xml-parser';
import { getDefaultPackagePath } from '../../../../shared/sfdxProjectFolder';
import { FlowMetadataType, FlowVariable } from './MetadataTypes';

Messages.importMessagesDirectory(__dirname);
const messages = Messages.loadMessages('texei-sfdx-plugin', 'texei.source.flow.convert');

export type TexeiSourceFlowConvertResult = {
  convertedFlowPath: string;
};

export default class TexeiSourceFlowConvert extends SfCommand<TexeiSourceFlowConvertResult> {
  public static readonly summary = messages.getMessage('summary');
  public static readonly description = messages.getMessage('description');
  public static readonly examples = messages.getMessages('examples');

  // Potential improvement: add a flag to convert entry criteria to decision node
  public static readonly flags = {
    name: Flags.string({
      summary: messages.getMessage('flags.name.summary'),
      char: 'n',
      required: true,
    }),
    path: Flags.string({ char: 'p', required: false, summary: messages.getMessage('flags.path.summary') }),
    'save-to-file-name': Flags.string({
      char: 's',
      required: false,
      summary: messages.getMessage('flags.path.save-to-file-name'),
    }),
  };

  public async run(): Promise<TexeiSourceFlowConvertResult> {
    const { flags } = await this.parse(TexeiSourceFlowConvert);

    let savedFlowPath = '';

    this.warn(messages.getMessage('warning.beta'));

    const flowName = flags.name.endsWith('.flow-meta.xml') ? flags.name : `${flags.name}.flow-meta.xml`;
    const flowFolderPath: string = flags.path
      ? path.join(flags.path, 'flows')
      : path.join(await getDefaultPackagePath(), 'flows');
    const flowPath: string = path.join(flowFolderPath, flowName);

    // Check if flow exists
    if (fs.existsSync(flowPath)) {
      // Read data file
      const data = fs.readFileSync(flowPath, 'utf8');

      // Parsing file
      const xmlParserBuilderOptions = {
        ignoreAttributes: false,
        removeNSPrefix: false,
        numberParseOptions: {
          hex: false,
          leadingZeros: false,
          skipLike: /\.[0-9]*0/,
        },
        format: true,
      };

      const parser = new XMLParser(xmlParserBuilderOptions);
      let flowJson: FlowMetadataType = parser.parse(data) as FlowMetadataType;

      const targetObject = flowJson?.Flow?.start?.object as string;

      // Check if $Record or $ Record__Prior are used, if so create variables to replace them
      let flowAsString = JSON.stringify(flowJson);
      const variables: FlowVariable[] = [];

      // Converting $Record__Prior to 'RecordPrior' variable if needed
      if (flowAsString.includes('$Record__Prior')) {
        const recordPriorVariable: FlowVariable = {
          name: 'RecordPrior',
          dataType: 'SObject',
          isCollection: false,
          isInput: true,
          isOutput: true,
          objectType: targetObject,
        };
        variables.push(recordPriorVariable);

        // Replace $Record__Prior variable in Flow by new RecordPrior variable
        flowAsString = flowAsString.replaceAll('$Record__Prior', 'RecordPrior');
      }

      // Converting $Record to 'Record' variable if needed
      if (flowAsString.includes('$Record')) {
        const recordVariable: FlowVariable = {
          name: 'Record',
          dataType: 'SObject',
          isCollection: false,
          isInput: true,
          isOutput: true,
          objectType: targetObject,
        };
        variables.push(recordVariable);

        // Replace $Record variable in Flow by new Record variable
        flowAsString = flowAsString.replaceAll('$Record', 'Record');
      }

      flowJson = JSON.parse(flowAsString) as FlowMetadataType;

      if (variables) {
        // Check if variables were already part of the existing metadata
        if (flowJson.Flow?.variables === undefined) {
          // No variables, just add them
          flowJson.Flow.variables = variables;
        } else if (Array.isArray(flowJson.Flow?.variables)) {
          // variables are already an array, just add the new values to it
          flowJson.Flow.variables = flowJson.Flow.variables.concat(variables);
        } else {
          // there was only one variable, put them all together in an array
          variables.push(flowJson.Flow?.variables);
          flowJson.Flow.variables = variables;
        }
      }

      // Deleting nodes not part of a subflow metadata
      delete flowJson.Flow?.start?.object;
      delete flowJson.Flow?.start?.recordTriggerType;
      delete flowJson.Flow?.start?.triggerType;

      if (flowJson.Flow?.start?.filterFormula || flowJson.Flow?.start?.filters) {
        delete flowJson.Flow?.start?.filterFormula;
        delete flowJson.Flow?.start?.filters;

        this.warn(messages.getMessage('warning.filters'));
      }

      if (flowJson.Flow?.start?.scheduledPaths) {
        throw new SfError(messages.getMessage('error.no-scheduled-paths'));
      }

      // Writing the new flow;
      const builder = new XMLBuilder(xmlParserBuilderOptions);
      const flowXml = builder.build(flowJson) as string;

      if (flags['save-to-file-name']) {
        const newFlowName = flags['save-to-file-name'].endsWith('.flow-meta.xml')
          ? flags['save-to-file-name']
          : `${flags['save-to-file-name']}.flow-meta.xml`;
        savedFlowPath = path.join(flowFolderPath, newFlowName);
      } else {
        savedFlowPath = flowPath;
      }

      fs.writeFileSync(savedFlowPath, flowXml, 'utf8');
    } else {
      this.warn(`Flow ${flowPath} doesn't exist`);
    }

    this.log(`Flow converted at ${savedFlowPath}`);

    return {
      convertedFlowPath: savedFlowPath,
    };
  }
}
