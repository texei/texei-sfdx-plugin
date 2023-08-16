/* eslint-disable @typescript-eslint/no-unsafe-member-access */
/* eslint-disable @typescript-eslint/no-misused-promises */
/* eslint-disable @typescript-eslint/no-unsafe-call */
/* eslint-disable @typescript-eslint/restrict-template-expressions */
/* eslint-disable @typescript-eslint/restrict-plus-operands */
/* eslint-disable @typescript-eslint/require-await */
/* eslint-disable @typescript-eslint/no-explicit-any */
/* eslint-disable @typescript-eslint/no-unsafe-assignment */
import * as path from 'path';
import * as fs from 'fs';
import xml2js = require('xml2js');
import unzipper = require('unzipper');
import {
  SfCommand,
  Flags,
  orgApiVersionFlagWithDeprecations,
  requiredOrgFlagWithDeprecations,
} from '@salesforce/sf-plugins-core';
import { Messages, Connection, SfError } from '@salesforce/core';
import { AnyJson } from '@salesforce/ts-types';
import { getMetadata, getLayoutsForObject, getRecordTypesForObject } from '../../../shared/sfdxProjectFolder';
import { nodesNotAllowed, nodesHavingDefault } from '../../../shared/skinnyProfileHelper';

// Initialize Messages with the current plugin directory
Messages.importMessagesDirectory(__dirname);

// Load the specific messages for this file. Messages from @salesforce/command, @salesforce/core,
// or any library that is using the messages framework can also be loaded this way.
const messages = Messages.loadMessages('texei-sfdx-plugin', 'skinnyprofile.retrieve');

export type RetrieveResult = {
  retrievedProfiles: string[];
};

const defaultProjectPath = path.join('force-app', 'main', 'default');
const defaultTimeout = 60000;

let conn: Connection;
const retrievedProfiles: string[] = [];

type MetadataTypesToRetrieve = {
  members: string[];
  name: string;
};

export default class Retrieve extends SfCommand<RetrieveResult> {
  public static readonly summary = messages.getMessage('summary');

  public static readonly examples = ['$ sf texei skinnyprofile retrieve --target-org MyScratchOrg'];

  // TODO: add path for project files
  public static readonly flags = {
    'target-org': requiredOrgFlagWithDeprecations,
    'api-version': orgApiVersionFlagWithDeprecations,
    timeout: Flags.integer({ char: 't', required: false, summary: messages.getMessage('flags.timeout.summary') }),
  };

  // Set this to true if your command requires a project workspace; 'requiresProject' is false by default
  public static readonly requiresProject = true;

  public async run(): Promise<RetrieveResult> {
    const { flags } = await this.parse(Retrieve);

    conn = flags['target-org'].getConnection(flags['api-version']);

    const typesToRetrieve: MetadataTypesToRetrieve[] = [];

    // Adding LAYOUTS & RECORD TYPES
    const layoutsToRetrieve: string[] = [];
    const recordTypesToRetrieve: string[] = [];
    for (const obj of getMetadata('objects')) {
      // Layouts
      for (const layout of getLayoutsForObject(obj)) {
        layoutsToRetrieve.push(layout);
      }

      // Record Types
      for (const recType of getRecordTypesForObject(obj)) {
        recordTypesToRetrieve.push(recType);
      }
    }

    // Layouts
    if (layoutsToRetrieve.length > 0) {
      typesToRetrieve.push({
        members: layoutsToRetrieve,
        name: 'Layout',
      });
    }

    // Record Types
    if (recordTypesToRetrieve.length > 0) {
      typesToRetrieve.push({
        members: recordTypesToRetrieve,
        name: 'RecordType',
      });
    }

    // Adding APPLICATIONS
    const applicationsToRetrieve: string[] = [];
    for (const app of getMetadata('applications')) {
      applicationsToRetrieve.push(app.replace('.app-meta.xml', ''));
    }

    if (applicationsToRetrieve.length > 0) {
      typesToRetrieve.push({
        members: applicationsToRetrieve,
        name: 'CustomApplication',
      });
    }

    // Adding PROFILES
    const profilesToRetrieve = getMetadata('profiles');

    if (profilesToRetrieve.length > 0) {
      typesToRetrieve.push({
        members: profilesToRetrieve,
        name: 'Profile',
      });
    }

    this.spinner.start('Retrieving Profiles', undefined, { stdout: true });

    const maxApiVersion: string = await flags['target-org'].retrieveMaxApiVersion();
    await this.retrievePackage(typesToRetrieve, flags.timeout, maxApiVersion);

    this.spinner.stop('Done.');

    return { retrievedProfiles };
  }

