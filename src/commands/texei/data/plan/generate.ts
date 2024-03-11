import { promises as fs } from 'node:fs';
import * as path from 'node:path';
import { SfCommand, Flags } from '@salesforce/sf-plugins-core';
import { Messages, SfError } from '@salesforce/core';

const dataPlanFilename = 'data-plan.json';

// Initialize Messages with the current plugin directory
Messages.importMessagesDirectory(__dirname);

// Load the specific messages for this file. Messages from @salesforce/command, @salesforce/core,
// or any library that is using the messages framework can also be loaded this way.
const messages = Messages.loadMessages('texei-sfdx-plugin', 'data.plan.generate');

export type GenerateResult = {
  message: string;
};

export default class Generate extends SfCommand<GenerateResult> {
  public static readonly summary = messages.getMessage('summary');

  public static readonly examples = [
    '$ sf texei data plan generate --objects Account,Contact,MyCustomObject__c --outputdir ./data',
  ];

  public static readonly flags = {
    outputdir: Flags.string({ char: 'd', summary: messages.getMessage('flags.outputdir.summary'), required: true }),
    objects: Flags.string({ char: 's', summary: messages.getMessage('flags.objects.summary'), required: true }),
  };

  public async run(): Promise<GenerateResult> {
    const { flags } = await this.parse(Generate);

    const dataPlan: DataPlan = {
      excludedFields: [],
      lookupOverride: {},
      sObjects: [],
    };

    // Read objects list from flag, mapping to data plan format
    for (const objectName of flags.objects.split(',')) {
      dataPlan.sObjects.push({
        name: objectName,
        label: '',
        filters: '',
        orderBy: '',
        externalId: '',
        excludedFields: [],
      });
    }

    // Save file
    let filePath = dataPlanFilename;
    if (flags.outputdir) {
      filePath = path.join(flags.outputdir, dataPlanFilename);
    }

    const saveToPath = path.join(process.cwd(), filePath);

    await fs.writeFile(saveToPath, JSON.stringify(dataPlan, null, 2), 'utf8').catch((err: string) => {
      throw new SfError(`Unable to write file at path ${saveToPath}: ${err}`);
    });

    this.log('Data plan generated.');

    return { message: 'Data plan generated' };
  }
}
