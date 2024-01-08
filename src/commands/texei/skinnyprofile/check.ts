import * as fs from 'fs';
import * as path from 'path';
import xml2js = require('xml2js');
import { SfCommand, Flags, loglevel } from '@salesforce/sf-plugins-core';
import { Messages, SfError } from '@salesforce/core';
import { nodesNotAllowed } from '../../../shared/skinnyProfileHelper';
import { getDefaultPackagePath, getProfilesInPath } from '../../../shared/sfdxProjectFolder';

// Initialize Messages with the current plugin directory
Messages.importMessagesDirectory(__dirname);

// Load the specific messages for this file. Messages from @salesforce/command, @salesforce/core,
// or any library that is using the messages framework can also be loaded this way.
const messages = Messages.loadMessages('texei-sfdx-plugin', 'skinnyprofile.check');

export type CheckResult = {
  message: string;
};

export default class Check extends SfCommand<CheckResult> {
  public static readonly summary = messages.getMessage('summary');

  public static readonly examples = ['$ sf texei skinnyprofile check'];

  // TODO: add path for project files
  public static readonly flags = {
    path: Flags.string({ char: 'p', required: false, summary: messages.getMessage('flags.path.summary') }),
    // loglevel is a no-op, but this flag is added to avoid breaking scripts and warn users who are using it
    loglevel,
  };

  // Set this to true if your command requires a project workspace; 'requiresProject' is false by default
  public static readonly requiresProject = true;

  public async run(): Promise<CheckResult> {
    const { flags } = await this.parse(Check);

    const invalidProfiles: string[] = [];
    let profilesToCheck: string[] = [];
    let commandResult = '';

    // Get profiles files path
    let profileDirPath = '';
    if (flags.path) {
      // A path was provided with the flag
      profileDirPath = flags.path;
    } else {
      // Else look in the default package directory
      profileDirPath = path.join(await getDefaultPackagePath(), 'profiles');
    }

    if (fs.existsSync(profileDirPath)) {
      // There is a profiles folder
      profilesToCheck = getProfilesInPath(profileDirPath, true);

      if (profilesToCheck === undefined || profilesToCheck.length === 0) {
        commandResult = 'No Profile found';
      } else {
        for (const profilePath of profilesToCheck) {
          // Generate path
          const filePath = path.join(process.cwd(), profilePath);

          // Read data file
          const data = fs.readFileSync(filePath, 'utf8');

          // Parsing file
          // TODO: refactor to avoid await in loop ? Not sure we want all metadata in memory
          // eslint-disable-next-line
          const profileJson: ProfileMetadataType = (await xml2js.parseStringPromise(data)) as ProfileMetadataType;

          // Looking for unwanted nodes
          for (const [key, value] of Object.entries(profileJson?.Profile)) {
            this.debug('key:');
            this.debug(key);
            this.debug('value:');
            this.debug(value);

            if (Object.prototype.hasOwnProperty.call(profileJson.Profile, key)) {
              if (nodesNotAllowed.includes(key)) {
                // Could definitely be improved
                if (!invalidProfiles.includes(profilePath)) {
                  invalidProfiles.push(profilePath);
                }
                break;
              }
            }
          }
        }
      }

      if (invalidProfiles.length === 0) {
        commandResult = 'All Profiles valid';
      } else {
        throw new SfError(
          `Invalid Profile${invalidProfiles.length > 1 ? 's' : ''} found: ${invalidProfiles.join(
            ', '
          )}. Please run sf texei skinnyprofile retrieve`
        );
      }
    } else {
      commandResult = 'No profiles folder found';
    }

    this.log(commandResult);

    return { message: commandResult };
  }
}
