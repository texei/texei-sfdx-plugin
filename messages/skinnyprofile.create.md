# summary

create a profile on target org with minimum access

# description

This command:

- looks at all Profiles in your target org
- looks at all custom Profiles in your project that are not in your target org
- create all custom Profiles missing in your target org as empty Profiles

The command creates Profiles one by one, so if one Profile creation fails (for instance a local Profile is using a license not available in the org), all previous Profiles will still be created in the org.

# examples

sf texei skinnyprofile create

# flags.path.summary

path to profiles folder. Default: default package directory

# flags.ignoreerrors.summary

if any profile creation fails, command exits as succeeded anyway
