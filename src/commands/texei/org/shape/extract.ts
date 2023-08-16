/* eslint-disable no-prototype-builtins */
/* eslint-disable prefer-arrow-callback */
/* eslint-disable @typescript-eslint/no-unsafe-member-access */
/* eslint-disable @typescript-eslint/no-unsafe-call */
/* eslint-disable @typescript-eslint/restrict-template-expressions */
/* eslint-disable @typescript-eslint/restrict-plus-operands */
/* eslint-disable @typescript-eslint/no-unsafe-argument */
/* eslint-disable class-methods-use-this */
/* eslint-disable @typescript-eslint/await-thenable */
/* eslint-disable @typescript-eslint/no-unsafe-assignment */
/* eslint-disable @typescript-eslint/explicit-function-return-type */
/* eslint-disable @typescript-eslint/no-explicit-any */
import * as path from 'path';
import * as fs from 'fs';
import {
  SfCommand,
  Flags,
  orgApiVersionFlagWithDeprecations,
  requiredOrgFlagWithDeprecations,
} from '@salesforce/sf-plugins-core';
import { Messages, SfError } from '@salesforce/core';
import { toTitleCase } from '../../../../shared/utils';

// Initialize Messages with the current plugin directory
Messages.importMessagesDirectory(__dirname);

// Load the specific messages for this file. Messages from @salesforce/command, @salesforce/core,
// or any library that is using the messages framework can also be loaded this way.
const messages = Messages.loadMessages('texei-sfdx-plugin', 'org.shape.extract');

export type OrgShapeExtractResult = {
  org: string;
  message: string;
};

const definitionFileName = 'project-scratch-def.json';
// TODO: Add bypassed values in the correct array, and after investigation either fix or update org-shape-extract.md doc
const settingValuesProdOnly = [
  'Packaging2',
  'ExpandedSourceTrackingPref',
  'ScratchOrgManagementPref',
  'ShapeExportPref',
  'PRMAccRelPref',
];

const settingValuesBugsRelated = [
  'enableOmniAutoLoginPrompt',
  'enableOmniSecondaryRoutingPriority',
  'VoiceCallListEnabled',
  'VoiceCallRecordingEnabled',
  'VoiceCoachingEnabled',
  'VoiceConferencingEnabled',
  'VoiceEnabled',
  'VoiceLocalPresenceEnabled',
  'VoiceMailDropEnabled',
  'VoiceMailEnabled',
  'CallDispositionEnabled',
];

const settingValuesBugsToInvestigate = [
  'enableEngagementHistoryDashboards',
  'EventLogWaveIntegEnabled',
  'SendThroughGmailPref',
  'PardotAppV1Enabled',
  'PardotEmbeddedAnalyticsPref',
  'PardotEnabled',
  'allowUsersToRelateMultipleContactsToTasksAndEvents',
  'socialCustomerServiceSettings',
  'opportunityFilterSettings',
  'enableAccountOwnerReport',
  'defaultCaseOwner',
  'PortalUserShareOnCase',
  'keepRecordTypeOnAssignmentRule',
  'webToCase',
  'routingAddresses',
];

// TODO: manage dependencies correctly: for instance, setting "enableCommunityWorkspaces" requires "features":["Communities"]
const featureDependencies = new Map<string, string>([['enableCommunityWorkspaces', 'Communities']]);

export default class Extract extends SfCommand<OrgShapeExtractResult> {
  public static readonly summary = messages.getMessage('summary');

  public static readonly examples = ['$ sf texei org shape extract --target-org bulma@capsulecorp.com'];

  public static readonly flags = {
    'target-org': requiredOrgFlagWithDeprecations,
    'api-version': orgApiVersionFlagWithDeprecations,
    outputdir: Flags.string({ char: 'd', summary: messages.getMessage('flags.outputdir.summary'), default: 'config' }),
    scope: Flags.string({
      char: 's',
      summary: messages.getMessage('flags.scope.summary'),
      options: ['basic', 'full', 'shaperepresentation'],
      default: 'basic',
    }),
  };

