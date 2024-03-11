# summary

convert a Profile to a Permission Set [BETA]

# description

this command converts in the target org a Profile to a Permission Set.

It will not use Profiles stored locally in your project but it will:

- dynamically retrieve the full Profile from your target org
- convert it to a Permission Set
- deploy it to the target org

No update to local Profile or Permission Set is done, but you'll be able to manually retrieve the created/updated Permission Set

# examples

sf texei profile convert --profile-name 'My Profile'

# warning

This command is in BETA, test the converted Permission Sets, and report any issue at https://github.com/texei/texei-sfdx-plugin/issues

# flags.profile-name.summary

name of the Profile in the target org to convert to a Permission Set

# flags.override-name.summary

override Permission Set Name generated from Profile name

# flags.override-api-name.summary

override API Name generated from Profile name
