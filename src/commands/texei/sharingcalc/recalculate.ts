/* eslint-disable @typescript-eslint/no-unsafe-member-access */
/* eslint-disable @typescript-eslint/no-unsafe-call */
/* eslint-disable @typescript-eslint/restrict-template-expressions */
/* eslint-disable @typescript-eslint/restrict-plus-operands */
/* eslint-disable @typescript-eslint/no-unsafe-argument */
/* eslint-disable @typescript-eslint/no-unsafe-assignment */
/* eslint-disable @typescript-eslint/explicit-function-return-type */
import {
  SfCommand,
  Flags,
  orgApiVersionFlagWithDeprecations,
  requiredOrgFlagWithDeprecations,
  loglevel,
} from '@salesforce/sf-plugins-core';
import { Messages } from '@salesforce/core';
import * as puppeteer from 'puppeteer';

// Initialize Messages with the current plugin directory
Messages.importMessagesDirectoryFromMetaUrl(import.meta.url);

// Load the specific messages for this file. Messages from @salesforce/command, @salesforce/core,
// or any library that is using the messages framework can also be loaded this way.
const messages = Messages.loadMessages('texei-sfdx-plugin', 'sharingcalc.recalculate');

export type SharingcalcRecalculateResult = {
  message: string;
};

const mapSharingLabel = new Map([['sharingRule', 'Sharing Rule']]);

export default class Recalculate extends SfCommand<SharingcalcRecalculateResult> {
  public static readonly summary = messages.getMessage('summary');

  public static readonly examples = ['$ sf texei sharingcalc recalculate" \nRecalculated Sharing Rules\n'];

  public static readonly flags = {
    'target-org': requiredOrgFlagWithDeprecations,
    'api-version': orgApiVersionFlagWithDeprecations,
    scope: Flags.string({
      char: 's',
      summary: messages.getMessage('flags.scope.summary'),
      options: ['sharingRule'],
      default: 'sharingRule',
      required: false,
    }),
    // loglevel is a no-op, but this flag is added to avoid breaking scripts and warn users who are using it
    loglevel,
  };

  public async run(): Promise<SharingcalcRecalculateResult> {
    const { flags } = await this.parse(Recalculate);

    const result = await this.reclaculateSharing(flags);

    return { message: result };
  }

  private async reclaculateSharing(flags) {
    const instanceUrl = flags['target-org'].getConnection(flags['api-version']).instanceUrl;

    const SHARING_CALC_PATH = '/p/own/DeferSharingSetupPage';

    this.spinner.start(`Resuming ${mapSharingLabel.get(flags.scope)} Calculations`, undefined, { stdout: true });
    this.debug('DEBUG Login to Org');

    const browser = await puppeteer.launch({
      args: ['--no-sandbox', '--disable-setuid-sandbox'],
      headless: !(process.env.BROWSER_DEBUG === 'true'),
    });
    const page = await browser.newPage();
    await page.goto(
      `${instanceUrl}/secur/frontdoor.jsp?sid=${flags['target-org'].getConnection(flags['api-version']).accessToken}`,
      { waitUntil: ['domcontentloaded', 'networkidle0'] }
    );
    const navigationPromise = page.waitForNavigation();

    this.debug('DEBUG Opening Defer Sharing Calculations page');

    await page.goto(`${instanceUrl + SHARING_CALC_PATH}`);
    await navigationPromise;

    this.debug("DEBUG Clicking 'Recalculate' button");

    try {
      await page.click(
        '#ep > .pbBody > .pbSubsection > .detailList > tbody > .detailRow > td > input[name="rule_recalc"].btn'
      );
    } catch (ex) {
      // eslint-disable-next-line no-console
      console.log('Unable to recalculate sharing.', ex.message);
    }

    await navigationPromise;

    this.debug('DEBUG Closing browser');

    await browser.close();

    this.spinner.stop('Done.');

    return `Recalculated ${mapSharingLabel.get(flags.scope)}s`;
  }
}
