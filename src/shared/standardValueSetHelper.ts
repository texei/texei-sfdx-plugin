import { core } from "@salesforce/command";
import * as puppeteer from "puppeteer";

const standardValueSetPaths = new Map([
    ['ContractStatus', '/_ui/common/config/field/StandardFieldAttributes/d?id=Status&type=Contract']
]);

const contractStatusCategory = new Map([
    ['Draft', 'D'],
    ['Activated', 'A'],
    ['InApprovalProcess', 'P']
]);

export class StandardValueSetHelper {

    _connection;
    _standardValueSetName;
    _existingValues = [];
    browser;
    page;
    navigationPromise;

    constructor(connection: core.Connection, standardValueSetName: string) {
        this._connection = connection;
        this._standardValueSetName = standardValueSetName;
    }

    public async init() {

        this.browser = await puppeteer.launch({
            args: ["--no-sandbox", "--disable-setuid-sandbox"],
            headless: !(process.env.BROWSER_DEBUG === "true")
        });
        this.page = await this.browser.newPage();

        await this.page.goto(
            `${this._connection.instanceUrl}/secur/frontdoor.jsp?sid=${
                this._connection.accessToken
            }`,
            { waitUntil: ["domcontentloaded", "networkidle0"] }
        );

        this.navigationPromise = this.page.waitForNavigation();

        // Getting existing values
        const existingValuesQuery = `SELECT metadata FROM StandardValueSet where masterlabel='${this._standardValueSetName}'`;
        const existingValues = (await this._connection.tooling.query(existingValuesQuery)) as any;
        for (const sv of existingValues.records[0].Metadata.standardValue) {
            this._existingValues.push(`${sv.label}/${sv.valueName}`);
        }
    }

    public async addValue(label: string, apiName: string, statusCategory: string): Promise<string> {

        if (!this.browser) {
            await this.init();
        }

        let result = '';
        let error;

        // Checking that value doesn't already exists as is
        if (this._existingValues.includes(`${label}/${apiName}`)) {
            result = `Value ${label}/${apiName} already exists in Org, skipping`;
        }
        else {   
            // Navigate to StandardValueSetPage page
            const STANDARD_VALUE_SET_PATH = standardValueSetPaths.get(this._standardValueSetName);
            await this.page.goto(`${this._connection.instanceUrl + STANDARD_VALUE_SET_PATH}`);
            await this.navigationPromise;

            // Click on New
            await this.page.waitForSelector('.bRelatedList:nth-child(6) > .listRelatedObject > .bPageBlock > .pbHeader > table > tbody > tr > .pbButton > .btn:nth-child(1)');
            await Promise.all([
                this.page.click('.bRelatedList:nth-child(6) > .listRelatedObject > .bPageBlock > .pbHeader > table > tbody > tr > .pbButton > .btn:nth-child(1)'),
                this.page.waitForNavigation()
            ]);

            // label
            await this.page.waitForSelector('tbody #p1');
            await this.page.type('tbody #p1', label);

            // API Name
            await this.page.waitForSelector('tbody #p3');
            await this.page.type('tbody #p3', apiName);

            // Testing even though there is just this one supported for now
            if (this._standardValueSetName === 'ContractStatus') {
                // Status Category
                // TODO: Handle other Category than Draft
                await this.page.waitForSelector('tbody #p5');
                await this.page.click('tbody #p5');
                await this.page.select('tbody #p5', contractStatusCategory.get(statusCategory));
            }

            // Click Save
            await this.page.waitForSelector('table > tbody > tr > #bottomButtonRow > .btn:nth-child(1)');
            await Promise.all([
                this.page.click('table > tbody > tr > #bottomButtonRow > .btn:nth-child(1)'),
                this.page.waitForNavigation()
            ]);

            if (this.page.url().includes('picklist_masteredit')) {
                // We're still on the same page, something went wrong :/
                await this.page.waitForSelector('.errorMsg');
                const element = await this.page.$(".errorMsg");
                const textError = await (await element.getProperty('textContent')).jsonValue();
                error = `Something went wrong with value '${label}/${apiName}': ${textError}`;
            }
            else {
                result = 'Done.';
            }
        }

        return new Promise((resolve, reject) => {
            if (error) {
                reject(error);
            }
            else {
                resolve(result);
            }
        });
    }

    public async close() {
        await this.browser.close();
    }
}