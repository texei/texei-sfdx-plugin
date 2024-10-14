/* eslint-disable @typescript-eslint/no-unsafe-member-access */
/* eslint-disable @typescript-eslint/no-unsafe-call */
/* eslint-disable @typescript-eslint/restrict-template-expressions */
/* eslint-disable @typescript-eslint/no-unsafe-assignment */
/* eslint-disable @typescript-eslint/explicit-function-return-type */
import {
  SfCommand,
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
const messages = Messages.loadMessages('texei-sfdx-plugin', 'org.contractfieldhistory.fix');

export type OrgContractFieldHistoryResult = {
  message: string;
};

export default class Fix extends SfCommand<OrgContractFieldHistoryResult> {
  public static readonly summary = messages.getMessage('summary');

  public static readonly examples = ['$ sf texei org contractfieldhistory fix" \nHistory tracking fixed.\n'];

  public static readonly flags = {
    'target-org': requiredOrgFlagWithDeprecations,
    'api-version': orgApiVersionFlagWithDeprecations,
    // loglevel is a no-op, but this flag is added to avoid breaking scripts and warn users who are using it
    loglevel,
  };

  public async run(): Promise<OrgContractFieldHistoryResult> {
    const { flags } = await this.parse(Fix);
    const result = await this.fixContract(flags);
    return result;
  }

  private async fixContract(flags) {
    const instanceUrl = flags['target-org'].getConnection(flags['api-version']).instanceUrl;

    const POST_LOGIN_PATH = '/ui/setup/layout/FieldHistoryTracking?pEntity=Contract';

    this.spinner.start('Fixing Contract Field History', undefined, { stdout: true });
    this.debug('DEBUG Login to Scratch Org');

    const browser = await puppeteer.launch({
      args: ['--no-sandbox', '--disable-setuid-sandbox'],
      headless: !(process.env.BROWSER_DEBUG === 'true'),
    });
    const page = await browser.newPage();
    await page.goto(
      `${instanceUrl}/secur/frontdoor.jsp?sid=${
        flags['target-org'].getConnection(flags['api-version']).accessToken
      }&startURL=${encodeURIComponent(POST_LOGIN_PATH)}`,
      { waitUntil: ['domcontentloaded', 'networkidle0'] }
    );
    const navigationPromise = page.waitForNavigation();

    this.debug('DEBUG Opening Contract Field History Tracking page');
    await page.goto(`${instanceUrl}/ui/setup/layout/FieldHistoryTracking?pEntity=Contract`);
    await navigationPromise;

    this.debug("DEBUG Clicking 'Save' button");
    await page.click('table > tbody > tr > #topButtonRow > .btn:nth-child(1)');
    await navigationPromise;

    this.debug('DEBUG Closing browser');
    await browser.close();

    this.spinner.stop('Done.');

    return { message: 'Fixed Contract Fied History Tracking' };
  }
}
