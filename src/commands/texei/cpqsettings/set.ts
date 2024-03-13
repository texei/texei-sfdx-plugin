/* eslint-disable @typescript-eslint/no-unsafe-member-access */
/* eslint-disable @typescript-eslint/no-unsafe-call */
/* eslint-disable @typescript-eslint/restrict-template-expressions */
/* eslint-disable @typescript-eslint/restrict-plus-operands */
/* eslint-disable @typescript-eslint/no-unsafe-argument */
/* eslint-disable @typescript-eslint/require-await */
/* eslint-disable @typescript-eslint/no-unsafe-assignment */
/* eslint-disable no-await-in-loop */
/* eslint-disable @typescript-eslint/explicit-function-return-type */
import * as path from 'node:path';
import { promises as fs } from 'node:fs';
import {
  SfCommand,
  Flags,
  orgApiVersionFlagWithDeprecations,
  requiredOrgFlagWithDeprecations,
  loglevel,
} from '@salesforce/sf-plugins-core';
import { Connection, Messages, Org, SfError } from '@salesforce/core';
import * as puppeteer from 'puppeteer';
import { ElementHandle } from 'puppeteer';

// Initialize Messages with the current plugin directory
Messages.importMessagesDirectory(__dirname);

// Load the specific messages for this file. Messages from @salesforce/command, @salesforce/core,
// or any library that is using the messages framework can also be loaded this way.
const messages = Messages.loadMessages('texei-sfdx-plugin', 'cpqsettings.set');

export type CpqSettingsSetResult = object;

export default class Set extends SfCommand<CpqSettingsSetResult> {
  public static readonly summary = messages.getMessage('summary');

  public static readonly examples = ['sf texei cpqsettings set --inputfile mySettings.json'];

  public static readonly flags = {
    'target-org': requiredOrgFlagWithDeprecations,
    'api-version': orgApiVersionFlagWithDeprecations,
    inputfile: Flags.string({ char: 'f', summary: messages.getMessage('flags.inputfile.summary'), required: true }),
    // loglevel is a no-op, but this flag is added to avoid breaking scripts and warn users who are using it
    loglevel,
  };

  private org!: Org;
  private conn!: Connection;

