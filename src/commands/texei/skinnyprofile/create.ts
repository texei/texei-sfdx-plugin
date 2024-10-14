import * as fs from 'node:fs';
import * as path from 'node:path';
import { SfCommand, Flags } from '@salesforce/sf-plugins-core';
import { Messages, SfError } from '@salesforce/core';
import { XMLParser } from 'fast-xml-parser';
import { Record } from 'jsforce';
import { Connection } from '@salesforce/core';
import { Error } from 'jsforce/lib/api/soap/schema.js';
import { getDefaultPackagePath, getProfilesInPath } from '../../../shared/sfdxProjectFolder.js';
import { ProfileMetadataType, PermissionSetRecord } from './MetadataTypes.js';

Messages.importMessagesDirectoryFromMetaUrl(import.meta.url);
const messages = Messages.loadMessages('texei-sfdx-plugin', 'skinnyprofile.create');

export type SkinnyprofileCreateResult = {
  commandResult: string;
  profilesCreated: string[];
  profilesStandardSkipped: string[];
  profilesAlreadyInOrg: string[];
  profilesWithError: profileWithError[];
};

export type profileWithError = {
  name: string;
  errors: Error[];
};

export default class Create extends SfCommand<SkinnyprofileCreateResult> {
  // Minimum Access - Salesforce
  public static readonly summary = messages.getMessage('summary');
  public static readonly description = messages.getMessage('description');
  public static readonly examples = messages.getMessages('examples');

  public static readonly flags = {
    'target-org': Flags.requiredOrg(),
    'api-version': Flags.orgApiVersion(),
    path: Flags.string({ char: 'p', required: false, summary: messages.getMessage('flags.path.summary') }),
    ignoreerrors: Flags.boolean({ char: 'i', summary: messages.getMessage('flags.ignoreerrors.summary') }),
  };

  private connection: Connection;

  public async run(): Promise<SkinnyprofileCreateResult> {
    const noProfile = 'No Profile found';
    const noProfileFolder = 'No profiles folder found';
    const profileSucceed = 'Creation succeeded';
    const profileFailed = 'Some Profiles creation failed, beware that some profiles may have been created anyway';

    const { flags } = await this.parse(Create);
    const parser = new XMLParser();

    // Create a connection to the org
    this.connection = flags['target-org']?.getConnection(flags['api-version']);

    let profilesInPath: string[] = [];
    const profilesCreated: string[] = [];
    const profilesStandardSkipped: string[] = [];
    const profilesAlreadyInOrg: string[] = [];
    const profilesWithError: profileWithError[] = [];

    const profileMetadata: Record[] = [];
    let commandResult = '';

    // Get profiles files path
    const profilePath = flags.path ? flags.path : path.join(await getDefaultPackagePath(), 'profiles');

    if (fs.existsSync(profilePath)) {
      // There is a profiles folder
      profilesInPath = getProfilesInPath(profilePath, false);

      if (profilesInPath === undefined || profilesInPath.length === 0) {
        commandResult = noProfile;
      } else {
        // Get existing custom profiles in target org
        // Profile can be queried via PermissionSet, only way to find if a Profile is Custom ?
        // https://salesforce.stackexchange.com/questions/38447/determine-custom-profile
        const existingCustomProfiles = (
          (
            await this.connection.query(
              'SELECT Profile.Name FROM PermissionSet Where IsCustom = true AND ProfileId != null'
            )
          ).records as PermissionSetRecord[]
        ).map((record) => record.Profile.Name);

        // Get User Licenses Ids from target org
        const userLicensesMap = await this.getUserLicensesMap();

        for (const profile of profilesInPath) {
          // Generate path
          const filePath = path.join(process.cwd(), profilePath, profile);

          // Read data file
          const data = fs.readFileSync(filePath, 'utf8');

          // Parsing file
          const profileJson: ProfileMetadataType = parser.parse(data) as ProfileMetadataType;

          const profileName = profile.replace('.profile-meta.xml', '');

          if (profileJson.Profile.custom) {
            if (existingCustomProfiles.includes(profileName)) {
              // Profile is custom but already exists, don't create it
              profilesAlreadyInOrg.push(profileName);
            } else {
              const userLicense = userLicensesMap.get(profileJson.Profile.userLicense);

              if (userLicense === undefined) {
                // User License not found in org
                profilesWithError.push({
                  name: profileName,
                  errors: [
                    {
                      message: `userLicense '${profileJson.Profile.userLicense}' does not exist in target org`,
                      statusCode: 'USER_LICENSE_NOT_IN_ORG',
                    },
                  ],
                });
              } else {
                profileMetadata.push({
                  Name: profileName,
                  UserLicenseId: userLicense,
                  type: 'Profile',
                });
              }
            }
          } else {
            // It's a standard Profile, don't create it
            profilesStandardSkipped.push(profileName);
          }
        }
      }

      if (profileMetadata.length > 0) {
        const results = await this.connection?.soap.create(profileMetadata);

        for (let i = 0; i < results.length; i++) {
          const profile = profileMetadata[i];
          const result = results[i];
          if (result.success) {
            profilesCreated.push(profile.Name as string);
          } else {
            profilesWithError.push({
              name: profile.Name as string,
              errors: result.errors,
            });
          }
        }
      }
    } else {
      commandResult = noProfileFolder;
    }

    if (commandResult === noProfile || commandResult === noProfileFolder) {
      this.log(commandResult);
    } else {
      commandResult = profilesWithError.length > 0 ? profileFailed : profileSucceed;

      this.log(`>> Profiles created:\n ${profilesCreated.join('\n ')}\n`);
      this.log(`>> Standard Profiles (skipped):\n ${profilesStandardSkipped.join('\n ')}\n`);
      this.log(`>> Profiles already in target org (skipped):\n ${profilesAlreadyInOrg.join('\n ')}\n`);
      this.log(
        `>> Profiles with errors:\n ${profilesWithError
          .map(
            (profileWithError) =>
              `${profileWithError.name}:\n${profileWithError.errors
                .map(
                  (error) =>
                    `  ${error.statusCode} - ${error.message}${error.fields ? ' - ' + error.fields.join(',') : ''}`
                )
                .join('\n')}`
          )
          .join('\n ')}\n`
      );
    }

    const finalResult: SkinnyprofileCreateResult = {
      commandResult,
      profilesCreated,
      profilesStandardSkipped,
      profilesAlreadyInOrg,
      profilesWithError,
    };

    if (profilesWithError?.length > 0 && !flags['ignoreerrors']) {
      const finalError = new SfError(profileFailed);
      finalError.setData(finalResult);
      throw finalError;
    }

    return finalResult;
  }

  private async getUserLicensesMap(): Promise<Map<string, string>> {
    const userLicenses = await this.connection.query('SELECT Id, Name FROM UserLicense');
    const userLicensesMap = new Map(userLicenses.records.map((record) => [record.Name as string, record.Id]));

    return userLicensesMap as Map<string, string>;
  }
}
