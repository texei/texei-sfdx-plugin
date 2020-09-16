import { flags, core, SfdxCommand } from "@salesforce/command";
import * as puppeteer from "puppeteer";

// Initialize Messages with the current plugin directory
core.Messages.importMessagesDirectory(__dirname);

// Load the specific messages for this file. Messages from @salesforce/command, @salesforce/core,
// or any library that is using the messages framework can also be loaded this way.
const messages = core.Messages.loadMessages(
  "texei-sfdx-plugin",
  "sharingcalc-suspend"
);

const mapSharingLabel = new Map([
    ['sharingRule', 'Sharing Rule'],
    ['groupMembership', 'Group Membership']
  ]);

export default class Suspend extends SfdxCommand {
  public static description = messages.getMessage("commandDescription");

  public static examples = [
    `$ sfdx texei:sharingcalc:suspend" \nSharing calculations suspended\n`
  ];

  protected static flagsConfig = {
    scope: flags.string({
      char: "s",
      description: messages.getMessage("scopeFlagDescription"),
      required: false,
      options: ["sharingRule", "groupMembership"],
      default: "sharingRule"
    })
  };

  // Comment this out if your command does not require an org username
  protected static requiresUsername = true;

  // Comment this out if your command does not support a hub org username
  protected static requiresDevhubUsername = false;

  // Set this to true if your command requires a project workspace; 'requiresProject' is false by default
  protected static requiresProject = false;

  public async run(): Promise<any> {
    let result = {};

    await this.suspendSharingCalc();

    return result;
  }

  private async suspendSharingCalc() {
    const instanceUrl = this.org.getConnection().instanceUrl;

    const SHARING_CALC_PATH = "/p/own/DeferSharingSetupPage";

    this.ux.startSpinner(`Suspending ${mapSharingLabel.get(this.flags.scope)} Calculations`, null, { stdout: true });
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

    this.debug(`DEBUG Opening Defer Sharing Calculations page`);

    await page.goto(`${instanceUrl + SHARING_CALC_PATH}`);
    await navigationPromise;

    this.debug(`DEBUG Clicking 'Suspend' button`);

    try {
      // Suspend either Group Membership or Sharing Rules
      if (this.flags.scope === "groupMembership") {
        page.on("dialog", dialog => {
          dialog.accept();
        });

        await page.click(
          `#gmSect > .pbBody > .pbSubsection > .detailList > tbody > .detailRow > td > input[name="group_suspend"].btn`
        );
      } else {
        await page.click(
          '#ep > .pbBody > .pbSubsection > .detailList > tbody > .detailRow > td > input[name="rule_suspend"].btn'
        );
      }
    } catch (ex) {
      console.log('Unable to suspend sharing.', ex.message);
    }

    await navigationPromise;

    this.debug(`DEBUG Closing browser`);

    await browser.close();

    this.ux.stopSpinner("Done.");

    return { message: `Suspended ${mapSharingLabel.get(this.flags.scope)} Calculations` };
  }
}
