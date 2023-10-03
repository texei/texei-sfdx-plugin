import * as path from 'path';
import { promises as fs } from 'fs';
import { Config, expect } from '@salesforce/command/lib/test';
import Retrieve from '../../../../src/commands/texei/skinnyprofile/retrieve';
import { nodesNotAllowed } from '../../../../src/shared/skinnyProfileHelper';

describe('skinnyprofile:retrieve', () => {
  const config = new Config({ root: path.resolve(__dirname, '../../package.json') });
  const retrieve: Retrieve = new Retrieve([], config);

  it('retrieves a profile with only profile-specific nodes', async () => {
    const profileMetadata = await fs.readFile(
      path.join('test', 'commands', 'texei', 'skinnyprofile', 'dummy.profile-meta.xml'),
      'utf8'
    );
    const cleanedProfile = await retrieve.cleanProfile(profileMetadata);

    // Testing all nodes that should be removed
    for (const val of nodesNotAllowed) {
      expect(cleanedProfile.includes(val), `node '${val}' should have been removed from profile :( `).to.equal(false);
    }

    // Testing manually that for some nodes only default are still there (see retrieve.nodesHavingDefault))
    // applicationVisibilities
    expect(
      cleanedProfile.includes('DefaultApp'),
      "Default Application ('DefaultApp') should have been kept in profile :( "
    ).to.equal(true);
    expect(
      cleanedProfile.includes('NotDefaultApp'),
      "Non Default Application ('NotDefaultApp') should have been removed from profile :( "
    ).to.equal(false);

    // recordTypeVisibilities
    expect(
      cleanedProfile.includes('Account.AccountRecordTypeDefault'),
      "Default Record Type ('Account.AccountRecordTypeDefault') should have been kept in profile :( "
    ).to.equal(true);
    expect(
      cleanedProfile.includes('Account.AccountRecordTypeNotDefault'),
      "Default Record Type ('Account.AccountRecordTypeNotDefault') should have been removed from profile :( "
    ).to.equal(false);

    // Testing manually that some nodes are still there
    const nodesToKeep = ['custom', 'layoutAssignments', 'loginHours', 'userLicense'];
    for (const val of nodesToKeep) {
      expect(cleanedProfile.includes(val), `node '${val}' should have been kept in profile :( `).to.equal(true);
    }
  });
});
