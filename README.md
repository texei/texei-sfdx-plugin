texei-sfdx-plugin
=================

# TODO:

* For now all packages have to be on the same branch
* "Waiting for the package install request to complete. Status = IN_PROGRESS" messages are all sent when the install is complete

Texeï&#39;s plugin for sfdx

<!-- commands -->
* [`texei-sfdx-plugin texei:package:dependencies:install`](#texei-sfdx-plugin-texeipackagedependenciesinstall)
* [`texei-sfdx-plugin texei:user:update`](#texei-sfdx-plugin-texeiuserupdate)

## `texei-sfdx-plugin texei:package:dependencies:install`

Install dependent Packages for a sfdx project

```
USAGE
  $ texei-sfdx-plugin texei:package:dependencies:install

OPTIONS
  -b, --branch=branch                              the package version’s branch

  -k, --installationkeys=installationkeys          installation key for key-protected packages (format is
                                                   1:MyPackage1Key 2: 3:MyPackage3Key... to allow some packages without
                                                   installation key)

  -p, --package=package                            (required) ID (starts with 0Ho) or alias of the package to install
                                                   dependencies

  -r, --noprompt                                   allow Remote Site Settings and Content Security Policy websites to
                                                   send or receive data without confirmation

  -u, --targetusername=targetusername              username or alias for the target org; overrides default target org

  -v, --targetdevhubusername=targetdevhubusername  username or alias for the dev hub org; overrides default dev hub org

  -w, --wait=wait                                  number of minutes to wait for installation status (also used for
                                                   publishwait). Default is 10

  --apiversion=apiversion                          override the api version used for api requests made by this command

  --json                                           format output as json

  --loglevel=(trace|debug|info|warn|error|fatal)   logging level for this command invocation

EXAMPLE
  $ texei:package:dependencies:install -p "My Package" -u MyScratchOrg -v MyDevHub -k "1:MyPackage1Key 2: 
  3:MyPackage3Key" -b "DEV"
```

_See code: [src/commands/texei/package/dependencies/install.ts](https://github.com/texei/texei-sfdx-plugin/blob/v0.0.1/src/commands/texei/package/dependencies/install.ts)_

## `texei-sfdx-plugin texei:user:update`

Updates the current user of a scratch org

```
USAGE
  $ texei-sfdx-plugin texei:user:update

OPTIONS
  -u, --targetusername=targetusername             username or alias for the target org; overrides default target org
  -v, --values=values                             the <fieldName>=<value> pairs you’re updating
  --apiversion=apiversion                         override the api version used for api requests made by this command
  --json                                          format output as json
  --loglevel=(trace|debug|info|warn|error|fatal)  logging level for this command invocation

EXAMPLES
  $ sfdx texei:user:update --targetusername myOrg@example.com --values "LanguageLocaleKey='fr'"
     Successfully updated record: 005D2A90N8A11SVPE2.
  $ sfdx texei:user:update  --values "UserPermissionsKnowledgeUser=true --json"
```

_See code: [src/commands/texei/user/update.ts](https://github.com/texei/texei-sfdx-plugin/blob/v0.0.1/src/commands/texei/user/update.ts)_
<!-- commandsstop -->
