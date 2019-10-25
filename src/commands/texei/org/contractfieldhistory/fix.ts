import { core, SfdxCommand } from "@salesforce/command";
import * as puppeteer from "puppeteer";

// Initialize Messages with the current plugin directory
core.Messages.importMessagesDirectory(__dirname);

// Load the specific messages for this file. Messages from @salesforce/command, @salesforce/core,
// or any library that is using the messages framework can also be loaded this way.
const messages = core.Messages.loadMessages(
  "texei-sfdx-plugin",
  "org-contractfieldhistory-fix"
);

export default class Fix extends SfdxCommand {
  public static description = messages.getMessage("commandDescription");

  public static examples = [
    `$ sfdx texei:org:contractfieldhistory:fix" \nHistory tracking fixed.\n`
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

    //const conn = this.org.getConnection();
    await this.fixContract();

    return result;
  }

  private async fixContract() {
    const instanceUrl = this.org.getConnection().instanceUrl;

    const POST_LOGIN_PATH = "/ui/setup/layout/FieldHistoryTracking?pEntity=Contract";
    
    this.ux.startSpinner('Retrieving Profiles');
    this.debug(`DEBUG Login to Scratch Org`);

    const browser = await puppeteer.launch({
      args: ['--no-sandbox', '--disable-setuid-sandbox'],
      headless: !(process.env.BROWSER_DEBUG === 'true')
    });
    const page = await browser.newPage();
    await page.goto(
      `${instanceUrl}/secur/frontdoor.jsp?sid=${
        this.org.getConnection().accessToken
      }&startURL=${encodeURIComponent(POST_LOGIN_PATH)}`,
      { waitUntil: ["load", "domcontentloaded", "networkidle0"] }
    );
    const navigationPromise = page.waitForNavigation();
    await navigationPromise;

    this.debug(`DEBUG Opening Contract Field History Tracking page`);
    await page.goto(
      `${instanceUrl}/ui/setup/layout/FieldHistoryTracking?pEntity=Contract`
    );
    await navigationPromise;

    this.debug(`DEBUG Clicking 'Save' button`);
    await page.click("table > tbody > tr > #topButtonRow > .btn:nth-child(1)");
    await navigationPromise;
    
    this.debug(`DEBUG Closing browser`);
    await browser.close();

    this.ux.stopSpinner('Done.');

    return { message: 'Fixed Contract Fied History Tracking'};
  }
}