  public async run(): Promise<CpqSettingsSetResult> {
    const { flags } = await this.parse(Set);

    this.org = flags['target-org'];
    this.conn = this.org.getConnection(flags['api-version']);

    this.log(
      '[Warning] This command is based on HTML parsing because of a lack of supported APIs, but may break at anytime. Use at your own risk.'
    );

    const result = {};

    // Get Config File
    const filePath = path.join(process.cwd(), flags.inputfile);
    const cpqSettings = JSON.parse((await fs.readFile(filePath)).toString());

    // Get Org URL
    const instanceUrl = this.conn.instanceUrl;
    const frontdoorUrl = await this.getFrontdoorURL();
    const cpqSettingsUrl = await this.getSettingURL(instanceUrl);

    // Init browser
    const browser = await puppeteer.launch({
      args: ['--no-sandbox', '--disable-setuid-sandbox'],
      headless: !(process.env.BROWSER_DEBUG === 'true') ? 'new' : false,
    });
    const page = await browser.newPage();

    this.log(`Logging in to instance ${instanceUrl}`);
    await page.goto(frontdoorUrl, { waitUntil: ['domcontentloaded', 'networkidle0'] });
    const navigationPromise = page.waitForNavigation();

    this.log(`Navigating to CPQ Settings Page ${cpqSettingsUrl}`);
    await page.goto(`${cpqSettingsUrl}`);
    await navigationPromise;

    // Looking for all elements to update
    // Iterating on tabs
    for (const tabKey of Object.keys(cpqSettings)) {
      this.log(`Switching to tab ${tabKey}`);
      result[tabKey] = {};

      // Getting id for label
      const tabs = await page.$x(`//td[contains(text(), '${tabKey}')]`);
      if (tabs.length !== 1) this.error(`Tab ${tabKey} not found!`);

      // Clicking on tab
      const tab = tabs[0].asElement() as ElementHandle<Element>;
      await tab.click();
      await navigationPromise;

      // For all fields on tab
      for (const key of Object.keys(cpqSettings[tabKey])) {
        this.spinner.start(`Looking for '${key}'`, undefined, { stdout: true });

        // Getting label and traverse to corresponding input/select
        const xpath = `//label[contains(text(), '${key}')]/ancestor::th[contains(@class, 'labelCol')]/following-sibling::td[contains(@class, 'dataCol') or contains(@class, 'data2Col')][position()=1]//*[name()='select' or name()='input']`;

        // Await because some fields only appears after a few seconds when checking another one
        await page.waitForXPath(xpath);

        const targetInputs = await page.$x(xpath);
        const targetInput = targetInputs[0] as ElementHandle<Element>;

        let targetType = '';
        const nodeType = await (await targetInput?.getProperty('nodeName'))?.jsonValue();
        if (nodeType === 'INPUT') {
          targetType = (await (await targetInput?.getProperty('type'))?.jsonValue()) as string;
        } else if (nodeType === 'SELECT') {
          targetType = 'select';
        }

        const isInputDisabled = (await (await targetInput?.getProperty('disabled'))?.jsonValue()) as boolean;

        let currentValue = '';
        if (targetType === 'checkbox') {
          currentValue = (await (await targetInput?.getProperty('checked'))?.jsonValue()) as string;

          if (currentValue !== cpqSettings[tabKey][key]) {
            if (isInputDisabled)
              this.error(
                `Input '${key}' is read-only and cannot be updated from ${currentValue} to ${cpqSettings[tabKey][key]}`
              );

            await targetInput?.click();
            await navigationPromise;

            this.spinner.stop(`Checkbox Value updated from ${currentValue} to ${cpqSettings[tabKey][key]}`);
          } else {
            this.spinner.stop('Checkbox Value already ok');
          }
        } else if (targetType === 'text') {
          currentValue = (await (await targetInput?.getProperty('value'))?.jsonValue()) as string;

          if (currentValue !== cpqSettings[tabKey][key]) {
            if (isInputDisabled)
              this.error(
                `Input '${key}' is read-only and cannot be updated from ${currentValue} to ${cpqSettings[tabKey][key]}`
              );

            await targetInput?.click({ clickCount: 3 });
            await targetInput?.press('Backspace');
            await targetInput?.type(`${cpqSettings[tabKey][key]}`);
            await page.keyboard.press('Tab');

            this.spinner.stop(`Text Value updated from ${currentValue} to ${cpqSettings[tabKey][key]}`);
          } else {
            this.spinner.stop('Text Value already ok');
          }
        } else if (targetType === 'select') {
          await targetInput.waitForSelector(`xpath///option[text()='${cpqSettings[tabKey][key]}']`);
          const selectedOptionValue = await (await targetInput?.getProperty('value'))?.jsonValue();

          const selectedOptionElement = await targetInput.$(`option[value='${selectedOptionValue}']`);
          currentValue = (await (await selectedOptionElement?.getProperty('text'))?.jsonValue()) as string;

          if (currentValue !== cpqSettings[tabKey][key]) {
            if (isInputDisabled)
              this.error(
                `Input '${key}' is read-only and cannot be updated from ${currentValue} to ${cpqSettings[tabKey][key]}`
              );

            const optionElement = (
              await targetInput.$$(`xpath///option[text()='${cpqSettings[tabKey][key]}']`)
            )[0] as ElementHandle<HTMLOptionElement>;
            const optionValue = await (await optionElement.getProperty('value')).jsonValue();
            await targetInput.select(optionValue);

            this.spinner.stop(`Picklist Value updated from ${currentValue} to ${cpqSettings[tabKey][key]}`);
          } else {
            this.spinner.stop('Picklist Value already ok');
          }
        }

        // Adding to result
        result[tabKey][key] = {
          currentValue,
          newValue: cpqSettings[tabKey][key],
        };
      }
    }

    // Saving changes
    this.spinner.start('Saving changes', undefined, { stdout: true });
    const saveButton = await page.$("#page\\:form input[value='Save']");
    await saveButton?.click();
    await navigationPromise;
    // Timeout to wait for save, there should be a better way to do it
    await page.waitForTimeout(3000);

    // Look for errors
    const errors = await page.$('.message.errorM3 .messageText');
    if (errors) {
      let err: string = (await (await errors.getProperty('innerText')).jsonValue()) as string;
      err = err.replace(/(\r\n|\n|\r)/gm, '');
      this.spinner.stop('error');
      await browser.close();
      throw new SfError(err);
    }

    this.spinner.stop('Done.');

    await browser.close();

    return result;
  }

  private async getFrontdoorURL(): Promise<string> {
    await this.org.refreshAuth(); // we need a live accessToken for the frontdoor url
    const accessToken = this.conn.accessToken;
    const instanceUrl = this.conn.instanceUrl;
    const instanceUrlClean = instanceUrl.replace(/\/$/, '');
    return `${instanceUrlClean}/secur/frontdoor.jsp?sid=${accessToken}`;
  }

  // eslint-disable-next-line class-methods-use-this
  private async getSettingURL(urlOfInstance: string) {
    return `${urlOfInstance.substring(0, urlOfInstance.indexOf('.'))}--sbqq.visualforce.com/apex/EditSettings`;
  }
}
