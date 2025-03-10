# summary

add Authentication Parameters to existing an External Credential

# description

This commands will add Authentication Parameters to an existing External Credential and related Principal.
Both External Credential and Principal definition can be part of your metadata, for security reasons Authentication Parameters are not.
The expected format of the input JSON file is the same as the one expected by the REST API:
https://developer.salesforce.com/docs/atlas.en-us.chatterapi.meta/chatterapi/connect_requests_credential_input.htm
Best practice is to avoid commiting this file to your repository.

# examples

sf texei externalcredentials principals authenticationparameters add --file ./env/credentials.json --target-org MyScratchOrg

# flags.file.summary

file containing information of Authentication Parameters to add
