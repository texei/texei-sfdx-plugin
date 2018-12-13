texei-sfdx-plugin
=================

Texeï&#39;s plugin for sfdx

## Install Plugin

### Install as plugin

Install plugin: sfdx plugins:install texei-sfdx-plugin

### Install from source

Install the SDFX CLI.

Clone the repository: git clone https://github.com/texei/texei-sfdx-plugin.git

Install npm modules: npm install

Link the plugin: sfdx plugins:link .

<!-- commands -->
* [`sfdx texei:package:dependencies:install`](#sfdx-texeipackagedependenciesinstall)
* [`sfdx texei:sandbox:delete`](#sfdx-texeisandboxdelete)
* [`sfdx texei:user:update`](#sfdx-texeiuserupdate)

## `sfdx texei:package:dependencies:install`

Install dependent Packages for a sfdx project

```
USAGE
  $ sfdx texei:package:dependencies:install

OPTIONS
  -b, --branch=branch                              the package version’s branch

  -k, --installationkeys=installationkeys          installation key for key-protected packages (format is
                                                   1:MyPackage1Key 2: 3:MyPackage3Key... to allow some packages without
                                                   installation key)

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
  $ texei:package:dependencies:install -u MyScratchOrg -v MyDevHub -k "1:MyPackage1Key 2: 3:MyPackage3Key" -b "DEV"
```

_See code: [src/commands/texei/package/dependencies/install.ts](https://github.com/texei/texei-sfdx-plugin/blob/v0.0.4/src/commands/texei/package/dependencies/install.ts)_

## `sfdx texei:sandbox:delete`

Delete a Sandbox

```
USAGE
  $ sfdx texei:sandbox:delete

OPTIONS
  -p, --noprompt                                  no prompt to confirm deletion
  -s, --sandboxname=sandboxname                   (required) Name of the Sandbox to delete
  -u, --targetusername=targetusername             username or alias for the target org; overrides default target org
  --apiversion=apiversion                         override the api version used for api requests made by this command
  --json                                          format output as json
  --loglevel=(trace|debug|info|warn|error|fatal)  logging level for this command invocation

EXAMPLE
  $ sfdx texei:sandbox:delete --targetusername myOrg@example.com
```

_See code: [src/commands/texei/sandbox/delete.ts](https://github.com/texei/texei-sfdx-plugin/blob/v0.0.4/src/commands/texei/sandbox/delete.ts)_

## `sfdx texei:user:update`

Updates the current user of a scratch org

```
USAGE
  $ sfdx texei:user:update

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

_See code: [src/commands/texei/user/update.ts](https://github.com/texei/texei-sfdx-plugin/blob/v0.0.4/src/commands/texei/user/update.ts)_
<!-- commandsstop -->
