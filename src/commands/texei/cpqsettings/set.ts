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

    this.ux.log(`[Warning] This command is based on HTML parsing because of a lack of supported APIs, but may break at anytime. Use at your own risk.`);

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
            // Await because some fields only appears after a few seconds when checking another one
            await page.waitForXPath(`//label[contains(text(), '${key}')]`);
            const labels = await page.$x(`//label[contains(text(), '${key}')]`);
            let attributeId: string = await (await labels[0].getProperty('htmlFor')).jsonValue();
            let escapedAttributeId = '';

            if (!attributeId) {
                // unfortunately htmlFor isn't defined for picklists
                // this is very dirty :'(
                let parentId: string = await (await (await labels[0].getProperty('parentNode')).getProperty('id')).jsonValue();
                parentId = parentId.replace('_helpText-_help', '');
                const originalElementId: number = parseInt(parentId.substring(parentId.lastIndexOf(":j_id") + 5), 10);
                const finalElementId = originalElementId + 1;
                parentId = parentId.substring(0, parentId.length - originalElementId.toString().length);
                attributeId = parentId + finalElementId;
            } 

            escapedAttributeId = attributeId.replace(/\:/g, '\\:');

            // Getting target input
            //const targetInput = await page.$(`#${escapedAttributeId}`);
            let targetType = '';
            const targetInput = await page.$(`[name="${escapedAttributeId}"]`);
            const nodeType = await (await targetInput.getProperty('nodeName')).jsonValue();
            if (nodeType === 'INPUT') {
                targetType = await (await targetInput.getProperty('type')).jsonValue();
            }
            else if (nodeType === 'SELECT') {
                targetType = 'select';
            }

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
                    
                    await targetInput.click({clickCount: 3});
                    await targetInput.press('Backspace');
                    await targetInput.type(`${cpqSettings[tabKey][key]}`);
                    await page.keyboard.press("Tab");

                    this.ux.stopSpinner(`Value updated from ${currentValue} to ${cpqSettings[tabKey][key]}`);
                }
                else {
                    this.ux.stopSpinner(`Value already ok`);
                }
            } 
            else if (targetType === 'select') {
                
                await page.waitForXPath(`//select[@name="${attributeId}"]/option[text()='${cpqSettings[tabKey][key]}']`);
                const selectedOptionElement = await page.$(`select[name="${escapedAttributeId}"] option[selected]`);
                if (selectedOptionElement) {
                    // There is a value selected
                    currentValue = await (await (await page.$(`select[name="${escapedAttributeId}"] option[selected]`)).getProperty('text')).jsonValue();
                }
                else {
                    // No selected value
                    currentValue = '';
                }

                if (currentValue !== cpqSettings[tabKey][key]) {
                    
                    const optionElement = (await page.$x(`//select[@name="${attributeId}"]/option[text()='${cpqSettings[tabKey][key]}']`))[0];
                    await page.evaluate((optionElement) => {
                        optionElement.selected = true;
                    }, optionElement);
    
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