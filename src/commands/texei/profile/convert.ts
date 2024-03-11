import { SfCommand, Flags } from '@salesforce/sf-plugins-core';
import { Messages, SfError } from '@salesforce/core';
import { Connection } from 'jsforce';
import { AnyJson } from '@salesforce/ts-types';
import {
  permissionSetNodes,
  commonProfilePermissionSetNodes,
  nodesHavingDefault,
  profileNodesToPermissionSetNodes,
  profileTabVisibiltyToPermissionSetTabVisibility,
} from '../../../shared/skinnyProfileHelper';
import { toApiName } from '../../../shared/utils';
import { Profile, PermissionSetMetadataType, PermissionSetTabVisibility } from '../skinnyprofile/MetadataTypes';

Messages.importMessagesDirectory(__dirname);
const messages = Messages.loadMessages('texei-sfdx-plugin', 'profile.convert');

export type ProfileConvertResult = {
  commandResult: string;
  permissionSet: {
    label: string;
    apiName: string;
    createdOrUpdated: string;
  };
};

export default class Convert extends SfCommand<ProfileConvertResult> {
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
    'override-name': Flags.string({
      char: 'r',
      required: false,
      summary: messages.getMessage('flags.override-name.summary'),
    }),
    'override-api-name': Flags.string({
      char: 'a',
      required: false,
      summary: messages.getMessage('flags.override-api-name.summary'),
    }),
  };

  private connection: Connection;

  // eslint-disable-next-line complexity
  public async run(): Promise<ProfileConvertResult> {
    this.warn(messages.getMessage('warning'));

    const { flags } = await this.parse(Convert);
    const permissionSetName = flags['override-name'] ? flags['override-name'] : flags['profile-name'];
    const apiName = flags['override-api-name'] ? flags['override-api-name'] : toApiName(permissionSetName);

    // Create a connection to the org
    this.connection = flags['target-org']?.getConnection(flags['api-version']) as Connection;

    let commandResult = '';

    this.spinner.start('Retrieving Profile information');
    const profiles: Profile[] = (await this.connection?.metadata.read('Profile', [
      flags['profile-name'],
    ])) as unknown as Profile[];

    if (profiles.length === 0 || profiles[0].fullName === '' || profiles[0].fullName === undefined) {
      throw new SfError(`No Profile named ${flags['profile-name']} found in target org`);
    }
    this.spinner.stop();

    const profileMetadata: Profile = profiles[0];

    const permissionSetMetadata: PermissionSetMetadataType = {
      hasActivationRequired: false,
      label: '',
      fullName: apiName,
    };

    this.spinner.start('Converting Profile to Permission Set');
    for (const nodeKey in profileMetadata) {
      if (Object.prototype.hasOwnProperty.call(profileMetadata, nodeKey)) {
        if (nodesHavingDefault.includes(nodeKey)) {
          // Keep the node but delete the 'default' attribute of this property (like recordTypeVisibilities) as there is no default on Permission Set
          permissionSetMetadata[nodeKey] = profileMetadata[nodeKey] as AnyJson;
          for (const subNodeKey of permissionSetMetadata[nodeKey]) {
            // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
            delete subNodeKey.default;
            // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
            delete subNodeKey.personAccountDefault;
          }
        } else if (profileNodesToPermissionSetNodes.has(nodeKey)) {
          // rename some tags, for instance fullName tag is named label on Permission Set
          const permissionSetNodeName = profileNodesToPermissionSetNodes.get(nodeKey) as string;
          // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
          permissionSetMetadata[permissionSetNodeName] = profileMetadata[nodeKey] as AnyJson;

          // Tab Visibility values are different between Profile and Permission Set
          if (nodeKey === 'tabVisibilities') {
            for (const subNodeKey of permissionSetMetadata[permissionSetNodeName]) {
              const tabSetting: PermissionSetTabVisibility = subNodeKey as PermissionSetTabVisibility;
              tabSetting.visibility = profileTabVisibiltyToPermissionSetTabVisibility.get(
                tabSetting.visibility
              ) as string;
            }
          }
        } else if (permissionSetNodes.includes(nodeKey) || commonProfilePermissionSetNodes.includes(nodeKey)) {
          // These nodes should be on Permission Set, add them
          permissionSetMetadata[nodeKey] = profileMetadata[nodeKey] as AnyJson;
        }
      }
    }

    // Override label if flag is used
    if (flags['override-name']) {
      permissionSetMetadata.label = permissionSetName;
    }
    this.spinner.stop();

    // Deploying to org
    this.spinner.start(
      `Deploying Permission Set - Label: ${permissionSetMetadata.label} - API Name: ${permissionSetMetadata.fullName}`
    );
    const deployResult = await this.connection.metadata.upsert('PermissionSet', [permissionSetMetadata]);

    let isCreatedOrUpdated = '';

    if (!deployResult[0].success && deployResult[0]?.errors?.length > 0) {
      let errorMessage = '';
      for (const error of deployResult[0].errors) {
        errorMessage += error.message + '\n';
      }

      throw new SfError(errorMessage);
    } else if (deployResult[0].success) {
      // Dummy update of Permission Set record because Metadata API doesn't track changes for Source Tracking.
      // Is there a better way to do this ?
      try {
        await this.connection
          .sobject('PermissionSet')
          .find({ Name: permissionSetMetadata.fullName })
          .update({ label: permissionSetMetadata.label });
      } catch (e) {
        // Just display a warning because Permission Set is created, only Source Tracking won't work
        this.debug(e);
        this.warn(
          `Could not set Source Tracking for Permission Set ${permissionSetMetadata.label}, retrieve it manually`
        );
      }

      isCreatedOrUpdated = deployResult[0].created ? 'created' : 'updated';
      commandResult = `Permission Set ${permissionSetMetadata.label} (API Name: ${permissionSetMetadata.fullName}) was successfully ${isCreatedOrUpdated} in target org`;
    }
    this.spinner.stop();

    this.log(`\n${commandResult}`);

    const finalResult: ProfileConvertResult = {
      commandResult,
      permissionSet: {
        label: permissionSetMetadata.label,
        apiName: permissionSetMetadata.fullName as string,
        createdOrUpdated: isCreatedOrUpdated,
      },
    };

    return finalResult;
  }
}
