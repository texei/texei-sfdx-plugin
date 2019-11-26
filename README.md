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
* [`sfdx texei:data:export -o <string> -d <string> [-u <string>] [--apiversion <string>] [--json] [--loglevel trace|debug|info|warn|error|fatal|TRACE|DEBUG|INFO|WARN|ERROR|FATAL]`](#sfdx-texeidataexport--o-string--d-string--u-string---apiversion-string---json---loglevel-tracedebuginfowarnerrorfataltracedebuginfowarnerrorfatal)
* [`sfdx texei:data:import -d <string> [-u <string>] [--apiversion <string>] [--json] [--loglevel trace|debug|info|warn|error|fatal|TRACE|DEBUG|INFO|WARN|ERROR|FATAL]`](#sfdx-texeidataimport--d-string--u-string---apiversion-string---json---loglevel-tracedebuginfowarnerrorfataltracedebuginfowarnerrorfatal)
* [`sfdx texei:org:contractfieldhistory:fix [-u <string>] [--apiversion <string>] [--json] [--loglevel trace|debug|info|warn|error|fatal|TRACE|DEBUG|INFO|WARN|ERROR|FATAL]`](#sfdx-texeiorgcontractfieldhistoryfix--u-string---apiversion-string---json---loglevel-tracedebuginfowarnerrorfataltracedebuginfowarnerrorfatal)
* [`sfdx texei:package:dependencies:install [-k <string>] [-b <string>] [-p <string>] [-s <string>] [-n <string>] [-w <number>] [-r] [-v <string>] [-u <string>] [--apiversion <string>] [--json] [--loglevel trace|debug|info|warn|error|fatal|TRACE|DEBUG|INFO|WARN|ERROR|FATAL]`](#sfdx-texeipackagedependenciesinstall--k-string--b-string--p-string--s-string--n-string--w-number--r--v-string--u-string---apiversion-string---json---loglevel-tracedebuginfowarnerrorfataltracedebuginfowarnerrorfatal)
* [`sfdx texei:profile:clean [-k <string>] [-p <string>] [--json] [--loglevel trace|debug|info|warn|error|fatal|TRACE|DEBUG|INFO|WARN|ERROR|FATAL]`](#sfdx-texeiprofileclean--k-string--p-string---json---loglevel-tracedebuginfowarnerrorfataltracedebuginfowarnerrorfatal)
* [`sfdx texei:skinnyprofile:retrieve [-t <string>] [-v <string>] [-u <string>] [--apiversion <string>] [--json] [--loglevel trace|debug|info|warn|error|fatal|TRACE|DEBUG|INFO|WARN|ERROR|FATAL]`](#sfdx-texeiskinnyprofileretrieve--t-string--v-string--u-string---apiversion-string---json---loglevel-tracedebuginfowarnerrorfataltracedebuginfowarnerrorfatal)
* [`sfdx texei:source:customlabel:replace -l <string> -v <string> [-p <string>] [--json] [--loglevel trace|debug|info|warn|error|fatal|TRACE|DEBUG|INFO|WARN|ERROR|FATAL]`](#sfdx-texeisourcecustomlabelreplace--l-string--v-string--p-string---json---loglevel-tracedebuginfowarnerrorfataltracedebuginfowarnerrorfatal)
* [`sfdx texei:source:layouts:cleanorg [-p <string>] [-v <string>] [-u <string>] [--apiversion <string>] [--json] [--loglevel trace|debug|info|warn|error|fatal|TRACE|DEBUG|INFO|WARN|ERROR|FATAL]`](#sfdx-texeisourcelayoutscleanorg--p-string--v-string--u-string---apiversion-string---json---loglevel-tracedebuginfowarnerrorfataltracedebuginfowarnerrorfatal)
* [`sfdx texei:user:update [-v <string>] [-u <string>] [--apiversion <string>] [--json] [--loglevel trace|debug|info|warn|error|fatal|TRACE|DEBUG|INFO|WARN|ERROR|FATAL]`](#sfdx-texeiuserupdate--v-string--u-string---apiversion-string---json---loglevel-tracedebuginfowarnerrorfataltracedebuginfowarnerrorfatal)

## `sfdx texei:data:export -o <string> -d <string> [-u <string>] [--apiversion <string>] [--json] [--loglevel trace|debug|info|warn|error|fatal|TRACE|DEBUG|INFO|WARN|ERROR|FATAL]`

export objects' data from org

```
USAGE
  $ sfdx texei:data:export -o <string> -d <string> [-u <string>] [--apiversion <string>] [--json] [--loglevel 
  trace|debug|info|warn|error|fatal|TRACE|DEBUG|INFO|WARN|ERROR|FATAL]

OPTIONS
  -d, --outputdir=outputdir                                                         (required) directory where to store
                                                                                    files

  -o, --objects=objects                                                             (required) comma-separated list of
                                                                                    objects to export

  -u, --targetusername=targetusername                                               username or alias for the target
                                                                                    org; overrides default target org

  --apiversion=apiversion                                                           override the api version used for
                                                                                    api requests made by this command

  --json                                                                            format output as json

  --loglevel=(trace|debug|info|warn|error|fatal|TRACE|DEBUG|INFO|WARN|ERROR|FATAL)  [default: warn] logging level for
                                                                                    this command invocation

EXAMPLE
  $ sfdx texei:data:export --objects Account,Contact,MyCustomObject__c --outputdir ./data --targetusername texei
     Data exported!
```

_See code: [src/commands/texei/data/export.ts](https://github.com/texei/texei-sfdx-plugin/blob/v1.2.2/src/commands/texei/data/export.ts)_

## `sfdx texei:data:import -d <string> [-u <string>] [--apiversion <string>] [--json] [--loglevel trace|debug|info|warn|error|fatal|TRACE|DEBUG|INFO|WARN|ERROR|FATAL]`

import objects' data to org

```
USAGE
  $ sfdx texei:data:import -d <string> [-u <string>] [--apiversion <string>] [--json] [--loglevel 
  trace|debug|info|warn|error|fatal|TRACE|DEBUG|INFO|WARN|ERROR|FATAL]

OPTIONS
  -d, --inputdir=inputdir                                                           (required) directory with files to
                                                                                    import

  -u, --targetusername=targetusername                                               username or alias for the target
                                                                                    org; overrides default target org

  --apiversion=apiversion                                                           override the api version used for
                                                                                    api requests made by this command

  --json                                                                            format output as json

  --loglevel=(trace|debug|info|warn|error|fatal|TRACE|DEBUG|INFO|WARN|ERROR|FATAL)  [default: warn] logging level for
                                                                                    this command invocation

EXAMPLE
  $ sfdx texei:data:import --inputdir ./data --targetusername texei-scratch
     Data imported!
```

_See code: [src/commands/texei/data/import.ts](https://github.com/texei/texei-sfdx-plugin/blob/v1.2.2/src/commands/texei/data/import.ts)_

## `sfdx texei:org:contractfieldhistory:fix [-u <string>] [--apiversion <string>] [--json] [--loglevel trace|debug|info|warn|error|fatal|TRACE|DEBUG|INFO|WARN|ERROR|FATAL]`

fix Contract Field History Tracking that can't be deployed

```
USAGE
  $ sfdx texei:org:contractfieldhistory:fix [-u <string>] [--apiversion <string>] [--json] [--loglevel 
  trace|debug|info|warn|error|fatal|TRACE|DEBUG|INFO|WARN|ERROR|FATAL]

OPTIONS
  -u, --targetusername=targetusername                                               username or alias for the target
                                                                                    org; overrides default target org

  --apiversion=apiversion                                                           override the api version used for
                                                                                    api requests made by this command

  --json                                                                            format output as json

  --loglevel=(trace|debug|info|warn|error|fatal|TRACE|DEBUG|INFO|WARN|ERROR|FATAL)  [default: warn] logging level for
                                                                                    this command invocation

EXAMPLE
  $ sfdx texei:org:contractfieldhistory:fix" 
  History tracking fixed.
```

_See code: [src/commands/texei/org/contractfieldhistory/fix.ts](https://github.com/texei/texei-sfdx-plugin/blob/v1.2.2/src/commands/texei/org/contractfieldhistory/fix.ts)_

## `sfdx texei:package:dependencies:install [-k <string>] [-b <string>] [-p <string>] [-s <string>] [-n <string>] [-w <number>] [-r] [-v <string>] [-u <string>] [--apiversion <string>] [--json] [--loglevel trace|debug|info|warn|error|fatal|TRACE|DEBUG|INFO|WARN|ERROR|FATAL]`

install dependent Packages for a sfdx project

```
USAGE
  $ sfdx texei:package:dependencies:install [-k <string>] [-b <string>] [-p <string>] [-s <string>] [-n <string>] [-w 
  <number>] [-r] [-v <string>] [-u <string>] [--apiversion <string>] [--json] [--loglevel 
  trace|debug|info|warn|error|fatal|TRACE|DEBUG|INFO|WARN|ERROR|FATAL]

OPTIONS
  -b, --branch=branch                                                               the package version’s branch

  -k, --installationkeys=installationkeys                                           installation key for key-protected
                                                                                    packages (format is 1:MyPackage1Key
                                                                                    2: 3:MyPackage3Key... to allow some
                                                                                    packages without installation key)

  -n, --namespaces=namespaces                                                       filter package installation by
                                                                                    namespace

  -p, --packages=packages                                                           comma-separated list of the packages
                                                                                    to install related dependencies

  -r, --noprompt                                                                    allow Remote Site Settings and
                                                                                    Content Security Policy websites to
                                                                                    send or receive data without
                                                                                    confirmation

  -s, --securitytype=securitytype                                                   security access type for the
                                                                                    installed package (see
                                                                                    force:package:install for default
                                                                                    value)

  -u, --targetusername=targetusername                                               username or alias for the target
                                                                                    org; overrides default target org

  -v, --targetdevhubusername=targetdevhubusername                                   username or alias for the dev hub
                                                                                    org; overrides default dev hub org

  -w, --wait=wait                                                                   number of minutes to wait for
                                                                                    installation status (also used for
                                                                                    publishwait). Default is 10

  --apiversion=apiversion                                                           override the api version used for
                                                                                    api requests made by this command

  --json                                                                            format output as json

  --loglevel=(trace|debug|info|warn|error|fatal|TRACE|DEBUG|INFO|WARN|ERROR|FATAL)  [default: warn] logging level for
                                                                                    this command invocation

EXAMPLE
  $ texei:package:dependencies:install -u MyScratchOrg -v MyDevHub -k "1:MyPackage1Key 2: 3:MyPackage3Key" -b "DEV"
```

_See code: [src/commands/texei/package/dependencies/install.ts](https://github.com/texei/texei-sfdx-plugin/blob/v1.2.2/src/commands/texei/package/dependencies/install.ts)_

## `sfdx texei:profile:clean [-k <string>] [-p <string>] [--json] [--loglevel trace|debug|info|warn|error|fatal|TRACE|DEBUG|INFO|WARN|ERROR|FATAL]`

clean Profile by removing permissions stored on Permission Set

```
USAGE
  $ sfdx texei:profile:clean [-k <string>] [-p <string>] [--json] [--loglevel 
  trace|debug|info|warn|error|fatal|TRACE|DEBUG|INFO|WARN|ERROR|FATAL]

OPTIONS
  -k, --keep=keep                                                                   comma-separated list of profile node
                                                                                    permissions that need to be kept.
                                                                                    Default:
                                                                                    layoutAssignments,loginHours,loginIp
                                                                                    Ranges,custom,userLicense

  -p, --path=path                                                                   comma-separated list of profiles, or
                                                                                    path to profiles folder. Default:
                                                                                    default package directory

  --json                                                                            format output as json

  --loglevel=(trace|debug|info|warn|error|fatal|TRACE|DEBUG|INFO|WARN|ERROR|FATAL)  [default: warn] logging level for
                                                                                    this command invocation

EXAMPLES
  $ texei:profile:clean -k layoutAssignments,recordTypeVisibilities
  $ texei:profile:clean -p custom-sfdx-source-folder/main/profiles
  $ texei:profile:clean -p 
  custom-sfdx-source-folder/main/profiles,source-folder-2/main/profiles/myAdmin.profile-meta.xml
```

_See code: [src/commands/texei/profile/clean.ts](https://github.com/texei/texei-sfdx-plugin/blob/v1.2.2/src/commands/texei/profile/clean.ts)_

## `sfdx texei:skinnyprofile:retrieve [-t <string>] [-v <string>] [-u <string>] [--apiversion <string>] [--json] [--loglevel trace|debug|info|warn|error|fatal|TRACE|DEBUG|INFO|WARN|ERROR|FATAL]`

export a skinny profile with just package-specific metadata

```
USAGE
  $ sfdx texei:skinnyprofile:retrieve [-t <string>] [-v <string>] [-u <string>] [--apiversion <string>] [--json] 
  [--loglevel trace|debug|info|warn|error|fatal|TRACE|DEBUG|INFO|WARN|ERROR|FATAL]

OPTIONS
  -t, --timeout=timeout                                                             timeout(ms) for profile retrieve
                                                                                    (Default: 60000ms)

  -u, --targetusername=targetusername                                               username or alias for the target
                                                                                    org; overrides default target org

  -v, --targetdevhubusername=targetdevhubusername                                   username or alias for the dev hub
                                                                                    org; overrides default dev hub org

  --apiversion=apiversion                                                           override the api version used for
                                                                                    api requests made by this command

  --json                                                                            format output as json

  --loglevel=(trace|debug|info|warn|error|fatal|TRACE|DEBUG|INFO|WARN|ERROR|FATAL)  [default: warn] logging level for
                                                                                    this command invocation

EXAMPLE
  $ texei:skinnyprofile:retrieve -u MyScratchOrg
```

_See code: [src/commands/texei/skinnyprofile/retrieve.ts](https://github.com/texei/texei-sfdx-plugin/blob/v1.2.2/src/commands/texei/skinnyprofile/retrieve.ts)_

## `sfdx texei:source:customlabel:replace -l <string> -v <string> [-p <string>] [--json] [--loglevel trace|debug|info|warn|error|fatal|TRACE|DEBUG|INFO|WARN|ERROR|FATAL]`

replace custom label value

```
USAGE
  $ sfdx texei:source:customlabel:replace -l <string> -v <string> [-p <string>] [--json] [--loglevel 
  trace|debug|info|warn|error|fatal|TRACE|DEBUG|INFO|WARN|ERROR|FATAL]

OPTIONS
  -l, --label=label                                                                 (required) custom label to replace
  -p, --path=path                                                                   path to custom label
  -v, --value=value                                                                 (required) new custom label
  --json                                                                            format output as json

  --loglevel=(trace|debug|info|warn|error|fatal|TRACE|DEBUG|INFO|WARN|ERROR|FATAL)  [default: warn] logging level for
                                                                                    this command invocation

EXAMPLE
  $ texei:source:customlabel:replace --label GreatSalesforceBlog --value https://blog.texei.com
```

_See code: [src/commands/texei/source/customlabel/replace.ts](https://github.com/texei/texei-sfdx-plugin/blob/v1.2.2/src/commands/texei/source/customlabel/replace.ts)_

## `sfdx texei:source:layouts:cleanorg [-p <string>] [-v <string>] [-u <string>] [--apiversion <string>] [--json] [--loglevel trace|debug|info|warn|error|fatal|TRACE|DEBUG|INFO|WARN|ERROR|FATAL]`

delete unused standard layouts from scratch org

```
USAGE
  $ sfdx texei:source:layouts:cleanorg [-p <string>] [-v <string>] [-u <string>] [--apiversion <string>] [--json] 
  [--loglevel trace|debug|info|warn|error|fatal|TRACE|DEBUG|INFO|WARN|ERROR|FATAL]

OPTIONS
  -p, --path=path                                                                   path to layouts

  -u, --targetusername=targetusername                                               username or alias for the target
                                                                                    org; overrides default target org

  -v, --targetdevhubusername=targetdevhubusername                                   username or alias for the dev hub
                                                                                    org; overrides default dev hub org

  --apiversion=apiversion                                                           override the api version used for
                                                                                    api requests made by this command

  --json                                                                            format output as json

  --loglevel=(trace|debug|info|warn|error|fatal|TRACE|DEBUG|INFO|WARN|ERROR|FATAL)  [default: warn] logging level for
                                                                                    this command invocation

EXAMPLES
  $ texei:source:layouts:cleanorg
  $ texei:source:layouts:cleanorg --targetusername myScratchOrg --targetdevhubusername myDevHub
```

_See code: [src/commands/texei/source/layouts/cleanorg.ts](https://github.com/texei/texei-sfdx-plugin/blob/v1.2.2/src/commands/texei/source/layouts/cleanorg.ts)_

## `sfdx texei:user:update [-v <string>] [-u <string>] [--apiversion <string>] [--json] [--loglevel trace|debug|info|warn|error|fatal|TRACE|DEBUG|INFO|WARN|ERROR|FATAL]`

updates the current user of a scratch org

```
USAGE
  $ sfdx texei:user:update [-v <string>] [-u <string>] [--apiversion <string>] [--json] [--loglevel 
  trace|debug|info|warn|error|fatal|TRACE|DEBUG|INFO|WARN|ERROR|FATAL]

OPTIONS
  -u, --targetusername=targetusername                                               username or alias for the target
                                                                                    org; overrides default target org

  -v, --values=values                                                               the <fieldName>=<value> pairs you’re
                                                                                    updating

  --apiversion=apiversion                                                           override the api version used for
                                                                                    api requests made by this command

  --json                                                                            format output as json

  --loglevel=(trace|debug|info|warn|error|fatal|TRACE|DEBUG|INFO|WARN|ERROR|FATAL)  [default: warn] logging level for
                                                                                    this command invocation

EXAMPLES
  $ sfdx texei:user:update --targetusername myOrg@example.com --values "LanguageLocaleKey='fr'" 
  Successfully updated record: 005D2A90N8A11SVPE2.
  $ sfdx texei:user:update  --values "UserPermissionsKnowledgeUser=true --json"
```

_See code: [src/commands/texei/user/update.ts](https://github.com/texei/texei-sfdx-plugin/blob/v1.2.2/src/commands/texei/user/update.ts)_
<!-- commandsstop -->
