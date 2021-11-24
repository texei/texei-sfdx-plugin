<!-- This file has been generated with command 'sfdx hardis:doc:plugin:generate'. Please do not update it manually or it may be overwritten -->
# texei:source:layouts:cleanorg

## Description

delete unused standard layouts from scratch org

## Parameters

|Name|Type|Description|Default|Required|Options|
|:---|:--:|:----------|:-----:|:------:|:-----:|
|apiversion|option|override the api version used for api requests made by this command||||
|json|boolean|format output as json||||
|loglevel|option|logging level for this command invocation|warn||trace<br/>debug<br/>info<br/>warn<br/>error<br/>fatal|
|path<br/>-p|option|path to layouts||||
|targetdevhubusername<br/>-v|option|username or alias for the dev hub org; overrides default dev hub org||||
|targetusername<br/>-u|option|username or alias for the target org; overrides default target org||||

## Examples

```shell
$ texei:source:layouts:cleanorg
```

```shell
$ texei:source:layouts:cleanorg --targetusername myScratchOrg --targetdevhubusername myDevHub
```


