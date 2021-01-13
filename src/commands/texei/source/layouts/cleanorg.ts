import { flags, SfdxCommand } from '@salesforce/command';
import { Messages, SfdxError } from '@salesforce/core';
import { SaveResult } from "jsforce";
import * as fs from 'fs';
import * as path from 'path';

const util = require('util');

// Initialize Messages with the current plugin directory
Messages.importMessagesDirectory(__dirname);

const defaultLayoutsFolder = 'force-app/main/default/layouts';

// Load the specific messages for this file. Messages from @salesforce/command, @salesforce/core,
// or any library that is using the messages framework can also be loaded this way.
const messages = Messages.loadMessages('texei-sfdx-plugin', 'source-layouts-cleanorg');

export default class CleanOrg extends SfdxCommand {

  public static description = messages.getMessage('commandDescription');

  public static examples = [
    `$ texei:source:layouts:cleanorg`,
    `$ texei:source:layouts:cleanorg --targetusername myScratchOrg --targetdevhubusername myDevHub`
  ];

  protected static flagsConfig = {
    path: flags.string({ char: 'p', required: false, description: `path to layouts` })
  };

  // Comment this out if your command does not require an org username
  protected static requiresUsername = true;

  // Comment this out if your command does not require a hub org username
  protected static requiresDevhubUsername = true;

  // Set this to true if your command requires a project workspace; 'requiresProject' is false by default
  protected static requiresProject = true;

  public async run(): Promise<any> {

    // First check this is a Scratch Org, we don't want to delete Layouts from a real org (maybe add a bypass flag later)
    // Remove this first part when this.org.checkScratchOrg() works
    const orgId15 = (await this.org.getOrgId()).substring(0, 15);
    const scratchOrgResult = await this.hubOrg.getConnection().query(`Select Id FROM ActiveScratchOrg where ScratchOrg = '${orgId15}'`) as any;
    if (scratchOrgResult.records.length !== 1) {
      throw new SfdxError('This command only works on Scratch Org, you fool!');
    }

    let deletedLayouts = [];

    // Read files in directory
    const pathToFile = this.flags.path ? this.flags.path : defaultLayoutsFolder;

    const filesPath = path.join(
        process.cwd(),
        pathToFile
    );

    // Read files
    const readDir = util.promisify(fs.readdir);
    let layoutsFiles = await readDir(filesPath, "utf8").catch(err => {
      if (err.code === 'ENOENT') {
        const noent = 'No layouts folder found';
        this.ux.log(noent);
        deletedLayouts.push(noent);
      }
      else {
        this.ux.error(err);
      }
    });

    if (layoutsFiles) {
        
      // Don't know why metadata API retrieved & as %26 whereas other characters are ok. Hardcoding for now (booo)
      layoutsFiles = layoutsFiles.map(x => x.replace('.layout-meta.xml','')
                                            .replace('%26','&')
                                            .replace('%27','\'')
                                            .replace('%28','(')
                                            .replace('%29',')')
                                            .replace('%5B','[')
                                            .replace('%5D',']'));
      
      // Only look at standard objects
      let standardObjects:Set<String> = new Set<String>(layoutsFiles.map(x => {
        const obj = x.split('-')[0];
        if (!obj.includes('__')) {
          // Should be enough to know if it's a standard object
          return obj;
        }
      }));
      standardObjects.delete(undefined);

      // Query the org to get layouts for these standard objects
      const conn = this.org.getConnection();
      const objectList:string = `'${Array.from(standardObjects).join().replace(/,/gi,'\',\'')}'`;
      const query = `Select TableEnumOrId, Name from Layout where TableEnumOrId IN (${objectList}) order by TableEnumOrId`;
      const results = await conn.tooling.query(query) as any;

      let layoutsOnOrg:Set<String> = new Set<String>();
      for (const layout of results.records) {
        layoutsOnOrg.add(`${layout.TableEnumOrId}-${layout.Name}`);
      }

      const layoutsToDelete:string[] = Array.from(layoutsOnOrg).filter(lay => layoutsFiles.includes(lay) ? undefined : lay) as string[];

      if (layoutsToDelete.length > 0) {

        // TODO: log after delete, once errors are handled correctly
        this.ux.log(`Deleting layouts:`);
        for (const lay of layoutsToDelete) {
          this.ux.log(lay);
          deletedLayouts.push(lay);
        }

        // Use metadata API so that this won't be visible in force:source:status
        // This call is limited to 10 records, splitting (maybe refactor later to use destructiveChanges.xml)
        let promises: Array<Promise<SaveResult | SaveResult[]>> = new Array<Promise<SaveResult | SaveResult[]>>();
        
        while(layoutsToDelete.length) { 
          promises.push(conn.metadata.delete('Layout', layoutsToDelete.splice(0,10)));
        }
        
        // TODO: handle errors correctly
        await Promise.all(promises);
      }
      else {
        this.ux.log(`Nothing to delete.`);
      }
    }

    return { deleted: deletedLayouts };
  }
}