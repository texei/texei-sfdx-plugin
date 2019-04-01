import { core, SfdxCommand, flags } from '@salesforce/command';
import * as fs from 'fs';
import * as path from 'path';

// Initialize Messages with the current plugin directory
core.Messages.importMessagesDirectory(__dirname);

// Load the specific messages for this file. Messages from @salesforce/command, @salesforce/core,
// or any library that is using the messages framework can also be loaded this way.
const messages = core.Messages.loadMessages('texei-sfdx-plugin', 'extract');

const definitionFileName  = 'project-scratch-def.json';
const settingValuesToIgnore =['Packaging2','ExpandedSourceTrackingPref','ScratchOrgManagementPref','ShapeExportPref',
                              'PRMAccRelPref','allowUsersToRelateMultipleContactsToTasksAndEvents','socialCustomerServiceSettings',
                              'opportunityFilterSettings'];

// TODO: manage dependencies correctly: for instance, setting "networksEnabled" requires "features":["Communities"]
const featureDependencies = new Map<string, String>([['networksEnabled','Communities']]);

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

    // Query org for org infos
    const query = 'Select Name, Country, LanguageLocaleKey, OrganizationType from Organization';
    const conn = this.org.getConnection();
    const orgInfos = await conn.query(query) as any;

    let featureList: any = [];
    let definitionValues: any = {};
    let definitionValuesTemp: any = {};
    definitionValuesTemp.settings = {};

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

          // Querying settings details - Is there a way to do only 1 query with jsforce ?
          const settingPromise = conn.metadata.read(settingType, settingType);
          settingPromises.push(settingPromise);
        }
    });

    // Waiting for all promises to resolve
    await Promise.all(settingPromises).then((settingValues) => {
      // TODO: Write these in the file. - Is everything part of the scratch definition file ? For instance Business Hours ?
      // Upper camel case --> lower camel case ; ex: OmniChannelSettings --> omniChannelSettings

      for (const setting of settingValues) {
        // TODO: hardcoding an easy one to start, let's do one with a deeper hierarchy after
        // TODO: beware of settings like security and IP ranges ?
        // TODO: manage dependencies on features
        //console.log(featureDependencies.get('networksEnabled'));

        // For whatever reason, this setting has not the same format as others
        if (setting.fullName == 'OrgPreferenceSettings') {

          const settingsName = this.toLowerCamelCase(setting.fullName);
          let settingValues: any = {};
          for (const subsetting of setting.preferences) {

            if (!settingValuesToIgnore.includes(subsetting.settingName)) {

              const settingName = this.toLowerCamelCase(subsetting.settingName);
              settingValues[settingName] = subsetting.settingValue;

              // Checking if there is a feature dependency
              if (featureDependencies.has(settingName)) {
                featureList.push(featureDependencies.get(settingName));
              }
            }
          }

          definitionValuesTemp.settings[settingsName] = settingValues;
        }

        // TODO: some other settings to test
        const settingsToTest = ['AccountSettings',
                                'ActivitiesSettings',
                                'AddressSettings',
                                'BusinessHoursSettings',
                                'CaseSettings',
                                'CompanySettings',
                                'ContractSettings',
                                'EntitlementSettings',
                                'FileUploadAndDownloadSecuritySettings',
                                'IdeasSettings',
                                'MacroSettings',
                                'MobileSettings',
                                'NameSettings',
                                'OmniChannelSettings',
                                'OpportunitySettings',
                                'OrderSettings',
                                'PathAssistantSettings',
                                'ProductSettings',
                                'QuoteSettings',
                                'SearchSettings',
                                'SecuritySettings',
                                'SocialCustomerServiceSettings',
                                'Territory2Settings',
                                'OrgPreferenceSettings'];
        // ForecastingSettings

        const settingsToTest2 = ['AccountSettings',
                                 'ActivitiesSettings',
                                 'BusinessHoursSettings',
                                 'CaseSettings',
                                 'CompanySettings',
                                 'ContractSettings',
                                 'EntitlementSettings',
                                 'FileUploadAndDownloadSecuritySettings',
                                 'IdeasSettings',
                                 'MacroSettings',
                                 'MobileSettings',
                                 'NameSettings',
                                 'OmniChannelSettings',
                                 'OpportunitySettings',
                                 'OrderSettings',
                                 'PathAssistantSettings',
                                 'ProductSettings',
                                 'QuoteSettings',
                                 'SearchSettings',
                                 'SecuritySettings',
                                 'SocialCustomerServiceSettings'];

        if (settingsToTest2.includes(setting.fullName)) {

          const settingName = this.toLowerCamelCase(setting.fullName);
          if (!settingValuesToIgnore.includes(settingName)) {
            const formattedSetting = this.formatSetting(setting);

            // All this code to ignore values should be refactored in a better way, todo
            for (var property in setting) {
              if (setting.hasOwnProperty(property) && settingValuesToIgnore.includes(property)) {
                delete setting[property];
              }
            }

            definitionValuesTemp.settings[settingName] = formattedSetting;
          }
        }
      }

      // Construct the object with all values
      definitionValues.orgName = orgInfos.records[0].Name;
      definitionValues.edition = 'Developer';
      definitionValues.language = orgInfos.records[0].LanguageLocaleKey;
      // Adding features if needed
      if (featureList.length > 0) {
        definitionValues.features = featureList;
      }
      definitionValues.settings = definitionValuesTemp.settings;
    });

    // Write project-scratch-def.json file
    const saveToPath = path.join(
      process.cwd(),
      definitionFileName
    );

    await fs.writeFile(saveToPath, this.removeQuotes(JSON.stringify(definitionValues, null, 2)), 'utf8', function (err) {
      if (err) {
          throw new core.SfdxError(`Unable to write definition file at path ${process.cwd()}: ${err}`);
      }
    });
    this.ux.log(`Definition file saved!`);

    // Everything went fine, return an object that will be used for --json
    return { org: this.org.getOrgId(), message: definitionValues };
  }

  private toLowerCamelCase(label) {
    return label.charAt(0).toLowerCase() + label.slice(1);
  }

  // Is there a better way to do this ?
  private removeQuotes(myJson) {
    myJson = myJson.replace(new RegExp('"true"', 'g'), true);
    myJson = myJson.replace(new RegExp('"false"', 'g'), false);
    return myJson;
  }

  private formatSetting(myJson) {

    const settingName = this.toLowerCamelCase(myJson.fullName);
    delete myJson.fullName;

    return myJson;
  }
}
