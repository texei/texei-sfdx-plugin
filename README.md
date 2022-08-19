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
* [`sfdx texei:contractstatus:value:add -l <string> -a <string> [-s <string>] [-u <string>] [--apiversion <string>] [--json] [--loglevel trace|debug|info|warn|error|fatal|TRACE|DEBUG|INFO|WARN|ERROR|FATAL]`](#sfdx-texeicontractstatusvalueadd--l-string--a-string--s-string--u-string---apiversion-string---json---loglevel-tracedebuginfowarnerrorfataltracedebuginfowarnerrorfatal)
* [`sfdx texei:cpqsettings:set -f <string> [-u <string>] [--apiversion <string>] [--json] [--loglevel trace|debug|info|warn|error|fatal|TRACE|DEBUG|INFO|WARN|ERROR|FATAL]`](#sfdx-texeicpqsettingsset--f-string--u-string---apiversion-string---json---loglevel-tracedebuginfowarnerrorfataltracedebuginfowarnerrorfatal)
* [`sfdx texei:data:export -d <string> [-o <string>] [-p <string>] [-a <string>] [-u <string>] [--apiversion <string>] [--json] [--loglevel trace|debug|info|warn|error|fatal|TRACE|DEBUG|INFO|WARN|ERROR|FATAL]`](#sfdx-texeidataexport--d-string--o-string--p-string--a-string--u-string---apiversion-string---json---loglevel-tracedebuginfowarnerrorfataltracedebuginfowarnerrorfatal)
* [`sfdx texei:data:import -d <string> [-a] [-o] [-p <string>] [-u <string>] [--apiversion <string>] [--verbose] [--json] [--loglevel trace|debug|info|warn|error|fatal|TRACE|DEBUG|INFO|WARN|ERROR|FATAL]`](#sfdx-texeidataimport--d-string--a--o--p-string--u-string---apiversion-string---verbose---json---loglevel-tracedebuginfowarnerrorfataltracedebuginfowarnerrorfatal)
* [`sfdx texei:data:plan:generate -d <string> -o <string> [--json] [--loglevel trace|debug|info|warn|error|fatal|TRACE|DEBUG|INFO|WARN|ERROR|FATAL]`](#sfdx-texeidataplangenerate--d-string--o-string---json---loglevel-tracedebuginfowarnerrorfataltracedebuginfowarnerrorfatal)
* [`sfdx texei:debug:lwc:enable [-u <string>] [--apiversion <string>] [--json] [--loglevel trace|debug|info|warn|error|fatal|TRACE|DEBUG|INFO|WARN|ERROR|FATAL]`](#sfdx-texeidebuglwcenable--u-string---apiversion-string---json---loglevel-tracedebuginfowarnerrorfataltracedebuginfowarnerrorfatal)
* [`sfdx texei:org:contractfieldhistory:fix [-u <string>] [--apiversion <string>] [--json] [--loglevel trace|debug|info|warn|error|fatal|TRACE|DEBUG|INFO|WARN|ERROR|FATAL]`](#sfdx-texeiorgcontractfieldhistoryfix--u-string---apiversion-string---json---loglevel-tracedebuginfowarnerrorfataltracedebuginfowarnerrorfatal)
* [`sfdx texei:org:shape:extract [-d <string>] [-s <string>] [-u <string>] [--apiversion <string>] [--json] [--loglevel trace|debug|info|warn|error|fatal|TRACE|DEBUG|INFO|WARN|ERROR|FATAL]`](#sfdx-texeiorgshapeextract--d-string--s-string--u-string---apiversion-string---json---loglevel-tracedebuginfowarnerrorfataltracedebuginfowarnerrorfatal)
* [`sfdx texei:package:dependencies:install [-k <string>] [-b <string>] [-p <string>] [-s <string>] [-n <string>] [-w <number>] [-r] [-a <string>] [-v <string>] [-u <string>] [--apiversion <string>] [--json] [--loglevel trace|debug|info|warn|error|fatal|TRACE|DEBUG|INFO|WARN|ERROR|FATAL]`](#sfdx-texeipackagedependenciesinstall--k-string--b-string--p-string--s-string--n-string--w-number--r--a-string--v-string--u-string---apiversion-string---json---loglevel-tracedebuginfowarnerrorfataltracedebuginfowarnerrorfatal)
* [`sfdx texei:picklist:restrict -d <string> [-o] [-u <string>] [--apiversion <string>] [--json] [--loglevel trace|debug|info|warn|error|fatal|TRACE|DEBUG|INFO|WARN|ERROR|FATAL]`](#sfdx-texeipicklistrestrict--d-string--o--u-string---apiversion-string---json---loglevel-tracedebuginfowarnerrorfataltracedebuginfowarnerrorfatal)
* [`sfdx texei:picklist:unrestrict [-o] [-u <string>] [--apiversion <string>] [--json] [--loglevel trace|debug|info|warn|error|fatal|TRACE|DEBUG|INFO|WARN|ERROR|FATAL]`](#sfdx-texeipicklistunrestrict--o--u-string---apiversion-string---json---loglevel-tracedebuginfowarnerrorfataltracedebuginfowarnerrorfatal)
* [`sfdx texei:profile:clean [-k <string>] [-p <string>] [--json] [--loglevel trace|debug|info|warn|error|fatal|TRACE|DEBUG|INFO|WARN|ERROR|FATAL]`](#sfdx-texeiprofileclean--k-string--p-string---json---loglevel-tracedebuginfowarnerrorfataltracedebuginfowarnerrorfatal)
* [`sfdx texei:sharedactivities:enable [-u <string>] [--apiversion <string>] [--json] [--loglevel trace|debug|info|warn|error|fatal|TRACE|DEBUG|INFO|WARN|ERROR|FATAL]`](#sfdx-texeisharedactivitiesenable--u-string---apiversion-string---json---loglevel-tracedebuginfowarnerrorfataltracedebuginfowarnerrorfatal)
* [`sfdx texei:sharingcalc:recalculate [-s <string>] [-u <string>] [--apiversion <string>] [--json] [--loglevel trace|debug|info|warn|error|fatal|TRACE|DEBUG|INFO|WARN|ERROR|FATAL]`](#sfdx-texeisharingcalcrecalculate--s-string--u-string---apiversion-string---json---loglevel-tracedebuginfowarnerrorfataltracedebuginfowarnerrorfatal)
* [`sfdx texei:sharingcalc:resume [-s <string>] [-t <number>] [-u <string>] [--apiversion <string>] [--json] [--loglevel trace|debug|info|warn|error|fatal|TRACE|DEBUG|INFO|WARN|ERROR|FATAL]`](#sfdx-texeisharingcalcresume--s-string--t-number--u-string---apiversion-string---json---loglevel-tracedebuginfowarnerrorfataltracedebuginfowarnerrorfatal)
* [`sfdx texei:sharingcalc:suspend [-s <string>] [-t <number>] [-u <string>] [--apiversion <string>] [--json] [--loglevel trace|debug|info|warn|error|fatal|TRACE|DEBUG|INFO|WARN|ERROR|FATAL]`](#sfdx-texeisharingcalcsuspend--s-string--t-number--u-string---apiversion-string---json---loglevel-tracedebuginfowarnerrorfataltracedebuginfowarnerrorfatal)
* [`sfdx texei:skinnyprofile:check [-p <string>] [--json] [--loglevel trace|debug|info|warn|error|fatal|TRACE|DEBUG|INFO|WARN|ERROR|FATAL]`](#sfdx-texeiskinnyprofilecheck--p-string---json---loglevel-tracedebuginfowarnerrorfataltracedebuginfowarnerrorfatal)
* [`sfdx texei:skinnyprofile:retrieve [-t <string>] [-u <string>] [--apiversion <string>] [--json] [--loglevel trace|debug|info|warn|error|fatal|TRACE|DEBUG|INFO|WARN|ERROR|FATAL]`](#sfdx-texeiskinnyprofileretrieve--t-string--u-string---apiversion-string---json---loglevel-tracedebuginfowarnerrorfataltracedebuginfowarnerrorfatal)
* [`sfdx texei:source:customlabel:replace -l <string> -v <string> [-p <string>] [--json] [--loglevel trace|debug|info|warn|error|fatal|TRACE|DEBUG|INFO|WARN|ERROR|FATAL]`](#sfdx-texeisourcecustomlabelreplace--l-string--v-string--p-string---json---loglevel-tracedebuginfowarnerrorfataltracedebuginfowarnerrorfatal)
* [`sfdx texei:source:layouts:cleanorg [-p <string>] [-v <string>] [-u <string>] [--apiversion <string>] [--json] [--loglevel trace|debug|info|warn|error|fatal|TRACE|DEBUG|INFO|WARN|ERROR|FATAL]`](#sfdx-texeisourcelayoutscleanorg--p-string--v-string--u-string---apiversion-string---json---loglevel-tracedebuginfowarnerrorfataltracedebuginfowarnerrorfatal)
* [`sfdx texei:user:update [-v <string>] [-u <string>] [--apiversion <string>] [--json] [--loglevel trace|debug|info|warn|error|fatal|TRACE|DEBUG|INFO|WARN|ERROR|FATAL]`](#sfdx-texeiuserupdate--v-string--u-string---apiversion-string---json---loglevel-tracedebuginfowarnerrorfataltracedebuginfowarnerrorfatal)

## `sfdx texei:contractstatus:value:add -l <string> -a <string> [-s <string>] [-u <string>] [--apiversion <string>] [--json] [--loglevel trace|debug|info|warn|error|fatal|TRACE|DEBUG|INFO|WARN|ERROR|FATAL]`

[DEPRECATED - Use Metadata API instead] add a value to Contract Status picklist

```
USAGE
  $ sfdx texei:contractstatus:value:add -l <string> -a <string> [-s <string>] [-u <string>] [--apiversion <string>] 
  [--json] [--loglevel trace|debug|info|warn|error|fatal|TRACE|DEBUG|INFO|WARN|ERROR|FATAL]

OPTIONS
  -a, --apiname=apiname                                                             (required) API Name of the Contract
                                                                                    Status value to add

  -l, --label=label                                                                 (required) label of the Contract
                                                                                    Status value to add

  -s, --statuscategory=Draft|Activated|InApprovalProcess                            [default: Draft] Status Category of
                                                                                    the Contract Status value to add

  -u, --targetusername=targetusername                                               username or alias for the target
                                                                                    org; overrides default target org

  --apiversion=apiversion                                                           override the api version used for
                                                                                    api requests made by this command

  --json                                                                            format output as json

  --loglevel=(trace|debug|info|warn|error|fatal|TRACE|DEBUG|INFO|WARN|ERROR|FATAL)  [default: warn] logging level for
                                                                                    this command invocation

EXAMPLE
  sfdx texei:contractstatus:value:add --label 'My New Contract Status Label' --apiname 'My New Contract Status API Name'
   --targetusername texei
```

_See code: [src/commands/texei/contractstatus/value/add.ts](https://github.com/texei/texei-sfdx-plugin/blob/v1.16.1/src/commands/texei/contractstatus/value/add.ts)_

## `sfdx texei:cpqsettings:set -f <string> [-u <string>] [--apiversion <string>] [--json] [--loglevel trace|debug|info|warn|error|fatal|TRACE|DEBUG|INFO|WARN|ERROR|FATAL]`

set CPQ Settings from file

```
USAGE
  $ sfdx texei:cpqsettings:set -f <string> [-u <string>] [--apiversion <string>] [--json] [--loglevel 
  trace|debug|info|warn|error|fatal|TRACE|DEBUG|INFO|WARN|ERROR|FATAL]

OPTIONS
  -f, --inputfile=inputfile                                                         (required) path to CPQ Settings file

  -u, --targetusername=targetusername                                               username or alias for the target
                                                                                    org; overrides default target org

  --apiversion=apiversion                                                           override the api version used for
                                                                                    api requests made by this command

  --json                                                                            format output as json

  --loglevel=(trace|debug|info|warn|error|fatal|TRACE|DEBUG|INFO|WARN|ERROR|FATAL)  [default: warn] logging level for
                                                                                    this command invocation

EXAMPLE
  sfdx texei:cpqsettings:set
```

_See code: [src/commands/texei/cpqsettings/set.ts](https://github.com/texei/texei-sfdx-plugin/blob/v1.16.1/src/commands/texei/cpqsettings/set.ts)_

## `sfdx texei:data:export -d <string> [-o <string>] [-p <string>] [-a <string>] [-u <string>] [--apiversion <string>] [--json] [--loglevel trace|debug|info|warn|error|fatal|TRACE|DEBUG|INFO|WARN|ERROR|FATAL]`

export objects' data from org

```
USAGE
  $ sfdx texei:data:export -d <string> [-o <string>] [-p <string>] [-a <string>] [-u <string>] [--apiversion <string>] 
  [--json] [--loglevel trace|debug|info|warn|error|fatal|TRACE|DEBUG|INFO|WARN|ERROR|FATAL]

OPTIONS
  -a, --apitype=rest|bulk                                                           [default: rest] API Type to use

  -d, --outputdir=outputdir                                                         (required) directory where to store
                                                                                    files

  -o, --objects=objects                                                             comma-separated list of objects to
                                                                                    export

  -p, --dataplan=dataplan                                                           path to data plan file

  -u, --targetusername=targetusername                                               username or alias for the target
                                                                                    org; overrides default target org

  --apiversion=apiversion                                                           override the api version used for
                                                                                    api requests made by this command

  --json                                                                            format output as json

  --loglevel=(trace|debug|info|warn|error|fatal|TRACE|DEBUG|INFO|WARN|ERROR|FATAL)  [default: warn] logging level for
                                                                                    this command invocation

EXAMPLES
  sfdx texei:data:export --objects Account,Contact,MyCustomObject__c --outputdir ./data --targetusername texei
  sfdx texei:data:export --dataplan ./data/data-plan.json --outputdir ./data --targetusername texei
```

_See code: [src/commands/texei/data/export.ts](https://github.com/texei/texei-sfdx-plugin/blob/v1.16.1/src/commands/texei/data/export.ts)_

## `sfdx texei:data:import -d <string> [-a] [-o] [-p <string>] [-u <string>] [--apiversion <string>] [--verbose] [--json] [--loglevel trace|debug|info|warn|error|fatal|TRACE|DEBUG|INFO|WARN|ERROR|FATAL]`

import objects' data to org

```
USAGE
  $ sfdx texei:data:import -d <string> [-a] [-o] [-p <string>] [-u <string>] [--apiversion <string>] [--verbose] 
  [--json] [--loglevel trace|debug|info|warn|error|fatal|TRACE|DEBUG|INFO|WARN|ERROR|FATAL]

OPTIONS
  -a, --allornone                                                                   any failed records in a call cause
                                                                                    all changes for the call to be
                                                                                    rolled back

  -d, --inputdir=inputdir                                                           (required) directory with files to
                                                                                    import

  -o, --ignoreerrors                                                                errors are displayed as warnings
                                                                                    only and import will continue

  -p, --dataplan=dataplan                                                           path to data plan file

  -u, --targetusername=targetusername                                               username or alias for the target
                                                                                    org; overrides default target org

  --apiversion=apiversion                                                           override the api version used for
                                                                                    api requests made by this command

  --json                                                                            format output as json

  --loglevel=(trace|debug|info|warn|error|fatal|TRACE|DEBUG|INFO|WARN|ERROR|FATAL)  [default: warn] logging level for
                                                                                    this command invocation

  --verbose                                                                         verbose output of import result

EXAMPLE
  $ sfdx texei:data:import --inputdir ./data --targetusername texei-scratch
    Data imported!
```

_See code: [src/commands/texei/data/import.ts](https://github.com/texei/texei-sfdx-plugin/blob/v1.16.1/src/commands/texei/data/import.ts)_

## `sfdx texei:data:plan:generate -d <string> -o <string> [--json] [--loglevel trace|debug|info|warn|error|fatal|TRACE|DEBUG|INFO|WARN|ERROR|FATAL]`

generate a data plan used to export objects' data from org

```
USAGE
  $ sfdx texei:data:plan:generate -d <string> -o <string> [--json] [--loglevel 
  trace|debug|info|warn|error|fatal|TRACE|DEBUG|INFO|WARN|ERROR|FATAL]

OPTIONS
  -d, --outputdir=outputdir                                                         (required) directory where to store
                                                                                    the data plan file

  -o, --objects=objects                                                             (required) comma-separated list of
                                                                                    objects to add to the data plan

  --json                                                                            format output as json

  --loglevel=(trace|debug|info|warn|error|fatal|TRACE|DEBUG|INFO|WARN|ERROR|FATAL)  [default: warn] logging level for
                                                                                    this command invocation

EXAMPLE
  $ sfdx texei:data:plan:generate --objects Account,Contact,MyCustomObject__c --outputdir ./data
```

_See code: [src/commands/texei/data/plan/generate.ts](https://github.com/texei/texei-sfdx-plugin/blob/v1.16.1/src/commands/texei/data/plan/generate.ts)_

## `sfdx texei:debug:lwc:enable [-u <string>] [--apiversion <string>] [--json] [--loglevel trace|debug|info|warn|error|fatal|TRACE|DEBUG|INFO|WARN|ERROR|FATAL]`

Enable Debug Mode for Lightning Components

```
USAGE
  $ sfdx texei:debug:lwc:enable [-u <string>] [--apiversion <string>] [--json] [--loglevel 
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
  sfdx texei:debug:lwc:enable --targetusername myOrg@example.com
```

_See code: [src/commands/texei/debug/lwc/enable.ts](https://github.com/texei/texei-sfdx-plugin/blob/v1.16.1/src/commands/texei/debug/lwc/enable.ts)_

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

_See code: [src/commands/texei/org/contractfieldhistory/fix.ts](https://github.com/texei/texei-sfdx-plugin/blob/v1.16.1/src/commands/texei/org/contractfieldhistory/fix.ts)_

## `sfdx texei:org:shape:extract [-d <string>] [-s <string>] [-u <string>] [--apiversion <string>] [--json] [--loglevel trace|debug|info|warn|error|fatal|TRACE|DEBUG|INFO|WARN|ERROR|FATAL]`

[BETA] Extract Org Shape for an org

```
USAGE
  $ sfdx texei:org:shape:extract [-d <string>] [-s <string>] [-u <string>] [--apiversion <string>] [--json] [--loglevel 
  trace|debug|info|warn|error|fatal|TRACE|DEBUG|INFO|WARN|ERROR|FATAL]

OPTIONS
  -d, --outputdir=outputdir                                                         [default: config] the output
                                                                                    directory to store the extracted
                                                                                    definition file

  -s, --scope=basic|full|shaperepresentation                                        [default: basic] the scope of
                                                                                    settings to convert to the scratch
                                                                                    definition file

  -u, --targetusername=targetusername                                               username or alias for the target
                                                                                    org; overrides default target org

  --apiversion=apiversion                                                           override the api version used for
                                                                                    api requests made by this command

  --json                                                                            format output as json

  --loglevel=(trace|debug|info|warn|error|fatal|TRACE|DEBUG|INFO|WARN|ERROR|FATAL)  [default: warn] logging level for
                                                                                    this command invocation

EXAMPLE
  $ sfdx texei:org:shape:extract -u bulma@capsulecorp.com
```

_See code: [src/commands/texei/org/shape/extract.ts](https://github.com/texei/texei-sfdx-plugin/blob/v1.16.1/src/commands/texei/org/shape/extract.ts)_

## `sfdx texei:package:dependencies:install [-k <string>] [-b <string>] [-p <string>] [-s <string>] [-n <string>] [-w <number>] [-r] [-a <string>] [-v <string>] [-u <string>] [--apiversion <string>] [--json] [--loglevel trace|debug|info|warn|error|fatal|TRACE|DEBUG|INFO|WARN|ERROR|FATAL]`

install dependent Packages for a sfdx project

```
USAGE
  $ sfdx texei:package:dependencies:install [-k <string>] [-b <string>] [-p <string>] [-s <string>] [-n <string>] [-w 
  <number>] [-r] [-a <string>] [-v <string>] [-u <string>] [--apiversion <string>] [--json] [--loglevel 
  trace|debug|info|warn|error|fatal|TRACE|DEBUG|INFO|WARN|ERROR|FATAL]

OPTIONS
  -a, --apexcompile=apexcompile                                                     compile all Apex in the org and
                                                                                    package, or only Apex in the package
                                                                                    (see force:package:install for
                                                                                    default value)

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

_See code: [src/commands/texei/package/dependencies/install.ts](https://github.com/texei/texei-sfdx-plugin/blob/v1.16.1/src/commands/texei/package/dependencies/install.ts)_

## `sfdx texei:picklist:restrict -d <string> [-o] [-u <string>] [--apiversion <string>] [--json] [--loglevel trace|debug|info|warn|error|fatal|TRACE|DEBUG|INFO|WARN|ERROR|FATAL]`

[BETA] Add back restricted option on picklists

```
USAGE
  $ sfdx texei:picklist:restrict -d <string> [-o] [-u <string>] [--apiversion <string>] [--json] [--loglevel 
  trace|debug|info|warn|error|fatal|TRACE|DEBUG|INFO|WARN|ERROR|FATAL]

OPTIONS
  -d, --inputdir=inputdir                                                           (required) path to json file
                                                                                    generated by sfdx
                                                                                    texei:picklist:unrestrict --json >
                                                                                    my-file.json

  -o, --ignoreerrors                                                                errors are displayed as warnings
                                                                                    only and import will continue

  -u, --targetusername=targetusername                                               username or alias for the target
                                                                                    org; overrides default target org

  --apiversion=apiversion                                                           override the api version used for
                                                                                    api requests made by this command

  --json                                                                            format output as json

  --loglevel=(trace|debug|info|warn|error|fatal|TRACE|DEBUG|INFO|WARN|ERROR|FATAL)  [default: warn] logging level for
                                                                                    this command invocation

EXAMPLE
  $ sfdx texei:picklist:restrict -d my-unrestricted-picklists.json
```

_See code: [src/commands/texei/picklist/restrict.ts](https://github.com/texei/texei-sfdx-plugin/blob/v1.16.1/src/commands/texei/picklist/restrict.ts)_

## `sfdx texei:picklist:unrestrict [-o] [-u <string>] [--apiversion <string>] [--json] [--loglevel trace|debug|info|warn|error|fatal|TRACE|DEBUG|INFO|WARN|ERROR|FATAL]`

[BETA] Remove restricted option on picklists

```
USAGE
  $ sfdx texei:picklist:unrestrict [-o] [-u <string>] [--apiversion <string>] [--json] [--loglevel 
  trace|debug|info|warn|error|fatal|TRACE|DEBUG|INFO|WARN|ERROR|FATAL]

OPTIONS
  -o, --ignoreerrors                                                                errors are displayed as warnings
                                                                                    only and import will continue

  -u, --targetusername=targetusername                                               username or alias for the target
                                                                                    org; overrides default target org

  --apiversion=apiversion                                                           override the api version used for
                                                                                    api requests made by this command

  --json                                                                            format output as json

  --loglevel=(trace|debug|info|warn|error|fatal|TRACE|DEBUG|INFO|WARN|ERROR|FATAL)  [default: warn] logging level for
                                                                                    this command invocation

EXAMPLES
  $ sfdx texei:picklist:unrestrict
  $ sfdx texei:picklist:unrestrict --json > my-unrestricted-picklists.json
```

_See code: [src/commands/texei/picklist/unrestrict.ts](https://github.com/texei/texei-sfdx-plugin/blob/v1.16.1/src/commands/texei/picklist/unrestrict.ts)_

## `sfdx texei:profile:clean [-k <string>] [-p <string>] [--json] [--loglevel trace|debug|info|warn|error|fatal|TRACE|DEBUG|INFO|WARN|ERROR|FATAL]`

clean Profile by removing permissions stored on Permission Set

```
USAGE
  $ sfdx texei:profile:clean [-k <string>] [-p <string>] [--json] [--loglevel 
  trace|debug|info|warn|error|fatal|TRACE|DEBUG|INFO|WARN|ERROR|FATAL]

OPTIONS
  -k, --keep=keep                                                                   comma-separated list of profile node
                                                                                    permissions that need to be kept.
                                                                                    Default: layoutAssignments,loginHour
                                                                                    s,loginIpRanges,custom,userLicense

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

_See code: [src/commands/texei/profile/clean.ts](https://github.com/texei/texei-sfdx-plugin/blob/v1.16.1/src/commands/texei/profile/clean.ts)_

## `sfdx texei:sharedactivities:enable [-u <string>] [--apiversion <string>] [--json] [--loglevel trace|debug|info|warn|error|fatal|TRACE|DEBUG|INFO|WARN|ERROR|FATAL]`

[DEPRECATED - Use the SharedActivities feature instead] Enable Shared Activities

```
USAGE
  $ sfdx texei:sharedactivities:enable [-u <string>] [--apiversion <string>] [--json] [--loglevel 
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
  $ sfdx texei:sharedactivities:enable
```

_See code: [src/commands/texei/sharedactivities/enable.ts](https://github.com/texei/texei-sfdx-plugin/blob/v1.16.1/src/commands/texei/sharedactivities/enable.ts)_

## `sfdx texei:sharingcalc:recalculate [-s <string>] [-u <string>] [--apiversion <string>] [--json] [--loglevel trace|debug|info|warn|error|fatal|TRACE|DEBUG|INFO|WARN|ERROR|FATAL]`

recalculate sharing rules

```
USAGE
  $ sfdx texei:sharingcalc:recalculate [-s <string>] [-u <string>] [--apiversion <string>] [--json] [--loglevel 
  trace|debug|info|warn|error|fatal|TRACE|DEBUG|INFO|WARN|ERROR|FATAL]

OPTIONS
  -s, --scope=sharingRule                                                           [default: sharingRule] scope of
                                                                                    recalculations

  -u, --targetusername=targetusername                                               username or alias for the target
                                                                                    org; overrides default target org

  --apiversion=apiversion                                                           override the api version used for
                                                                                    api requests made by this command

  --json                                                                            format output as json

  --loglevel=(trace|debug|info|warn|error|fatal|TRACE|DEBUG|INFO|WARN|ERROR|FATAL)  [default: warn] logging level for
                                                                                    this command invocation

EXAMPLE
  $ sfdx texei:sharingcalc:recalculate" 
  Recalculated Sharing Rules
```

_See code: [src/commands/texei/sharingcalc/recalculate.ts](https://github.com/texei/texei-sfdx-plugin/blob/v1.16.1/src/commands/texei/sharingcalc/recalculate.ts)_

## `sfdx texei:sharingcalc:resume [-s <string>] [-t <number>] [-u <string>] [--apiversion <string>] [--json] [--loglevel trace|debug|info|warn|error|fatal|TRACE|DEBUG|INFO|WARN|ERROR|FATAL]`

resumed sharing calculation

```
USAGE
  $ sfdx texei:sharingcalc:resume [-s <string>] [-t <number>] [-u <string>] [--apiversion <string>] [--json] [--loglevel
   trace|debug|info|warn|error|fatal|TRACE|DEBUG|INFO|WARN|ERROR|FATAL]

OPTIONS
  -s, --scope=sharingRule|groupMembership                                           [default: sharingRule] scope of
                                                                                    resumed calculations

  -t, --timeout=timeout                                                             [default: 120000] Timeout for the
                                                                                    sfdx command, in milliseconds

  -u, --targetusername=targetusername                                               username or alias for the target
                                                                                    org; overrides default target org

  --apiversion=apiversion                                                           override the api version used for
                                                                                    api requests made by this command

  --json                                                                            format output as json

  --loglevel=(trace|debug|info|warn|error|fatal|TRACE|DEBUG|INFO|WARN|ERROR|FATAL)  [default: warn] logging level for
                                                                                    this command invocation

EXAMPLE
  $ sfdx texei:sharingcalc:resume" 
  Sharing calculations resumed
```

_See code: [src/commands/texei/sharingcalc/resume.ts](https://github.com/texei/texei-sfdx-plugin/blob/v1.16.1/src/commands/texei/sharingcalc/resume.ts)_

## `sfdx texei:sharingcalc:suspend [-s <string>] [-t <number>] [-u <string>] [--apiversion <string>] [--json] [--loglevel trace|debug|info|warn|error|fatal|TRACE|DEBUG|INFO|WARN|ERROR|FATAL]`

suspend sharing calculation

```
USAGE
  $ sfdx texei:sharingcalc:suspend [-s <string>] [-t <number>] [-u <string>] [--apiversion <string>] [--json] 
  [--loglevel trace|debug|info|warn|error|fatal|TRACE|DEBUG|INFO|WARN|ERROR|FATAL]

OPTIONS
  -s, --scope=sharingRule|groupMembership                                           [default: sharingRule] scope of
                                                                                    suspended calculations

  -t, --timeout=timeout                                                             [default: 120000] Timeout for the
                                                                                    sfdx command, in milliseconds

  -u, --targetusername=targetusername                                               username or alias for the target
                                                                                    org; overrides default target org

  --apiversion=apiversion                                                           override the api version used for
                                                                                    api requests made by this command

  --json                                                                            format output as json

  --loglevel=(trace|debug|info|warn|error|fatal|TRACE|DEBUG|INFO|WARN|ERROR|FATAL)  [default: warn] logging level for
                                                                                    this command invocation

EXAMPLE
  $ sfdx texei:sharingcalc:suspend" 
  Sharing calculations suspended
```

_See code: [src/commands/texei/sharingcalc/suspend.ts](https://github.com/texei/texei-sfdx-plugin/blob/v1.16.1/src/commands/texei/sharingcalc/suspend.ts)_

## `sfdx texei:skinnyprofile:check [-p <string>] [--json] [--loglevel trace|debug|info|warn|error|fatal|TRACE|DEBUG|INFO|WARN|ERROR|FATAL]`

check that a profile doesn't contain non profile-specific metadata

```
USAGE
  $ sfdx texei:skinnyprofile:check [-p <string>] [--json] [--loglevel 
  trace|debug|info|warn|error|fatal|TRACE|DEBUG|INFO|WARN|ERROR|FATAL]

OPTIONS
  -p, --path=path                                                                   path to profiles folder. Default:
                                                                                    default package directory

  --json                                                                            format output as json

  --loglevel=(trace|debug|info|warn|error|fatal|TRACE|DEBUG|INFO|WARN|ERROR|FATAL)  [default: warn] logging level for
                                                                                    this command invocation

EXAMPLE
  $ texei:skinnyprofile:check
```

_See code: [src/commands/texei/skinnyprofile/check.ts](https://github.com/texei/texei-sfdx-plugin/blob/v1.16.1/src/commands/texei/skinnyprofile/check.ts)_

## `sfdx texei:skinnyprofile:retrieve [-t <string>] [-u <string>] [--apiversion <string>] [--json] [--loglevel trace|debug|info|warn|error|fatal|TRACE|DEBUG|INFO|WARN|ERROR|FATAL]`

export a skinny profile with just profile-specific metadata

```
USAGE
  $ sfdx texei:skinnyprofile:retrieve [-t <string>] [-u <string>] [--apiversion <string>] [--json] [--loglevel 
  trace|debug|info|warn|error|fatal|TRACE|DEBUG|INFO|WARN|ERROR|FATAL]

OPTIONS
  -t, --timeout=timeout                                                             timeout(ms) for profile retrieve
                                                                                    (Default: 60000ms)

  -u, --targetusername=targetusername                                               username or alias for the target
                                                                                    org; overrides default target org

  --apiversion=apiversion                                                           override the api version used for
                                                                                    api requests made by this command

  --json                                                                            format output as json

  --loglevel=(trace|debug|info|warn|error|fatal|TRACE|DEBUG|INFO|WARN|ERROR|FATAL)  [default: warn] logging level for
                                                                                    this command invocation

EXAMPLE
  $ texei:skinnyprofile:retrieve -u MyScratchOrg
```

_See code: [src/commands/texei/skinnyprofile/retrieve.ts](https://github.com/texei/texei-sfdx-plugin/blob/v1.16.1/src/commands/texei/skinnyprofile/retrieve.ts)_

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

_See code: [src/commands/texei/source/customlabel/replace.ts](https://github.com/texei/texei-sfdx-plugin/blob/v1.16.1/src/commands/texei/source/customlabel/replace.ts)_

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

_See code: [src/commands/texei/source/layouts/cleanorg.ts](https://github.com/texei/texei-sfdx-plugin/blob/v1.16.1/src/commands/texei/source/layouts/cleanorg.ts)_

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
  sfdx texei:user:update --targetusername myOrg@example.com --values "LanguageLocaleKey='fr'" 
  Successfully updated record: 005D2A90N8A11SVPE2.
  sfdx texei:user:update  --values "UserPermissionsKnowledgeUser=true" --json
  sfdx texei:user:update  --values "LanguageLocaleKey=en_US UserPermissionsMarketingUser=true" --json
```

_See code: [src/commands/texei/user/update.ts](https://github.com/texei/texei-sfdx-plugin/blob/v1.16.1/src/commands/texei/user/update.ts)_
<!-- commandsstop -->
