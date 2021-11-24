<!-- This file has been generated with command 'sfdx hardis:doc:plugin:generate'. Please do not update it manually or it may be overwritten -->
# texei:data:plan:generate

## Description

generate a data plan used to export objects' data from org

## Parameters

|Name|Type|Description|Default|Required|Options|
|:---|:--:|:----------|:-----:|:------:|:-----:|
|json|boolean|format output as json||||
|loglevel|option|logging level for this command invocation|warn||trace<br/>debug<br/>info<br/>warn<br/>error<br/>fatal|
|objects<br/>-o|option|comma-separated list of objects to add to the data plan||||
|outputdir<br/>-d|option|directory where to store the data plan file||||

## Examples

```shell
$ sfdx texei:data:plan:generate --objects Account,Contact,MyCustomObject__c --outputdir ./data
```


