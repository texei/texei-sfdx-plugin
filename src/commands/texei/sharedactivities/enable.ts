import { SfdxCommand } from "@salesforce/command";
import { Messages } from '@salesforce/core';
import * as puppeteer from "puppeteer";

// Initialize Messages with the current plugin directory
Messages.importMessagesDirectory(__dirname);

// Load the specific messages for this file. Messages from @salesforce/command, @salesforce/core,
// or any library that is using the messages framework can also be loaded this way.
const messages = Messages.loadMessages(
  "texei-sfdx-plugin",
  "sharedactivities-enable"
);

export default class Enable extends SfdxCommand {
  public static description = messages.getMessage("commandDescription");

  public static examples = [
    `$ sfdx texei:sharedactivities:enable`
  ];

  protected static flagsConfig = {};

  // Comment this out if your command does not require an org username
  protected static requiresUsername = true;

  // Comment this out if your command does not support a hub org username
  protected static requiresDevhubUsername = false;

  // Set this to true if your command requires a project workspace; 'requiresProject' is false by default
  protected static requiresProject = false;

  public async run(): Promise<any> {
    let result = {};

    this.ux.warn('SharedActivities are now officially supported, you should add the SharedActivities feature to your scratch definition file instead of using this command.');

    await this.enableSharedActivities();

    return result;
  }

  private async enableSharedActivities() {
    const instanceUrl = this.org.getConnection().instanceUrl;
    const ACTIVITIES_SETTINGS_PATH = "/setup/activitiesSetupPage.apexp";

    this.ux.startSpinner(`Enabling Shared Activities`, null, { stdout: true });
    this.debug(`DEBUG Login to Org`);

    const browser = await puppeteer.launch({
      args: ["--no-sandbox", "--disable-setuid-sandbox"],
      headless: !(process.env.BROWSER_DEBUG === "true")
    });
    const page = await browser.newPage();
    await page.goto(
      `${instanceUrl}/secur/frontdoor.jsp?sid=${
        this.org.getConnection().accessToken
      }`,
      { waitUntil: ["domcontentloaded", "networkidle0"] }
    );

    const navigationPromise = page.waitForNavigation();

    this.debug(`DEBUG Opening Activity Settings page`);
    await page.goto(`${instanceUrl + ACTIVITIES_SETTINGS_PATH}`);
    await navigationPromise;

    this.debug(`DEBUG Clicking 'Allow Users to Relate Multiple Contacts to Tasks and Events' checkbox`);
    await page.click(
        'input[id="thePage:theForm:theBlock:manyWhoPref"]'
    );

    this.debug(`DEBUG Clicking 'Submit' button`);
    await page.click(
        'input[id="thePage:theForm:theBlock:buttons:submit"]'
    );
    await navigationPromise;

    this.debug(`DEBUG Closing browser`);

    await browser.close();

    this.ux.stopSpinner("Done.");

    return { message: `Enabled Shared Activities` };
  }
}