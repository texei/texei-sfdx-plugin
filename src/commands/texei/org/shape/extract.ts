import { core, SfdxCommand, flags } from '@salesforce/command';
import * as fs from 'fs';
import * as path from 'path';

// Initialize Messages with the current plugin directory
core.Messages.importMessagesDirectory(__dirname);

// Load the specific messages for this file. Messages from @salesforce/command, @salesforce/core,
// or any library that is using the messages framework can also be loaded this way.
const messages = core.Messages.loadMessages('texei-sfdx-plugin', 'extract');

const definitionFileName  = 'project-scratch-def.json';

export default class Extract extends SfdxCommand {

  public static description = messages.getMessage('commandDescription');

  public static examples = [
    `$ sfdx texei:org:shape:extract -u myOrg@example.com -d myFolder" \nSuccessfully extracted Org Shape.\n`
  ];

  protected static flagsConfig = {
    outputdir: flags.string({ char: 'd', description: messages.getMessage('directoryFlagDescription') })
  };

  // Comment this out if your command does not require an org username
  protected static requiresUsername = true;

  // Comment this out if your command does not support a hub org username
  protected static requiresDevhubUsername = false;

  // Set this to true if your command requires a project workspace; 'requiresProject' is false by default
  protected static requiresProject = false;

  public async run(): Promise<any> {

    const values = this.flags.values;

    // this.org is guaranteed because requiresUsername=true, as opposed to supportsUsername
    const userName = this.org.getUsername();

    // Query org for org infos
    const query = 'Select Name, Country, LanguageLocaleKey, OrganizationType from Organization';
    const conn = this.org.getConnection();
    const orgInfos = await conn.query(query) as any;

    //console.log(orgInfos);
    let definitionValues: any = {};
    definitionValues.orgName = orgInfos.records[0].Name;
    definitionValues.language = orgInfos.records[0].LanguageLocaleKey;

    /*
    // TODO: find a way to get all these values
    "orgName": "Texeï",
    "edition": "Enterprise",
    "country": "FR",
    "language": "fr_FR"

    "Name": "TEXEÏ SAS",
    "Country": "France",
    "LanguageLocaleKey": "en_US",
    "OrganizationType": "Enterprise Edition"
    */

    // Getting API Version
    // TODO: put this in a helper ? Is there a Core library method to get this OOTB ?
    let apiVersion = this.flags.apiversion;

    // if there is an api version set via the apiversion flag, use it
    // Otherwise use the latest api version available on the org
    if (!apiVersion) {
      apiVersion = await this.org.retrieveMaxApiVersion();
    }

    // Querying Settings
    const settingPromises = [];
    var types = [{type: 'Settings', folder: null}];
    await conn.metadata.list(types, apiVersion, function(err, metadata) {
      if (err) { return console.error('err', err); }

        for (let meta of metadata) {
          const settingType = meta.fullName+meta.type;
          console.log('METADATA TYPE: ' + settingType);

          // Querying settings details - Is there a way to do only 1 query with jsforce ?
          const settingPromise = conn.metadata.read(settingType, settingType);
          settingPromises.push(settingPromise);
        }
    });

    // Waiting for all promises to resolve
    await Promise.all(settingPromises).then((settingValues) => {
      // TODO: Write these in the file. - Is everything part of the scratch definition file ? For instance Business Hours ?
      // Upper camel case --> lower camel case ; ex: OmniChannelSettings --> omniChannelSettings
      console.log('Promises resolved');
      console.log(settingValues);
    });

    // Write project-scratch-def.json file
    const saveToPath = path.join(
      process.cwd(),
      definitionFileName
    );

    await fs.writeFile(saveToPath, JSON.stringify(definitionValues, null, 2), 'utf8', function (err) {
      if (err) {
          throw new core.SfdxError(`Unable to write definition file at path ${process.cwd()}: ${err}`);
      }
    });
    this.ux.log(`Definition file saved!`);

    // Everything went fine, return an object that will be used for --json
    return { org: this.org.getOrgId(), message: orgInfos };
  }
}
