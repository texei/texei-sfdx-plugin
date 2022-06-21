import { SfdxCommand, flags } from "@salesforce/command";
import { Messages, SfdxError } from '@salesforce/core';
import * as puppeteer from "puppeteer";
import * as path from "path";
import { promises as fs } from 'fs';

// Initialize Messages with the current plugin directory
Messages.importMessagesDirectory(__dirname);

// Load the specific messages for this file. Messages from @salesforce/command, @salesforce/core,
// or any library that is using the messages framework can also be loaded this way.
const messages = Messages.loadMessages(
  "texei-sfdx-plugin",
  "cpqsettings-set"
);

export default class Set extends SfdxCommand {
  public static description = messages.getMessage("commandDescription");

  public static examples = [
    `sfdx texei:cpqsettings:set`
  ];

  protected static flagsConfig = {
    inputfile: flags.string({
        char: "f",
        description: messages.getMessage("inputFlagDescription"),
        required: true
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

    // Get Config File
    const filePath = path.join(process.cwd(), this.flags.inputfile);
    const cpqSettings = JSON.parse((await fs.readFile(filePath)).toString());

    // Get Org URL
    const instanceUrl = this.org.getConnection().instanceUrl;
    const cpqSettingsUrl = await this.getSettingURL();

    // Init browser
    const browser = await puppeteer.launch({
        args: ['--no-sandbox', '--disable-setuid-sandbox'],
        headless: !(process.env.BROWSER_DEBUG === 'true')
    });
    const page = await browser.newPage();
    await page.goto(
        `${instanceUrl}/secur/frontdoor.jsp?sid=${this.org.getConnection().accessToken}`,
        { waitUntil: ["domcontentloaded", "networkidle0"] }
    );
    const navigationPromise = page.waitForNavigation();

    await page.goto(`${cpqSettingsUrl}`);
    await navigationPromise;

    // Looking for all elements to update
    // Iterating on tabs
    for (const tabKey of Object.keys(cpqSettings)) {
        this.ux.log(`Switching to tab ${tabKey}`);
        result[tabKey] = {};

        // Getting id for label
        const tabs = await page.$x(`//td[contains(text(), '${tabKey}')]`);

        // Clicking on tab
        await tabs[0].click();
        await navigationPromise;
    
        // For all fields on tab
        for (const key of Object.keys(cpqSettings[tabKey])) {
            this.ux.startSpinner(`Looking for '${key}'`, null, { stdout: true });

            // Getting id for label
            const labels = await page.$x(`//label[contains(text(), '${key}')]`);
            const attributeId: string = await (await labels[0].getProperty('htmlFor')).jsonValue();
            const escapedAttributeId = attributeId.replace(/\:/g, '\\:');

            // Getting target input
            console.log(escapedAttributeId);
            const targetInput = await page.$(`#${escapedAttributeId}`);
            const targetType = await (await targetInput.getProperty('type')).jsonValue();

            let currentValue = '';

            if (targetType === 'checkbox') {
                currentValue = await (await targetInput.getProperty('checked')).jsonValue();

                if (currentValue !== cpqSettings[tabKey][key]) {
                    await targetInput.click();
                    await navigationPromise;
    
                    this.ux.stopSpinner(`Value updated from ${currentValue} to ${cpqSettings[tabKey][key]}`);
                }
                else {
                    this.ux.stopSpinner(`Value already ok`);
                }
            }
            else if (targetType === 'text') {
                currentValue = await (await targetInput.getProperty('value')).jsonValue();

                if (currentValue !== cpqSettings[tabKey][key]) {
                    //await page.focus(`#${escapedAttributeId}`);
                    // TODO: do it correctly
                    console.log('1');
                    await page.evaluate(() => {
                        return new Promise((resolve, reject) => {
                            try {
                                document.querySelector('#page\\:form\\:pb\\:j_id259\\:j_id265').setAttribute('value', '7');
                                console.log('2');
                                resolve('ok');
                            } catch (err) {
                                reject(err.toString());
                            }
                        });
                    });
                    console.log('3');

                    //await targetInput.click({clickCount: 3});
                    //await targetInput.press('Backspace'); 
                    //await targetInput.type(`${cpqSettings[tabKey][key]}`);
    
                    this.ux.stopSpinner(`Value updated from ${currentValue} to ${cpqSettings[tabKey][key]}`);
                }
                else {
                    this.ux.stopSpinner(`Value already ok`);
                }

            } 
            
            // Adding to result
            result[tabKey][key] = {
                'currentValue': currentValue,
                'newValue': cpqSettings[tabKey][key]
            };
        }
    }

    // Saving changes
    this.ux.startSpinner('Saving changes', null, { stdout: true });
    const saveButton = await page.$("#page\\:form input[value='Save']");
    await saveButton.click();
    await navigationPromise;
    // Timeout to wait for save, there should be a better way to do it
    await page.waitForTimeout(3000);

    // Look for errors
    const errors = await page.$('.message.errorM3 .messageText');
    if (errors) {
        let err: string = await (await errors.getProperty('innerText')).jsonValue();
        err = err.replace(/(\r\n|\n|\r)/gm, '');
        this.ux.stopSpinner('error');
        await browser.close();
        throw new SfdxError(err);
    }

    this.ux.stopSpinner('Done.');

    await browser.close();

    return result;
  }

  private async getSettingURL() {
    const instanceUrl = this.org.getConnection().instanceUrl;
    return `${instanceUrl.substring(0, instanceUrl.indexOf('.'))}--sbqq.visualforce.com/apex/EditSettings`;
  }
}