  public async run(): Promise<OrgShapeExtractResult> {
    const { flags } = await this.parse(Extract);

    this.warn(
      'This command is in beta, only extracting some settings. Read more at https://github.com/texei/texei-sfdx-plugin/blob/master/org-shape-command.md'
    );
    this.spinner.start('Extracting Org Shape', undefined, { stdout: true });

    // Query org for org infos
    const query = 'Select Name, Country, LanguageLocaleKey, OrganizationType from Organization';
    const conn = flags['target-org'].getConnection(flags['api-version']);
    const orgInfos = await conn.query(query);

    const featureList: any = [];
    const definitionValues: any = {};
    const definitionValuesTemp: any = {};
    definitionValuesTemp.settings = {};

    const settingValuesToIgnore =
      flags.scope === 'full'
        ? []
        : settingValuesProdOnly.concat(settingValuesBugsRelated).concat(settingValuesBugsToInvestigate);

    // Getting API Version
    // TODO: put this in a helper ? Is there a Core library method to get this OOTB ?
    let apiVersion = flags.apiversion;

    // if there is an api version set via the apiversion flag, use it
    // Otherwise use the latest api version available on the org
    if (!apiVersion) {
      apiVersion = await flags['target-org'].retrieveMaxApiVersion();
    }

    if (flags.scope === 'shaperepresentation') {
      const shapeQuery = "Select Edition, Features, Settings from ShapeRepresentation where Status = 'Active'";
      try {
        const shapeRepresentation = (await conn.query(shapeQuery)).records[0];

        // Construct the object with all values
        definitionValues.orgName = orgInfos.records[0].Name;
        if (shapeRepresentation.Edition) {
          definitionValues.edition = await toTitleCase(shapeRepresentation.Edition);
        }
        definitionValues.language = orgInfos.records[0].LanguageLocaleKey;
        if (shapeRepresentation.Features) {
          // Today this doesn't work because:
          // - Some values can't be set manually, ex: 250 Custom Apps whereas max allowed in scratch def file is 30
          // - Case isn't correct (even though this doesn't seem to prevent creation)
          definitionValues.features = shapeRepresentation.Features.split(';');
        }
        if (shapeRepresentation.Settings) {
          // Still some bugs/issues:
          // - "OrdersEnabled must be specified in the metadata" (enableOrders)
          // - Some Prod/DevHub specific values to remove: "enableScratchOrgManagementPref"

          // Removing unwanted settings
          const shapeSettings = JSON.parse(shapeRepresentation.Settings);
          delete shapeSettings.devHubSettings;
          definitionValues.settings = shapeSettings;
        }
      } catch (ex) {
        throw new SfError(
          'Unable to query ShapeRepresentation, make sure to target an org with Org Shape enabled and a shape created.'
        );
      }
    } else {
      // Querying Settings
      const settingPromises = [];
      const types = [{ type: 'Settings', folder: null }];
      // @ts-ignore: TODO: working code, but look at TS warning
      // eslint-disable-next-line prefer-arrow-callback
      await conn.metadata.list(types, apiVersion, function (err, metadata) {
        if (err) {
          // eslint-disable-next-line no-console
          return console.error('err', err);
        }

        for (const meta of metadata) {
          const settingType = meta.fullName + meta.type;

          // Querying settings details - Is there a way to do only 1 query with jsforce ?
          const settingPromise = conn.metadata.read(settingType, settingType);
          // @ts-ignore: TODO: working code, but look at TS warning
          settingPromises.push(settingPromise);
        }
      });

      // Waiting for all promises to resolve
      await Promise.all(settingPromises).then((settingValues) => {
        // TODO: Write these in the file. - Is everything part of the scratch definition file ? For instance Business Hours ?
        // Upper camel case --> lower camel case ; ex: OmniChannelSettings --> omniChannelSettings

        for (const setting of settingValues) {
          // TODO: manage dependencies on features

          // For whatever reason, this setting has not the same format as others
          // @ts-ignore: TODO: working code, but look at TS warning
          // eslint-disable-next-line eqeqeq
          if (setting.fullName == 'OrgPreferenceSettings') {
            // @ts-ignore: TODO: working code, but look at TS warning
            const settingsName = this.toLowerCamelCase(setting.fullName);
            // @ts-ignore: TODO: working code, but look at TS warning
            const settingsValues: any = {};
            // @ts-ignore: TODO: working code, but look at TS warning
            for (const subsetting of setting.preferences) {
              if (!settingValuesToIgnore.includes(subsetting.settingName)) {
                const settingName = this.toLowerCamelCase(subsetting.settingName);
                settingsValues[settingName] = subsetting.settingValue;

                // Checking if there is a feature dependency
                if (featureDependencies.has(settingName)) {
                  featureList.push(featureDependencies.get(settingName));
                }
              }
            }

            definitionValuesTemp.settings[settingsName] = settingsValues;
          }

          // FIXME: Lots of settings have errors (for instance linked to metadata)
          // TODO: Add to org-shape-command.md
          // ForecastingSettings
          // Error  shape/settings/Forecasting.settings  Forecasting  Cannot resolve Forecasting Type from name or attributes

          // searchSettings (Includes custom objects not there yet)
          // Error  shape/settings/Search.settings  Search  Entity is null or entity element's name is null

          // Territory2Settings
          // Error  shape/settings/Territory2.settings   Territory2   Not available for deploy for this organization

          // Error  shape/settings/Account.settings        Account        You cannot set a value for enableAccountOwnerReport unless your organization-wide sharing access level for Accounts is set to Private.

          // Error  shape/settings/Case.settings           Case           CaseSettings: There are no record types defined for Case.
          // Error  shape/settings/Case.settings  Case  CaseSettings: Specify the default case user.
          // Error  shape/settings/Case.settings  Case  In field: caseOwner - no Queue named myQueue found
          // Error  shape/settings/Case.settings  Case  WebToCaseSettings: Invalid caseOrigin Formulaire

          // Error  shape/settings/OrgPreference.settings  OrgPreference  You do not have sufficient rights to access the organization setting: PortalUserShareOnCase

          // TODO: Test all settings and add them to org-shape-command.md if it doesn't work
          const settingsToTest = [
            'AccountSettings',
            'ActivitiesSettings',
            'AddressSettings',
            'BusinessHoursSettings',
            'CaseSettings',
            'CommunitiesSettings',
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
            'SecuritySettings',
            'SocialCustomerServiceSettings',
          ];

          // @ts-ignore: TODO: working code, but look at TS warning
          if (setting.fullName !== undefined && (settingsToTest.includes(setting.fullName) || flags.scope === 'full')) {
            // @ts-ignore: TODO: working code, but look at TS warning
            const settingName = this.toLowerCamelCase(setting.fullName);
            if (!settingValuesToIgnore.includes(settingName)) {
              const formattedSetting = this.formatSetting(setting);

              // All this code to ignore values should be refactored in a better way, todo
              // eslint-disable-next-line guard-for-in
              for (const property in setting) {
                // Checking if there is a feature dependency
                if (featureDependencies.has(property)) {
                  featureList.push(featureDependencies.get(property));
                }

                // @ts-ignore: TODO: working code, but look at TS warning
                // eslint-disable-next-line no-prototype-builtins
                if (setting.hasOwnProperty(property) && settingValuesToIgnore.includes(property)) {
                  delete setting[property];
                }

                // TODO: Handle recursivity correctly
                for (const prop in setting[property]) {
                  if (
                    // @ts-ignore: TODO: working code, but look at TS warning
                    setting.hasOwnProperty(property) && // @ts-ignore: TODO: working code, but look at TS warning
                    setting[property].hasOwnProperty(prop) &&
                    settingValuesToIgnore.includes(prop)
                  ) {
                    delete setting[property][prop];
                  }
                }
              }

              definitionValuesTemp.settings[settingName] = formattedSetting;
            }
          }
        }

        // Construct the object with all values
        definitionValues.orgName = orgInfos.records[0].Name;
        definitionValues.edition = this.mapOrganizationTypeToScratchOrgEdition(orgInfos.records[0].OrganizationType);
        definitionValues.language = orgInfos.records[0].LanguageLocaleKey;

        // Adding features if needed
        if (featureList.length > 0) {
          definitionValues.features = featureList;
        }
        definitionValues.settings = definitionValuesTemp.settings;
      });
    }

    // If a path was specified, add it
    let filePath = definitionFileName;
    if (flags.outputdir) {
      filePath = path.join(flags.outputdir, definitionFileName);
    }

    // Write project-scratch-def.json file
    const saveToPath = path.join(process.cwd(), filePath);

    await fs.writeFile(
      saveToPath,
      this.removeQuotes(JSON.stringify(definitionValues, null, 2)),
      'utf8',
      function (err) {
        if (err) {
          throw new SfError(`Unable to write definition file at path ${process.cwd()}: ${err}`);
        }
      }
    );

    this.spinner.stop('Done.');

    // Everything went fine, return an object that will be used for --json
    return { org: flags['target-org'].getOrgId(), message: definitionValues };
  }

