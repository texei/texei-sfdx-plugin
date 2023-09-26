/* eslint-disable @typescript-eslint/no-unsafe-member-access */
/* eslint-disable @typescript-eslint/no-misused-promises */
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
import { Messages, SfError } from '@salesforce/core';
import * as puppeteer from 'puppeteer';

// Initialize Messages with the current plugin directory
Messages.importMessagesDirectory(__dirname);

// Load the specific messages for this file. Messages from @salesforce/command, @salesforce/core,
// or any library that is using the messages framework can also be loaded this way.
const messages = Messages.loadMessages('texei-sfdx-plugin', 'sharingcalc.suspend');

export type SharingcalcSuspendResult = {
  message: string;
};

const mapSharingLabel = new Map([
  ['sharingRule', 'Sharing Rule'],
  ['groupMembership', 'Group Membership'],
]);

export default class Suspend extends SfCommand<SharingcalcSuspendResult> {
  public static readonly summary = messages.getMessage('summary');

  public static readonly examples = ['$ sf texei sharingcalc suspend" \nSharing calculations suspended\n'];

  public static readonly flags = {
    'target-org': requiredOrgFlagWithDeprecations,
    'api-version': orgApiVersionFlagWithDeprecations,
    scope: Flags.string({
      char: 's',
      summary: messages.getMessage('flags.scope.summary'),
      options: ['sharingRule', 'groupMembership'],
      default: 'sharingRule',
      required: false,
    }),
    timeout: Flags.integer({
      char: 't',
      summary: messages.getMessage('flags.timeout.summary'),
      required: false,
      default: 120000,
    }),
    // loglevel is a no-op, but this flag is added to avoid breaking scripts and warn users who are using it
    loglevel,
  };

  private timeoutHandler = null;

  public async run(): Promise<SharingcalcSuspendResult> {
    const { flags } = await this.parse(Suspend);

    // Start timeout handler
    // @ts-ignore: TODO: working code, but look at TS warning
    this.timeoutHandler = setTimeout(() => {
      if (this.timeoutHandler) {
        throw new SfError('There has been a puppeteer timeout while processing Sharing Calc Suspend operation');
      }
    }, flags.timeout);

    // Process operation
    const result = await this.suspendSharingCalc(flags);

    // Clear timeout handler
    // @ts-ignore: TODO: working code, but look at TS warning
    clearTimeout(this.timeoutHandler);
    this.timeoutHandler = null;

    return { message: result };
  }

  private async suspendSharingCalc(flags) {
    const instanceUrl = flags['target-org'].getConnection(flags['api-version']).instanceUrl;

    const SHARING_CALC_PATH = '/p/own/DeferSharingSetupPage';

    this.spinner.start(`Suspending ${mapSharingLabel.get(flags.scope)} Calculations`, undefined, { stdout: true });
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

    this.debug("DEBUG Clicking 'Suspend' button");

    try {
      // Suspend either Group Membership or Sharing Rules
      if (flags.scope === 'groupMembership') {
        page.on('dialog', async (dialog) => {
          await dialog.accept();
        });

        await page.click(
          '#gmSect > .pbBody > .pbSubsection > .detailList > tbody > .detailRow > td > input[name="group_suspend"].btn'
        );
      } else {
        await page.click(
          '#ep > .pbBody > .pbSubsection > .detailList > tbody > .detailRow > td > input[name="rule_suspend"].btn'
        );
      }
    } catch (ex) {
      // eslint-disable-next-line no-console
      console.log('Unable to suspend sharing.', ex.message);
    }

    await navigationPromise;

    this.debug('DEBUG Closing browser');

    await browser.close();

    this.spinner.stop('Done.');

    return `Suspended ${mapSharingLabel.get(flags.scope)} Calculations`;
  }
}
