<!-- This file has been generated with command 'sfdx hardis:doc:plugin:generate'. Please do not update it manually or it may be overwritten -->
# texei:org:shape:extract

## Description

[BETA] Extract Org Shape for an org

## Parameters

|Name|Type|Description|Default|Required|Options|
|:---|:--:|:----------|:-----:|:------:|:-----:|
|apiversion|option|override the api version used for api requests made by this command||||
|json|boolean|format output as json||||
|loglevel|option|logging level for this command invocation|warn||trace<br/>debug<br/>info<br/>warn<br/>error<br/>fatal|
|outputdir<br/>-d|option|the output directory to store the extracted definition file|config|||
|scope<br/>-s|option|the scope of settings to convert to the scratch definition file|basic||basic<br/>full|
|targetusername<br/>-u|option|username or alias for the target org; overrides default target org||||

## Examples

```shell
$ sfdx texei:org:shape:extract -u bulma@capsulecorp.com"
```


