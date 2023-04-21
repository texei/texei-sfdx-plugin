import { flags, SfdxCommand } from "@salesforce/command";
import { Messages, SfdxError } from "@salesforce/core";
import { nodesNotAllowed } from "../../../shared/skinnyProfileHelper";
import { getDefaultPackagePath } from "../../../shared/sfdxProjectFolder";
import { promises as fs } from 'fs';
import * as path from 'path';
const util = require('util');
const xml2js = require('xml2js');

// Initialize Messages with the current plugin directory
Messages.importMessagesDirectory(__dirname);

// Load the specific messages for this file. Messages from @salesforce/command, @salesforce/core,
// or any library that is using the messages framework can also be loaded this way.
const messages = Messages.loadMessages("texei-sfdx-plugin", "skinnyprofile-check");

export default class Retrieve extends SfdxCommand {
  public static description = messages.getMessage("commandDescription");

  public static examples = ["$ texei:skinnyprofile:check"];

  // TODO: add path for project files
  protected static flagsConfig = {
    path: flags.string({ char: 'p', required: false, description: 'path to profiles folder. Default: default package directory' })
  };

  // Comment this out if your command does not require an org username
  protected static requiresUsername = false;

  // Comment this out if your command does not require a hub org username
  protected static requiresDevhubUsername = false;

  // Set this to true if your command requires a project workspace; 'requiresProject' is false by default
  protected static requiresProject = true;

  public async run(): Promise<any> {
    let invalidProfiles = [];
    let profilesToCheck = [];
    let commandResult = '';

    // Get profiles files path
    if (this.flags.path) {
      // A path was provided with the flag
      profilesToCheck = await this.getProfilesInPath(this.flags.path);
    }
    else {
      // Else look in the default package directory
      const defaultPackageDirectory = path.join(await getDefaultPackagePath(), 'profiles');
      profilesToCheck = await this.getProfilesInPath(defaultPackageDirectory);
    }

    if (profilesToCheck === undefined || profilesToCheck.length == 0) {
      commandResult = 'No Profile found';
    }
    else {
      for (const profilePath of profilesToCheck) {

        // Generate path
        const filePath = path.join(
          process.cwd(),
          profilePath
        );
  
        // Read data file
        const data = await fs.readFile(filePath, 'utf8');
  
        // Parsing file
        // According to xml2js doc it's better to recreate a parser for each file
        // https://www.npmjs.com/package/xml2js#user-content-parsing-multiple-files
        var parser = new xml2js.Parser();
        const parseString = util.promisify(parser.parseString);
        const profileJson = JSON.parse(JSON.stringify(await parseString(data)));
        
        // Looking for unwanted nodes
        for (const [key, value] of Object.entries(profileJson.Profile)) {
          this.debug(`key: ${key} - value: ${value}`);
          this.debug(key);
          if (profileJson.Profile.hasOwnProperty(key)) {
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

    if (invalidProfiles.length == 0) {
      commandResult = 'All Profiles valid';
    }
    else {
      throw new SfdxError(`Invalid Profile${invalidProfiles.length > 1 ? 's' : ''} found: ${invalidProfiles.join(', ')}. Please run sfdx texei:skinnyprofile:retrieve`);
    }

    this.ux.log(commandResult);

    return { message: commandResult };
  }

  private async getProfilesInPath(pathToRead: string) {
    let profilesInPath = [];

    const filesInDir = await fs.readdir(pathToRead);

    for (const fileInDir of filesInDir) {

      const dirOrFilePath = path.join(
        process.cwd(),
        pathToRead,
        fileInDir
      );

      // If it's a Profile file, add it
      if (!(await fs.lstat(dirOrFilePath)).isDirectory() && fileInDir.endsWith('.profile-meta.xml')) {

        const profileFoundPath = path.join(
          pathToRead,
          fileInDir
        );

        profilesInPath.push(profileFoundPath);
      }
    }
    
    return profilesInPath;
  }
}