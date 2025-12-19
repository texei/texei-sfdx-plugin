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
Messages.importMessagesDirectoryFromMetaUrl(import.meta.url);

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

const SELECTORS = {
  groupMembership:
    '#gmSect > .pbBody > .pbSubsection > .detailList > tbody > .detailRow > td > input[name="group_suspend"].btn',
  sharingRule: '#ep > .pbBody > .pbSubsection > .detailList > tbody > .detailRow > td > input[name="rule_suspend"].btn',
};

const WAIT_OPTIONS = {
  navigation: {
    waitUntil: ['domcontentloaded', 'networkidle2'],
    timeout: 60000,
  } as puppeteer.WaitForOptions,
  selector: {
    visible: true,
    timeout: 5000,
  },
};

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

    try {
      // Process operation
      const result = await this.suspendSharingCalc(flags);

      return { message: result };
    } finally {
      // Clear timeout handler
      // @ts-ignore: TODO: working code, but look at TS warning
      clearTimeout(this.timeoutHandler);
      this.timeoutHandler = null;
    }
  }

  private async suspendSharingCalc(flags): Promise<string> {
    this.spinner.start(`Suspending ${mapSharingLabel.get(flags.scope)} Calculations`, undefined, { stdout: true });

    let browser: puppeteer.Browser | null = null;

    try {
      // Initialize browser
      browser = await this.initializeBrowser();

      // Navigate to sharing page
      const page = await this.navigateToSharingPage(browser, flags);

      // Perform suspend action
      await this.performSuspendAction(page, flags.scope);

      this.spinner.stop('Done.');
      return `Suspended ${mapSharingLabel.get(flags.scope)} Calculations`;
    } catch (error) {
      this.spinner.stop('Failed.');
      throw new SfError(`Failed to suspend sharing calculations: ${error.message}`);
    } finally {
      if (browser) {
        this.debug('DEBUG Closing browser');
        await browser.close();
      }
    }
  }

  private async initializeBrowser(): Promise<puppeteer.Browser> {
    this.debug('DEBUG Initializing browser');

    return puppeteer.launch({
      args: ['--no-sandbox', '--disable-setuid-sandbox'],
      headless: !(process.env.BROWSER_DEBUG === 'true'),
    });
  }

  private async navigateToSharingPage(browser: puppeteer.Browser, flags): Promise<puppeteer.Page> {
    const SHARING_CALC_PATH = '/p/own/DeferSharingSetupPage';

    const page = await browser.newPage();

    // Login to Org via frontdoor
    const connection = flags['target-org'].getConnection(flags['api-version']);
    const instanceUrl = connection.instanceUrl;
    const accessToken = connection.accessToken;

    this.debug('DEBUG Login to Org');
    const loginUrl = `${instanceUrl}/secur/frontdoor.jsp?sid=${accessToken}`;
    await page.goto(loginUrl, WAIT_OPTIONS.navigation);

    // Navigate to Sharing Calculations page
    this.debug('DEBUG Opening Defer Sharing Calculations page');
    await page.goto(`${instanceUrl}${SHARING_CALC_PATH}`, WAIT_OPTIONS.navigation);

    return page;
  }

  private async performSuspendAction(page: puppeteer.Page, scope: string): Promise<void> {
    this.debug("DEBUG Clicking 'Suspend' button");

    // Setup dialog handler for group membership confirmations
    if (scope === 'groupMembership') {
      page.on('dialog', async (dialog) => {
        this.debug('DEBUG Accepting dialog confirmation');
        await dialog.accept();
      });
    }

    // Get the appropriate selector for the scope
    const selector = SELECTORS[scope] || SELECTORS.sharingRule;
    this.debug(`DEBUG Using selector: ${selector}`);

    // Wait for element to be visible and clickable
    await page.waitForSelector(selector, WAIT_OPTIONS.selector);

    // Perform click and wait for navigation simultaneously
    await Promise.all([page.waitForNavigation(WAIT_OPTIONS.navigation), page.click(selector)]);

    this.debug('DEBUG Suspend action completed successfully');
  }
}
