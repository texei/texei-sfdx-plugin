<!-- This file has been generated with command 'sfdx hardis:doc:plugin:generate'. Please do not update it manually or it may be overwritten -->
# texei:data:import

## Description

import objects' data to org

## Parameters

|Name|Type|Description|Default|Required|Options|
|:---|:--:|:----------|:-----:|:------:|:-----:|
|allornone<br/>-a|boolean|any failed records in a call cause all changes for the call to be rolled back||||
|apiversion|option|override the api version used for api requests made by this command||||
|inputdir<br/>-d|option|directory with files to import||||
|json|boolean|format output as json||||
|loglevel|option|logging level for this command invocation|warn||trace<br/>debug<br/>info<br/>warn<br/>error<br/>fatal|
|targetusername<br/>-u|option|username or alias for the target org; overrides default target org||||

## Examples

```shell
$ sfdx texei:data:import --inputdir ./data --targetusername texei-scratch
  Data imported!
  
```


