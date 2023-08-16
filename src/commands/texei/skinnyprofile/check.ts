import * as fs from 'fs';
import * as path from 'path';
import xml2js = require('xml2js');
import { SfCommand, Flags } from '@salesforce/sf-plugins-core';
import { Messages, SfError } from '@salesforce/core';
import { nodesNotAllowed } from '../../../shared/skinnyProfileHelper';
import { getDefaultPackagePath } from '../../../shared/sfdxProjectFolder';

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
  };

  // Set this to true if your command requires a project workspace; 'requiresProject' is false by default
  public static readonly requiresProject = true;

  public async run(): Promise<CheckResult> {
    const { flags } = await this.parse(Check);

    const invalidProfiles: string[] = [];
    let profilesToCheck: string[] = [];
    let commandResult = '';

    // Get profiles files path
    if (flags.path) {
      // A path was provided with the flag
      profilesToCheck = this.getProfilesInPath(flags.path);
    } else {
      // Else look in the default package directory
      const defaultPackageDirectory = path.join(await getDefaultPackagePath(), 'profiles');
      profilesToCheck = this.getProfilesInPath(defaultPackageDirectory);
    }

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
          this.debug(`key: ${key} - value: ${value}`);

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
        )}. Please run sfdx texei:skinnyprofile:retrieve`
      );
    }

    this.log(commandResult);

    return { message: commandResult };
  }

  private getProfilesInPath(pathToRead: string): string[] {
    this.log(`getProfilesInPath --> pathToRead:${pathToRead}`);

    const profilesInPath: string[] = [];

    const filesInDir = fs.readdirSync(pathToRead);

    for (const fileInDir of filesInDir) {
      const dirOrFilePath = path.join(process.cwd(), pathToRead, fileInDir);

      // If it's a Profile file, add it
      if (!fs.lstatSync(dirOrFilePath).isDirectory() && fileInDir.endsWith('.profile-meta.xml')) {
        const profileFoundPath = path.join(pathToRead, fileInDir);

        profilesInPath.push(profileFoundPath);
      }
    }

    return profilesInPath;
  }
}
