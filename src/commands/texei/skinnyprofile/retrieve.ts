import { flags, SfdxCommand } from "@salesforce/command";
import { Messages, Connection, SfdxError } from "@salesforce/core";
import {
  getMetadata,
  getLayoutsForObject,
  getRecordTypesForObject
} from "../../../shared/sfdxProjectFolder";
import { AnyJson } from "@salesforce/ts-types";
import * as path from 'path';
var fs = require('fs');
var unzipper = require('unzipper');
const util = require('util');
const xml2js = require('xml2js');

// Initialize Messages with the current plugin directory
Messages.importMessagesDirectory(__dirname);

// Load the specific messages for this file. Messages from @salesforce/command, @salesforce/core,
// or any library that is using the messages framework can also be loaded this way.
const messages = Messages.loadMessages(
  "texei-sfdx-plugin",
  "skinnyprofile-retrieve"
);
const defaultProjectPath = path.join('force-app','main','default');
const defaultTimeout = 60000;

let conn: Connection;
let retrievedProfiles = [];

export default class Retrieve extends SfdxCommand {
  public static description = messages.getMessage("commandDescription");

  public static examples = ["$ texei:skinnyprofile:retrieve -u MyScratchOrg"];

  // TODO: add path for project files
  protected static flagsConfig = {
    timeout: flags.string({ char: 't', required: false, description: 'timeout(ms) for profile retrieve (Default: 60000ms)' }),
  };

  // Comment this out if your command does not require an org username
  protected static requiresUsername = true;

  // Comment this out if your command does not require a hub org username
  protected static requiresDevhubUsername = true;

  // Set this to true if your command requires a project workspace; 'requiresProject' is false by default
  protected static requiresProject = true;

  // This is removed, should be on a Permission Set
  public nodesToRemove = ['userPermissions',
                          'classAccesses',
                          'externalDataSourceAccesses',
                          'fieldPermissions',
                          'objectPermissions',
                          'pageAccesses',
                          'tabVisibilities',
                          'customMetadataTypeAccesses'];

  // These metadata are on Permission Set, but Default is selected on Profile. Keeping only the default value                       
  public nodesHavingDefault = ['applicationVisibilities','recordTypeVisibilities'];

  public async run(): Promise<any> {
    
    conn = await this.org.getConnection();

    let typesToRetrieve = [];

    // Adding LAYOUTS & RECORD TYPES
    let layoutsToRetrieve = [];
    let recordTypesToRetrieve = [];
    for (const obj of await getMetadata("objects")) {

      // Layouts
      for (const layout of await getLayoutsForObject(obj)) {
        layoutsToRetrieve.push(layout);
      }

      // Record Types
      for (const recType of await getRecordTypesForObject(obj)) {
        recordTypesToRetrieve.push(recType);
      }
    }
    
    // Layouts
    if (layoutsToRetrieve.length > 0) {
      typesToRetrieve.push({
        'members': layoutsToRetrieve,
        'name': 'Layout'
      });
    }
    
    // Record Types
    if (recordTypesToRetrieve.length > 0) {
      typesToRetrieve.push({
        'members': recordTypesToRetrieve,
        'name': 'RecordType'
      });
    }

    // Adding APPLICATIONS
    let applicationsToRetrieve = [];
    for (const app of await getMetadata("applications")) {
      applicationsToRetrieve.push(app.replace('.app-meta.xml',''));
    }

    if (applicationsToRetrieve.length > 0) {
      typesToRetrieve.push({
        'members': applicationsToRetrieve,
        'name': 'CustomApplication'
      });
    }

    // Adding PROFILES
    let profilesToRetrieve = await getMetadata("profiles");

    if (profilesToRetrieve.length > 0) {
      typesToRetrieve.push({
        'members': profilesToRetrieve,
        'name': 'Profile'
      });
    }


    this.ux.startSpinner('Retrieving Profiles');
    
    await this.retrievePackage(typesToRetrieve);
    
    this.ux.stopSpinner('Done.');


    return { retrievedProfiles: retrievedProfiles };
  }

  private async retrievePackage(packageToRetrieve:AnyJson) {

    const maxApiVersion = await this.org.retrieveMaxApiVersion();
    
    let mypackage = {
      apiVersion: maxApiVersion,
      singlePackage: true,
      unpackaged: {
        types: packageToRetrieve
      }
    };

    this.debug(`DEBUG Retrieving Package:`);
    this.debug(JSON.stringify(mypackage, null, 2));

    // Setting timeout
    conn.metadata.pollTimeout = this.flags.timeout ? this.flags.timeout : defaultTimeout;
    // @ts-ignore: Don't know why, but TypeScript doesn't see the callback as optional
    const parsed = await conn.metadata.retrieve(mypackage).stream().pipe(unzipper.Parse());
    
    await new Promise(async (resolve, reject) => {
      this.debug(`DEBUG Parsing retrieved package`);
      
      const readFile = util.promisify(fs.readFile);
      const writeFile = util.promisify(fs.writeFile);

      try {
        parsed.on('entry', async (entry) => {

          this.debug(`DEBUG Retrieved Metadata: ${entry.path}`);

          if (entry.path.endsWith('.profile')) {
            const profileFileName = entry.path.substring(entry.path.lastIndexOf('/')+1, entry.path.length);
            const profilePath =  path.join(defaultProjectPath,'profiles',`${profileFileName}-meta.xml`);
            const writeStream = fs.createWriteStream(profilePath);
            entry.pipe(writeStream);
            
            writeStream.on("finish", async () => {

              // TODO: do a better job by cleaning the data before saving the file, won't have to read it again
              // Cleaning Profile from metadata that should be in a Permission Set
              const myProfile = await this.cleanProfile( await readFile(profilePath, 'utf8') );
              await writeFile(profilePath, myProfile, 'utf8')
                    .catch((err) => {
                      throw new SfdxError(`Unable to write file at path ${profilePath}: ${err}`);
                    });

              retrievedProfiles.push(profilePath);
              this.ux.log(`Profile saved: ${profilePath}`);
            });
          }
          else {
            entry.autodrain();
          }
        });

        parsed.on('close', () => {
          this.debug(`DEBUG Parsing finished.`);
          resolve();
        });
      }
      catch(err) {
        reject(err);
      }
    }).catch(error => {
      throw new SfdxError(`Error while parsing retrieved package: ${error}`);
    });
  }

  public async cleanProfile(profile:string) {
    //const nodesToKeep = ['custom','userLicense','layoutAssignments','loginHours','loginIpRanges'];
   
    // Parsing file
    // According to xml2js doc it's better to recreate a parser for each file
    // https://www.npmjs.com/package/xml2js#user-content-parsing-multiple-files
    var parser = new xml2js.Parser();
    const parseString = util.promisify(parser.parseString);
    const profileJson = await parseString(profile);

    // Removing unwanted nodes
    for (const nodeKey in profileJson.Profile) {
      if (profileJson.Profile.hasOwnProperty(nodeKey)) {

        // Remove node
        if (this.nodesToRemove.includes(nodeKey)) {
          delete profileJson.Profile[nodeKey];
        } 
        else if (this.nodesHavingDefault.includes(nodeKey)) {

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
    const xmlFile = builder.buildObject(profileJson);

    return xmlFile;
  }
}