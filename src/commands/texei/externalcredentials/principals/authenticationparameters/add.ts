import * as fs from 'node:fs';
import * as path from 'node:path';
import { SfCommand, Flags } from '@salesforce/sf-plugins-core';
import { Messages } from '@salesforce/core';

Messages.importMessagesDirectoryFromMetaUrl(import.meta.url);
const messages = Messages.loadMessages(
  'texei-sfdx-plugin',
  'externalcredentials.principals.authenticationparameters.add'
);

export type AuthenticationparametersAddResult = {
  commandResult: string;
};

export default class AuthenticationparametersAdd extends SfCommand<AuthenticationparametersAddResult> {
  public static readonly summary = messages.getMessage('summary');
  public static readonly description = messages.getMessage('description');
  public static readonly examples = messages.getMessages('examples');

  public static readonly flags = {
    'target-org': Flags.requiredOrg(),
    'api-version': Flags.orgApiVersion(),
    file: Flags.string({ char: 'f', summary: messages.getMessage('flags.file.summary'), required: true }),
  };

  public async run(): Promise<AuthenticationparametersAddResult> {
    const { flags } = await this.parse(AuthenticationparametersAdd);

    // Create a connection to the org
    let apiVersion = flags['api-version'];
    const connection = flags['target-org']?.getConnection(apiVersion);

    // if there is an api version set via the apiversion flag, use it
    // Otherwise use the latest api version available on the org
    if (!apiVersion) {
      apiVersion = await flags['target-org'].retrieveMaxApiVersion();
    }

    // Get File path
    const filePath = path.join(process.cwd(), flags.file);

    const credentialsJson = fs.readFileSync(filePath, 'utf8');

    const requestResult = await connection.request({
      method: 'POST',
      url: `${connection.instanceUrl}/services/data/v${apiVersion}/named-credentials/credential`,
      body: credentialsJson,
      headers: {
        'content-type': 'application/json',
      },
    });
    this.debug(requestResult as string);

    // Error will be thrown if the request fails, could definitely be improved
    this.log('Authentication Parameters added successfully');
    return { commandResult: 'success' };
  }
}
