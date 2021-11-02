import { flags, SfdxCommand } from '@salesforce/command';
import { Messages, SfdxError } from '@salesforce/core';
import { AnyJson } from '@salesforce/ts-types';
import * as fs from 'fs';
import * as path from 'path';

const dataPlanFilename = 'data-plan.json';

// Initialize Messages with the current plugin directory
Messages.importMessagesDirectory(__dirname);

// Load the specific messages for this file. Messages from @salesforce/command, @salesforce/core,
// or any library that is using the messages framework can also be loaded this way.
const messages = Messages.loadMessages('texei-sfdx-plugin', 'data-plan-generate');

export default class Generate extends SfdxCommand {

  public static description = messages.getMessage('commandDescription');

  public static examples = [
  `$ sfdx texei:data:plan:generate --objects Account,Contact,MyCustomObject__c --outputdir ./data`
  ];

  protected static flagsConfig = {
    outputdir: flags.string({char: 'd', description: messages.getMessage('outputdirFlagDescription'), required: true}),
    objects: flags.string({char: 'o', description: messages.getMessage('objectsFlagDescription'), required: true})
  };

  // Comment this out if your command does not require an org username
  protected static requiresUsername = false;

  // Comment this out if your command does not support a hub org username
  protected static requiresDevhubUsername = false;

  // Set this to true if your command requires a project workspace; 'requiresProject' is false by default
  protected static requiresProject = false;

  public async run(): Promise<AnyJson> {

    let dataPlan: DataPlan = {
      excludedFields: [],
      sObjects: []
    };

    // Read objects list from flag, mapping to data plan format
    for (const objectName of this.flags.objects.split(',')) {
      dataPlan.sObjects.push({
          name: objectName,
          label: "",
          filters: "",
          orderBy: "",
          externalId: "",
          excludedFields: []
      });
    }

    // Save file
    let filePath = dataPlanFilename;
    if (this.flags.outputdir) {
      filePath = path.join(
        this.flags.outputdir,
        dataPlanFilename
      );
    }
    
    const saveToPath = path.join(
      process.cwd(),
      filePath
    );

    await fs.writeFile(saveToPath, JSON.stringify(dataPlan, null, 2), 'utf8', function (err) {
      if (err) {
        throw new SfdxError(`Unable to write file at path ${saveToPath}: ${err}`);
      }
    });

    this.ux.log(`Data plan generated.`);

    return { message: 'Data plan generated' };
  }
}