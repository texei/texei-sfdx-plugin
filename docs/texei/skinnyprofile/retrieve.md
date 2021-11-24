<!-- This file has been generated with command 'sfdx hardis:doc:plugin:generate'. Please do not update it manually or it may be overwritten -->
# texei:skinnyprofile:retrieve

## Description

export a skinny profile with just package-specific metadata

## Parameters

|Name|Type|Description|Default|Required|Options|
|:---|:--:|:----------|:-----:|:------:|:-----:|
|apiversion|option|override the api version used for api requests made by this command||||
|json|boolean|format output as json||||
|loglevel|option|logging level for this command invocation|warn||trace<br/>debug<br/>info<br/>warn<br/>error<br/>fatal|
|targetusername<br/>-u|option|username or alias for the target org; overrides default target org||||
|timeout<br/>-t|option|timeout(ms) for profile retrieve (Default: 60000ms)||||

## Examples

```shell
$ texei:skinnyprofile:retrieve -u MyScratchOrg
```


