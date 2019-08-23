const jsforce = require('jsforce');
import { Connection } from 'jsforce';
import { AuthFields } from '@salesforce/core';

// Creates a jsforce connection from an sfdx connection
// This is because sfdx uses an older version of jsforce and I want to use the latest one
// https://github.com/forcedotcom/sfdx-core/issues/141
export async function getJsforceConnection(authFields: AuthFields): Promise<Connection> {
    var conn = new jsforce.Connection({
        instanceUrl : authFields.instanceUrl,
        accessToken : authFields.accessToken
    });

    return conn;
}