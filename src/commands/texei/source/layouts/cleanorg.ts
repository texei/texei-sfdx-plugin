/* eslint-disable @typescript-eslint/no-unsafe-member-access */
/* eslint-disable @typescript-eslint/no-unsafe-call */
/* eslint-disable @typescript-eslint/restrict-template-expressions */
/* eslint-disable @typescript-eslint/no-unsafe-argument */
/* eslint-disable @typescript-eslint/no-unsafe-assignment */
import * as fs from 'fs';
import util = require('util');
import * as path from 'path';
import {
  SfCommand,
  Flags,
  orgApiVersionFlagWithDeprecations,
  requiredOrgFlagWithDeprecations,
  requiredHubFlagWithDeprecations,
  loglevel,
} from '@salesforce/sf-plugins-core';
import { Messages, SfError } from '@salesforce/core';
import { SaveResult } from 'jsforce';

// Initialize Messages with the current plugin directory
Messages.importMessagesDirectory(__dirname);

const defaultLayoutsFolder = 'force-app/main/default/layouts';

// Load the specific messages for this file. Messages from @salesforce/command, @salesforce/core,
// or any library that is using the messages framework can also be loaded this way.
const messages = Messages.loadMessages('texei-sfdx-plugin', 'source.layouts.cleanorg');

export type SourceLayoutsCleanorgResult = {
  deleted: string[];
};

export default class CleanOrg extends SfCommand<SourceLayoutsCleanorgResult> {
  public static readonly summary = messages.getMessage('summary');

  public static readonly examples = [
    '$ sf texei source layouts cleanorg',
    '$ sf texei source layouts cleanorg --target-org myScratchOrg',
  ];

  public static readonly requiresProject = true;

  public static readonly flags = {
    'target-org': requiredOrgFlagWithDeprecations,
    'target-dev-hub': requiredHubFlagWithDeprecations,
    'api-version': orgApiVersionFlagWithDeprecations,
    path: Flags.string({ char: 'p', summary: messages.getMessage('flags.path.summary'), required: false }),
    // loglevel is a no-op, but this flag is added to avoid breaking scripts and warn users who are using it
    loglevel,
  };

  public async run(): Promise<SourceLayoutsCleanorgResult> {
    const { flags } = await this.parse(CleanOrg);

    // First check this is a Scratch Org, we don't want to delete Layouts from a real org (maybe add a bypass flag later)
    // Remove this first part when this.org.checkScratchOrg() works
    const orgId15 = flags['target-org'].getOrgId().substring(0, 15);
    const scratchOrgResult = await flags['target-dev-hub']
      .getConnection(flags['api-version'])
      .query(`Select Id FROM ActiveScratchOrg where ScratchOrg = '${orgId15}'`);
    if (scratchOrgResult.records.length !== 1) {
      throw new SfError('This command only works on Scratch Org, you fool!');
    }

    const deletedLayouts: string[] = [];

    // Read files in directory
    const pathToFile = flags.path ? flags.path : defaultLayoutsFolder;

    const filesPath = path.join(process.cwd(), pathToFile);

    // Read files
    const readDir = util.promisify(fs.readdir);
    let layoutsFiles = await readDir(filesPath, 'utf8').catch((err) => {
      if (err.code === 'ENOENT') {
        const noent = 'No layouts folder found';
        this.log(noent);
        deletedLayouts.push(noent);
      } else {
        this.error(err);
      }
    });

    if (layoutsFiles) {
      // Don't know why metadata API retrieved & as %26 whereas other characters are ok. Hardcoding for now (booo)
      layoutsFiles = layoutsFiles.map((x) =>
        x
          .replace('.layout-meta.xml', '')
          .replace('%26', '&')
          .replace('%27', "'")
          .replace('%28', '(')
          .replace('%29', ')')
          .replace('%5B', '[')
          .replace('%5D', ']')
      );

      // Only look at standard objects
      const standardObjects: Set<string> = new Set<string>(
        // @ts-ignore: TODO: working code, but look at TS warning
        layoutsFiles.map((x) => {
          const obj = x.split('-')[0];
          if (!obj.includes('__')) {
            // Should be enough to know if it's a standard object
            return obj;
          }
        })
      );
      // @ts-ignore: TODO: working code, but look at TS warning
      standardObjects.delete(undefined);

      // Query the org to get layouts for these standard objects
      const conn = flags['target-org'].getConnection(flags['api-version']);
      const objectList = `'${Array.from(standardObjects).join().replace(/,/gi, "','")}'`;
      const query = `Select TableEnumOrId, Name from Layout where TableEnumOrId IN (${objectList}) order by TableEnumOrId`;
      const results = await conn.tooling.query(query);

      const layoutsOnOrg: Set<string> = new Set<string>();
      for (const layout of results.records) {
        layoutsOnOrg.add(`${layout.TableEnumOrId}-${layout.Name}`);
      }

      // @ts-ignore: TODO: working code, but look at TS warning
      const layoutsToDelete = Array.from(layoutsOnOrg).filter((lay) => (layoutsFiles.includes(lay) ? undefined : lay));

      if (layoutsToDelete.length > 0) {
        // TODO: log after delete, once errors are handled correctly
        this.log('Deleting layouts:');
        for (const lay of layoutsToDelete) {
          this.log(lay);
          deletedLayouts.push(lay);
        }

        // Use metadata API so that this won't be visible in force:source:status
        // This call is limited to 10 records, splitting (maybe refactor later to use destructiveChanges.xml)
        const promises: Array<Promise<SaveResult | SaveResult[]>> = new Array<Promise<SaveResult | SaveResult[]>>();

        while (layoutsToDelete.length) {
          // @ts-ignore: TODO: working code, but look at TS warning
          promises.push(conn.metadata.delete('Layout', layoutsToDelete.splice(0, 10)));
        }

        // TODO: handle errors correctly
        await Promise.all(promises);
      } else {
        this.log('Nothing to delete.');
      }
    }

    return { deleted: deletedLayouts };
  }
}
