<!-- This file has been generated with command 'sfdx hardis:doc:plugin:generate'. Please do not update it manually or it may be overwritten -->
# texei:data:export

## Description

export objects' data from org

## Parameters

|Name|Type|Description|Default|Required|Options|
|:---|:--:|:----------|:-----:|:------:|:-----:|
|apiversion|option|override the api version used for api requests made by this command||||
|dataplan<br/>-p|option|path to data plan file||||
|json|boolean|format output as json||||
|loglevel|option|logging level for this command invocation|warn||trace<br/>debug<br/>info<br/>warn<br/>error<br/>fatal|
|objects<br/>-o|option|comma-separated list of objects to export||||
|outputdir<br/>-d|option|directory where to store files||||
|targetusername<br/>-u|option|username or alias for the target org; overrides default target org||||

## Examples

```shell
sfdx texei:data:export --objects Account,Contact,MyCustomObject__c --outputdir ./data --targetusername texei
```

```shell
sfdx texei:data:export --dataplan ./data/data-plan.json --outputdir ./data --targetusername texei
```


