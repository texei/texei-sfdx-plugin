import { expect } from '@salesforce/command/lib/test';
import Retrieve from '../../../../src/commands/texei/skinnyprofile/retrieve';
import * as path from 'path';
var fs = require('fs');
const util = require('util');

describe('skinnyprofile:retrieve', () => {
    const retrieve:Retrieve = new Retrieve([],null);

    it('retrieves a profile with only profile-specific nodes', async () => {
        const readFile = util.promisify(fs.readFile);
        const profileMetadata = await readFile(path.join('test','commands','texei','skinnyprofile','dummy.profile-meta.xml'));
        const cleanedProfile = await retrieve.cleanProfile(profileMetadata) as string;

        // Testing all nodes that should be removed
        for (const val of retrieve.nodesToRemove) {
            expect(cleanedProfile.includes(val), `node '${val}' should have been removed from profile :( `).to.equal(false);  
        }


        // Testing manually that for some nodes only default are still there (see retrieve.nodesHavingDefault))
        // applicationVisibilities
        expect(cleanedProfile.includes('DefaultApp'), `Default Application ('DefaultApp') should have been kept in profile :( `).to.equal(true);  
        expect(cleanedProfile.includes('NotDefaultApp'), `Non Default Application ('NotDefaultApp') should have been removed from profile :( `).to.equal(false);   
            
        // recordTypeVisibilities
        expect(cleanedProfile.includes('Account.AccountRecordTypeDefault'), `Default Record Type ('Account.AccountRecordTypeDefault') should have been kept in profile :( `).to.equal(true);  
        expect(cleanedProfile.includes('Account.AccountRecordTypeNotDefault'), `Default Record Type ('Account.AccountRecordTypeNotDefault') should have been removed from profile :( `).to.equal(false);  
        

        // Testing manually that some nodes are still there
        const nodesToKeep = ['custom','layoutAssignments','loginHours','userLicense'];
        for (const val of nodesToKeep) {
            expect(cleanedProfile.includes(val), `node '${val}' should have been kept in profile :( `).to.equal(true);  
        }
    });
});