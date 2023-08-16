/* eslint-disable @typescript-eslint/no-unsafe-member-access */
/* eslint-disable @typescript-eslint/no-unsafe-call */
/* eslint-disable @typescript-eslint/restrict-template-expressions */
/* eslint-disable @typescript-eslint/restrict-plus-operands */
/* eslint-disable @typescript-eslint/no-unsafe-assignment */
/* eslint-disable @typescript-eslint/explicit-function-return-type */
import {
  SfCommand,
  orgApiVersionFlagWithDeprecations,
  requiredOrgFlagWithDeprecations,
} from '@salesforce/sf-plugins-core';
import { Messages } from '@salesforce/core';
import * as puppeteer from 'puppeteer';

// Initialize Messages with the current plugin directory
Messages.importMessagesDirectory(__dirname);

// Load the specific messages for this file. Messages from @salesforce/command, @salesforce/core,
// or any library that is using the messages framework can also be loaded this way.
const messages = Messages.loadMessages('texei-sfdx-plugin', 'sharedactivities.enable');

export type SharedactivitiesEnableResult = {
  message: string;
};

export default class Enable extends SfCommand<SharedactivitiesEnableResult> {
  public static readonly summary = messages.getMessage('summary');

  public static readonly examples = ['$ sf texei sharedactivities enable'];

  public static readonly flags = {
    'target-org': requiredOrgFlagWithDeprecations,
    'api-version': orgApiVersionFlagWithDeprecations,
  };

  public async run(): Promise<SharedactivitiesEnableResult> {
    const { flags } = await this.parse(Enable);

    this.warn(
      'SharedActivities are now officially supported, you should add the SharedActivities feature to your scratch definition file instead of using this command.'
    );

    const instanceUrl = flags['target-org'].getConnection(flags['api-version']).instanceUrl;
    const accessToken = flags['target-org'].getConnection(flags['api-version']).accessToken;

    await this.enableSharedActivities(instanceUrl, accessToken);

    return {
      message:
        'SharedActivities enabled. SharedActivities are now officially supported, you should add the SharedActivities feature to your scratch definition file instead of using this command.',
    };
  }

  private async enableSharedActivities(instanceUrl: string, accessToken) {
    const ACTIVITIES_SETTINGS_PATH = '/setup/activitiesSetupPage.apexp';

    this.spinner.start('Enabling Shared Activities', undefined, { stdout: true });
    this.debug('DEBUG Login to Org');

    const browser = await puppeteer.launch({
      args: ['--no-sandbox', '--disable-setuid-sandbox'],
      headless: !(process.env.BROWSER_DEBUG === 'true'),
    });
    const page = await browser.newPage();
    await page.goto(`${instanceUrl}/secur/frontdoor.jsp?sid=${accessToken}`, {
      waitUntil: ['domcontentloaded', 'networkidle0'],
    });

    const navigationPromise = page.waitForNavigation();

    this.debug('DEBUG Opening Activity Settings page');
    await page.goto(`${instanceUrl + ACTIVITIES_SETTINGS_PATH}`);
    await navigationPromise;

    this.debug("DEBUG Clicking 'Allow Users to Relate Multiple Contacts to Tasks and Events' checkbox");
    await page.click('input[id="thePage:theForm:theBlock:manyWhoPref"]');

    this.debug("DEBUG Clicking 'Submit' button");
    await page.click('input[id="thePage:theForm:theBlock:buttons:submit"]');
    await navigationPromise;

    this.debug('DEBUG Closing browser');

    await browser.close();

    this.spinner.stop('Done.');

    return { message: 'Enabled Shared Activities' };
  }
}