  private toLowerCamelCase(label) {
    // eslint-disable-next-line @typescript-eslint/no-unsafe-return
    return label.charAt(0).toLowerCase() + label.slice(1);
  }

  // Is there a better way to do this ?
  private removeQuotes(myJson) {
    myJson = myJson.replace(new RegExp('"true"', 'g'), true);
    myJson = myJson.replace(new RegExp('"false"', 'g'), false);
    // eslint-disable-next-line @typescript-eslint/no-unsafe-return
    return myJson;
  }

  private formatSetting(myJson) {
    this.toLowerCamelCase(myJson.fullName);
    delete myJson.fullName;

    // eslint-disable-next-line @typescript-eslint/no-unsafe-return
    return myJson;
  }

  /**
   * This maps organization types to one of the 4 available scratch org editions with the fallback of "Developer".
   * Sources:
   * [Way to identify Salesforce edition using API?](https://salesforce.stackexchange.com/questions/216/way-to-identify-salesforce-edition-using-api)
   * [Salesforce Editions That Are No Longer Sold](https://help.salesforce.com/articleView?id=overview_other_editions.htm&type=5)
   * [Scratch Org Definition Configuration Values](https://developer.salesforce.com/docs/atlas.en-us.sfdx_dev.meta/sfdx_dev/sfdx_dev_scratch_orgs_def_file_config_values.htm)
   *
   * @param organizationType
   */
  private mapOrganizationTypeToScratchOrgEdition(organizationType) {
    // possible organization types as of v47.0:
    // ["Team Edition","Professional Edition","Enterprise Edition","Developer Edition","Personal Edition","Unlimited Edition","Contact Manager Edition","Base Edition"]
    // Base Edition: https://twitter.com/EvilN8/status/430810563044601856
    if (['Team Edition', 'Personal Edition', 'Base Edition'].includes(organizationType)) {
      return 'Group';
    }
    if (['Contact Manager Edition'].includes(organizationType)) {
      return 'Professional';
    }
    if (['Unlimited Edition'].includes(organizationType)) {
      return 'Enterprise';
    }
    const sanitizedOrganizationType = organizationType.replace(' Edition', '');
    if (['Group', 'Professional', 'Enterprise', 'Developer'].includes(sanitizedOrganizationType)) {
      // eslint-disable-next-line @typescript-eslint/no-unsafe-return
      return sanitizedOrganizationType;
    }
    return 'Developer';
  }
}
