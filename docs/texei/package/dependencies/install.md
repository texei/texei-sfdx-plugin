<!-- This file has been generated with command 'sfdx hardis:doc:plugin:generate'. Please do not update it manually or it may be overwritten -->
# texei:package:dependencies:install

## Description

install dependent Packages for a sfdx project

## Parameters

|Name|Type|Description|Default|Required|Options|
|:---|:--:|:----------|:-----:|:------:|:-----:|
|apexcompile<br/>-a|option|compile all Apex in the org and package, or only Apex in the package (see force:package:install for default value)||||
|apiversion|option|override the api version used for api requests made by this command||||
|branch<br/>-b|option|the package version’s branch||||
|installationkeys<br/>-k|option|installation key for key-protected packages (format is 1:MyPackage1Key 2: 3:MyPackage3Key... to allow some packages without installation key)||||
|json|boolean|format output as json||||
|loglevel|option|logging level for this command invocation|warn||trace<br/>debug<br/>info<br/>warn<br/>error<br/>fatal|
|namespaces<br/>-n|option|filter package installation by namespace||||
|noprompt<br/>-r|boolean|allow Remote Site Settings and Content Security Policy websites to send or receive data without confirmation||||
|packages<br/>-p|option|comma-separated list of the packages to install related dependencies||||
|securitytype<br/>-s|option|security access type for the installed package (see force:package:install for default value)||||
|targetdevhubusername<br/>-v|option|username or alias for the dev hub org; overrides default dev hub org||||
|targetusername<br/>-u|option|username or alias for the target org; overrides default target org||||
|wait<br/>-w|option|number of minutes to wait for installation status (also used for publishwait). Default is 10||||

## Examples

```shell
$ texei:package:dependencies:install -u MyScratchOrg -v MyDevHub -k "1:MyPackage1Key 2: 3:MyPackage3Key" -b "DEV"
```