  public async retrievePackage(
    packageToRetrieve: AnyJson,
    timeout: number | undefined,
    maxApiVersion: string
  ): Promise<void> {
    const mypackage = {
      apiVersion: maxApiVersion,
      singlePackage: true,
      unpackaged: {
        types: packageToRetrieve,
      },
    };

    this.debug('DEBUG Retrieving Package:');
    this.debug(JSON.stringify(mypackage, null, 2));

    // Setting timeout
    conn.metadata.pollTimeout = timeout ? timeout : defaultTimeout;
    // Don't know why, but TypeScript doesn't see the callback as optional
    // @ts-ignore
    const parsed = await conn.metadata.retrieve(mypackage).stream().pipe(unzipper.Parse());

    await new Promise<void>((resolve, reject) => {
      this.debug('DEBUG Parsing retrieved package');

      try {
        parsed.on('entry', async (entry) => {
          this.debug(`DEBUG Retrieved Metadata: ${entry.path}`);

          if (entry.path.endsWith('.profile')) {
            const profileFileName = entry.path.substring(entry.path.lastIndexOf('/') + 1, entry.path.length);
            const profilePath = path.join(defaultProjectPath, 'profiles', `${profileFileName}-meta.xml`);
            const writeStream = fs.createWriteStream(profilePath);
            entry.pipe(writeStream);

            writeStream.on('finish', async () => {
              // TODO: do a better job by cleaning the data before saving the file, won't have to read it again
              // Cleaning Profile from metadata that should be in a Permission Set
              const myProfile = await this.cleanProfile(fs.readFileSync(profilePath, 'utf8'));
              try {
                fs.writeFileSync(profilePath, myProfile, 'utf8');
              } catch (err) {
                throw new SfError(`Unable to write file at path ${profilePath}: ${err}`);
              }

              retrievedProfiles.push(profilePath);
              this.log(`Profile saved: ${profilePath}`);
            });
          } else {
            entry.autodrain();
          }
        });

        parsed.on('close', () => {
          this.debug('DEBUG Parsing finished.');
          resolve();
        });
      } catch (err) {
        reject(err as string);
      }
    }).catch((error) => {
      throw new SfError(`Error while parsing retrieved package: ${error as string}`);
    });
  }

  public async cleanProfile(profile: string): Promise<string> {
    this.log('cleanProfile');

    // Parsing file
    const profileJson: any = await xml2js.parseStringPromise(profile);

    // Removing unwanted nodes
    for (const nodeKey in profileJson?.Profile) {
      if (Object.prototype.hasOwnProperty.call(profileJson.Profile, nodeKey)) {
        // Remove node
        if (nodesNotAllowed.includes(nodeKey)) {
          delete profileJson.Profile[nodeKey];
        } else if (nodesHavingDefault.includes(nodeKey)) {
          // Remove node, keeping only default value
          for (const nodeValue in profileJson.Profile[nodeKey]) {
            if (profileJson.Profile[nodeKey][nodeValue].default[0] === 'false') {
              delete profileJson.Profile[nodeKey][nodeValue];
            }
          }
        }
      }
    }

    // Building back as an xml
    const builder = new xml2js.Builder();
    const xmlFile: string = builder.buildObject(profileJson);

    return xmlFile;
  }
}
