# summary

empty a Profile directly in an Org [BETA]

# description

this command will empty a Profile, only leaving mandatory Permissions

No update to local Profile is done, but you'll be able to manually retrieve the updated Profile if needed

This command is based on the Profile metadata retrieved from the READ call of the Metadata API, which can have a few glitches like some applications or objects access not returned.

# examples

sf texei profile empty --profile-name 'My Profile'

# warning

This command is in BETA, test the emptied Profile, and report any issue at https://github.com/texei/texei-sfdx-plugin/issues

# flags.profile-name.summary

name of the Profile in the target org to empty

# flags.no-prompt.summary

allow to empty the Profile without confirmation
