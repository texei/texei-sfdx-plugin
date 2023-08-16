/* eslint-disable @typescript-eslint/no-unsafe-member-access */
/* eslint-disable @typescript-eslint/no-unsafe-call */
/* eslint-disable @typescript-eslint/restrict-template-expressions */
/* eslint-disable @typescript-eslint/no-unsafe-argument */
/* eslint-disable @typescript-eslint/no-unsafe-assignment */
import {
  SfCommand,
  Flags,
  orgApiVersionFlagWithDeprecations,
  requiredOrgFlagWithDeprecations,
} from '@salesforce/sf-plugins-core';
import { Messages } from '@salesforce/core';
import { StandardValueSetHelper } from '../../../../shared/standardValueSetHelper';

// Initialize Messages with the current plugin directory
Messages.importMessagesDirectory(__dirname);

// Load the specific messages for this file. Messages from @salesforce/command, @salesforce/core,
// or any library that is using the messages framework can also be loaded this way.
const messages = Messages.loadMessages('texei-sfdx-plugin', 'contractstatus.value.add');

export type ContractStatusValueAddResult = {
  message: string;
};

export default class Add extends SfCommand<ContractStatusValueAddResult> {
  public static readonly summary = messages.getMessage('summary');

  public static readonly examples = [
    "sf texei contractstatus value add --label 'My New Contract Status Label' --apiname 'My New Contract Status API Name' --target-org texei",
  ];

  public static readonly flags = {
    'target-org': requiredOrgFlagWithDeprecations,
    'api-version': orgApiVersionFlagWithDeprecations,
    label: Flags.string({ char: 'l', summary: messages.getMessage('flags.label.summary'), required: true }),
    apiname: Flags.string({ char: 'a', summary: messages.getMessage('flags.apiname.summary'), required: true }),
    statuscategory: Flags.string({
      char: 's',
      summary: messages.getMessage('flags.statuscategory.summary'),
      options: ['Draft', 'Activated', 'InApprovalProcess'],
      default: 'Draft',
      required: false,
    }),
  };

  public async run(): Promise<ContractStatusValueAddResult> {
    const { flags } = await this.parse(Add);

    this.warn(
      'ContractStatus StandardValueSet is now supported, you should move to the Metadata API instead of using this command.'
    );

    this.spinner.start(`Adding ContractStatus value (${flags.label}/${flags.apiname})`, undefined, { stdout: true });

    const connection = flags['target-org'].getConnection(flags['api-version']);

    const svsh = new StandardValueSetHelper(connection, 'ContractStatus');
    await svsh.addValue(flags.label, flags.apiname, flags.statuscategory);
    await svsh.close();

    this.spinner.stop('Done.');

    return { message: 'ContractStatus value added' };
  }
}
