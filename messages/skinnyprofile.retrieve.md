# summary

export a skinny profile with just profile-specific metadata

# description

This command will retrieve Profiles, and keep only what can't be on a Permission Set. All other reference to metadata will be removed.
Only access to what's in your project will be listed in the Profile metadata.

The command:

- list all Profiles in local project
- look at Page Layouts, Record Types and Custom Applications in your local project
- will retrieve listed Profiles with access rights for metadata from the previous step
- will keep access for Page Layouts, default Record Types and Default custom application
- will remove everything that should be on a Permission Set(Field Level Security, Apex Classes access, Tab visibilities, etc...)
- save the Profiles locally

# examples

sf texei skinnyprofile retrieve --target-org MyScratchOrg

# flags.timeout.summary

timeout(ms) for profile retrieve (Default: 60000ms)
