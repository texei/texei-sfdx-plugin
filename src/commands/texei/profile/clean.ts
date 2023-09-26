/* eslint-disable @typescript-eslint/no-unsafe-member-access */
/* eslint-disable @typescript-eslint/no-unsafe-call */
/* eslint-disable @typescript-eslint/restrict-template-expressions */
/* eslint-disable @typescript-eslint/no-unsafe-argument */
/* eslint-disable class-methods-use-this */
/* eslint-disable @typescript-eslint/await-thenable */
/* eslint-disable no-await-in-loop */
/* eslint-disable @typescript-eslint/explicit-function-return-type */
/* eslint-disable @typescript-eslint/no-unsafe-assignment */
import * as fs from 'fs';
import * as path from 'path';
import util = require('util');
import { SfCommand, Flags, loglevel } from '@salesforce/sf-plugins-core';
import { Messages, SfError } from '@salesforce/core';
import xml2js = require('xml2js');
import { getDefaultPackagePath } from '../../../shared/sfdxProjectFolder';

// Initialize Messages with the current plugin directory
Messages.importMessagesDirectory(__dirname);

// Load the specific messages for this file. Messages from @salesforce/command, @salesforce/core,
// or any library that is using the messages framework can also be loaded this way.
const messages = Messages.loadMessages('texei-sfdx-plugin', 'profile.clean');

export type ProfileCleanResult = {
  profilesCleaned: string[];
};

export default class Clean extends SfCommand<ProfileCleanResult> {
  public static readonly summary = messages.getMessage('summary');

  public static readonly examples = [
    '$ sf texei profile clean -k layoutAssignments,recordTypeVisibilities',
    '$ sf texei profile clean -p custom-sfdx-source-folder/main/profiles',
    '$ sf texei profile clean -p custom-sfdx-source-folder/main/profiles,source-folder-2/main/profiles/myAdmin.profile-meta.xml',
  ];

  public static readonly flags = {
    keep: Flags.string({ char: 'k', summary: messages.getMessage('flags.keep.summary'), required: false }),
    path: Flags.string({ char: 'p', summary: messages.getMessage('flags.path.summary'), required: false }),
    // loglevel is a no-op, but this flag is added to avoid breaking scripts and warn users who are using it
    loglevel,
  };

  public async run(): Promise<ProfileCleanResult> {
    const { flags } = await this.parse(Clean);

    const cleanResult = [];

    // TODO: Keep default recordTypeVisibilities & applicationVisibilities like in skinnyprofile:retrieve
    const defaultKeep = ['layoutAssignments', 'loginHours', 'loginIpRanges', 'custom', 'userLicense'];
    const nodesToKeep = flags.keep ? flags.keep : defaultKeep;
    let profilesToClean = [];

    // Get profiles files path
    if (flags.path) {
      // If path was provided as a flag use it/them
      const paths = flags.path.split(',');

      for (const currentPath of paths) {
        if (currentPath.endsWith('.profile-meta.xml')) {
          // Well, this should be a profile
          // Otherwise you have a weird folder naming convention, you should probably stop this
          // @ts-ignore: TODO: working code, but look at TS warning
          profilesToClean.push(currentPath);
        } else {
          // Flag provided value doesn't end like a Profile source metadata
          // Expect it's a folder
          profilesToClean = await this.getProfilesInPath(currentPath);
        }
      }
    } else {
      // Else look in the default package directory
      const defaultPackageDirectory = path.join(await getDefaultPackagePath(), 'profiles');
      profilesToClean = await this.getProfilesInPath(defaultPackageDirectory);
    }

    // eslint-disable-next-line eqeqeq
    if (profilesToClean.length == 0) {
      this.log('No Profile found :(');
    }

    // Promisify functions
    const readFile = util.promisify(fs.readFile);

    for (const profilePath of profilesToClean) {
      // Generate path
      const filePath = path.join(process.cwd(), profilePath);

      // Read data file
      const data = await readFile(filePath, 'utf8');

      // Parsing file
      // According to xml2js doc it's better to recreate a parser for each file
      // https://www.npmjs.com/package/xml2js#user-content-parsing-multiple-files
      const parser = new xml2js.Parser();
      // eslint-disable-next-line @typescript-eslint/unbound-method
      const parseString = util.promisify(parser.parseString);
      // @ts-ignore: TODO: working code, but look at TS warning
      const profileJson = JSON.parse(JSON.stringify(await parseString(data)));

      // Removing unwanted nodes
      for (const nodeKey in profileJson.Profile) {
        // eslint-disable-next-line no-prototype-builtins
        if (profileJson.Profile.hasOwnProperty(nodeKey)) {
          if (!nodesToKeep.includes(nodeKey)) {
            delete profileJson.Profile[nodeKey];
          }
        }
      }

      // Building back as an xml
      const builder = new xml2js.Builder();
      const xmlFile = builder.buildObject(profileJson);

      // Writing back to file
      // eslint-disable-next-line prefer-arrow-callback
      await fs.writeFile(filePath, xmlFile, 'utf8', function (err) {
        if (err) {
          throw new SfError(`Unable to write Profile file at path ${filePath}: ${err}`);
        }
      });

      this.log(`Profile cleaned: ${profilePath}`);
      cleanResult.push(profilePath);
    }

    return { profilesCleaned: cleanResult };
  }

  private async getProfilesInPath(pathToRead: string) {
    const profilesInPath = [];

    const readDirectory = util.promisify(fs.readdir);
    const filesInDir = await readDirectory(pathToRead);

    for (const fileInDir of filesInDir) {
      const dirOrFilePath = path.join(process.cwd(), pathToRead, fileInDir);

      // If it's a Profile file, add it
      if (!fs.lstatSync(dirOrFilePath).isDirectory() && fileInDir.endsWith('.profile-meta.xml')) {
        const profileFoundPath = path.join(pathToRead, fileInDir);

        // @ts-ignore: TODO: working code, but look at TS warning
        profilesInPath.push(profileFoundPath);
      }
    }

    return profilesInPath;
  }
}
