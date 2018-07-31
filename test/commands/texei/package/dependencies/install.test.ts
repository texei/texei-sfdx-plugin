import { expect, test } from '@salesforce/command/dist/test';

describe('texei:package:dependencies:install', () => {
  test
    .withOrg({ username: 'test@org.com' }, true)
    .withConnectionRequest(function() {
      return Promise.resolve({ records: [ { Name: 'Super Awesome Org', TrialExpirationDate: '2018-03-20T23:24:11.000+0000'}]});
    })
    .stdout()
    .command(['texei:user:update', '--targetusername', 'test@org.com', '--values', '"LanguageLocaleKey=fr"'])
    .it('runs texei:user:update --targetusername test@org.com -v "LanguageLocaleKey=fr"', (ctx) => {
      expect(ctx.stdout).to.contain('Successfully updated record:');
    });
});
