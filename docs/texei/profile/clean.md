<!-- This file has been generated with command 'sfdx hardis:doc:plugin:generate'. Please do not update it manually or it may be overwritten -->
# texei:profile:clean

## Description

clean Profile by removing permissions stored on Permission Set

## Parameters

|Name|Type|Description|Default|Required|Options|
|:---|:--:|:----------|:-----:|:------:|:-----:|
|json|boolean|format output as json||||
|keep<br/>-k|option|comma-separated list of profile node permissions that need to be kept. Default: layoutAssignments,loginHours,loginIpRanges,custom,userLicense||||
|loglevel|option|logging level for this command invocation|warn||trace<br/>debug<br/>info<br/>warn<br/>error<br/>fatal|
|path<br/>-p|option|comma-separated list of profiles, or path to profiles folder. Default: default package directory||||

## Examples

```shell
$ texei:profile:clean -k layoutAssignments,recordTypeVisibilities
```

```shell
$ texei:profile:clean -p custom-sfdx-source-folder/main/profiles
```

```shell
$ texei:profile:clean -p custom-sfdx-source-folder/main/profiles,source-folder-2/main/profiles/myAdmin.profile-meta.xml
```


