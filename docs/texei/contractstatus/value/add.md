<!-- This file has been generated with command 'sfdx hardis:doc:plugin:generate'. Please do not update it manually or it may be overwritten -->
# texei:contractstatus:value:add

## Description

add a value to Contract Status picklist

## Parameters

|Name|Type|Description|Default|Required|Options|
|:---|:--:|:----------|:-----:|:------:|:-----:|
|apiname<br/>-a|option|API Name of the Contract Status value to add||||
|apiversion|option|override the api version used for api requests made by this command||||
|json|boolean|format output as json||||
|label<br/>-l|option|label of the Contract Status value to add||||
|loglevel|option|logging level for this command invocation|warn||trace<br/>debug<br/>info<br/>warn<br/>error<br/>fatal|
|statuscategory<br/>-s|option|Status Category of the Contract Status value to add|Draft||Draft<br/>Activated<br/>InApprovalProcess|
|targetusername<br/>-u|option|username or alias for the target org; overrides default target org||||

## Examples

```shell
sfdx texei:contractstatus:value:add --label 'My New Contract Status Label' --apiname 'My New Contract Status API Name' --targetusername texei
```


