import { SfCommand, Flags } from '@salesforce/sf-plugins-core';
import { Messages, SfError } from '@salesforce/core';
import { Connection } from 'jsforce';
import { AnyJson } from '@salesforce/ts-types';
import { permissionSetNodes, nodesHavingDefault, removeAllProfileAccess } from '../../../shared/skinnyProfileHelper';
import { Profile, ProfileTabVisibility } from '../skinnyprofile/MetadataTypes';

Messages.importMessagesDirectory(__dirname);
const messages = Messages.loadMessages('texei-sfdx-plugin', 'profile.empty');

export type ProfileEmptyResult = {
  commandResult: string;
  emptiedProfile: string;
};

export interface TabDefinitionRecord {
  Name: string;
}

export default class Empty extends SfCommand<ProfileEmptyResult> {
  public static readonly summary = messages.getMessage('summary');
  public static readonly description = messages.getMessage('description');
  public static readonly examples = messages.getMessages('examples');

  public static readonly flags = {
    'target-org': Flags.requiredOrg(),
    'api-version': Flags.orgApiVersion(),
    'profile-name': Flags.string({
      char: 'n',
      required: true,
      summary: messages.getMessage('flags.profile-name.summary'),
    }),
    'no-prompt': Flags.boolean({ char: 'p', summary: messages.getMessage('flags.no-prompt.summary'), required: false }),
  };

  private connection: Connection;

  public async run(): Promise<ProfileEmptyResult> {
    this.warn(messages.getMessage('warning'));

    const { flags } = await this.parse(Empty);

    // Create a connection to the org
    this.connection = flags['target-org']?.getConnection(flags['api-version']) as Connection;

    let commandResult = '';

    this.spinner.start('Retrieving Profile information');

    // Getting Tabs to filter and avoid "You can't edit tab settings for LandingPage, as it's not a valid tab"
    // Some tabs are retrieved as visible by the Metadata Read call but are returned as invalid when deployed
    // Looking at all tabs from 'Minimum Access - Salesforce' to see which tabs are hidden
    // Couldn't find other way to know which tabs are valid, like querying tooling API or using describeTabs from SOAP API doesn't work
    const existingTabs: Set<string> = new Set<string>();
    const tabSetResult: TabDefinitionRecord[] = (await this.connection.tooling.query('Select Name from TabDefinition'))
      .records as TabDefinitionRecord[];
    tabSetResult.forEach((item) => existingTabs.add(item.Name));

    const profiles: Profile[] = (await this.connection?.metadata.read('Profile', [
      flags['profile-name'],
    ])) as unknown as Profile[];

    if (profiles.length === 0 || profiles[0].fullName === '' || profiles[0].fullName === undefined) {
      throw new SfError(`No Profile named ${flags['profile-name']} found in target org`);
    }
    this.spinner.stop();

    const profileMetadata: Profile = profiles[0];

    this.spinner.start('Cleaning Profile');
    for (const nodeKey in profileMetadata) {
      if (Object.prototype.hasOwnProperty.call(profileMetadata, nodeKey)) {
        if (permissionSetNodes.includes(nodeKey) || nodesHavingDefault.includes(nodeKey)) {
          // @ts-ignore
          // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
          for (let i = profileMetadata[nodeKey]?.length - 1; i >= 0; i--) {
            // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment, @typescript-eslint/no-unsafe-member-access
            const subNodeKey = profileMetadata[nodeKey][i];
            if (nodeKey === 'tabVisibilities' && !existingTabs.has((subNodeKey as ProfileTabVisibility).tab)) {
              // @ts-ignore
              delete profileMetadata[nodeKey][i];
            } else {
              removeAllProfileAccess(nodeKey, subNodeKey as AnyJson, profileMetadata['userLicense']);
            }
          }
        }
      }
    }
    this.spinner.stop();

    // Deploying to org
    this.spinner.start(`Deploying Profile: ${profileMetadata.fullName}`);
    const deployResult = await this.connection.metadata.upsert('Profile', [profileMetadata]);

    if (!deployResult[0].success && deployResult[0]?.errors?.length > 0) {
      let errorMessage = '';
      for (const error of deployResult[0].errors) {
        errorMessage += error.message + '\n';
      }

      throw new SfError(errorMessage);
    } else if (deployResult[0].success) {
      commandResult = `Profile ${profileMetadata.fullName} was successfully emptied`;
    }
    this.spinner.stop();

    this.log(`\n${commandResult}`);

    commandResult = 'Done';

    const finalResult: ProfileEmptyResult = {
      commandResult,
      emptiedProfile: flags['profile-name'],
    };

    return finalResult;
  }
}
