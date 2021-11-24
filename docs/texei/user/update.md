<!-- This file has been generated with command 'sfdx hardis:doc:plugin:generate'. Please do not update it manually or it may be overwritten -->
# texei:user:update

## Description

updates the current user of a scratch org

## Parameters

|Name|Type|Description|Default|Required|Options|
|:---|:--:|:----------|:-----:|:------:|:-----:|
|apiversion|option|override the api version used for api requests made by this command||||
|json|boolean|format output as json||||
|loglevel|option|logging level for this command invocation|warn||trace<br/>debug<br/>info<br/>warn<br/>error<br/>fatal|
|targetusername<br/>-u|option|username or alias for the target org; overrides default target org||||
|values<br/>-v|option|the <fieldName>=<value> pairs you’re updating||||

## Examples

```shell
sfdx texei:user:update --targetusername myOrg@example.com --values "LanguageLocaleKey='fr'" 
Successfully updated record: 005D2A90N8A11SVPE2.
```

```shell
sfdx texei:user:update  --values "UserPermissionsKnowledgeUser=true" --json
```

```shell
sfdx texei:user:update  --values "LanguageLocaleKey=en_US UserPermissionsMarketingUser=true" --json
```


