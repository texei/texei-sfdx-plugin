# sfdx texei:org:shape:extract command

This command is in beta and far from being 100% working. It's more a helper than a fully working command.

## What's the command doing and not doing
* The command is only converting metadata API Settings to definition file settings
* Only a few settings are added, but you can try adding all of them using the `--scope=full`
* So far there is no specific API to get all the features, so they aren't added to the Scratch Definition File
* orgPreferenceSettings has not been replaced by all the according settings
* edition is always developer

Also, several settings have been removed because of bugs, but a lot of investigation has not been done because of lack of time, feel free to fix command/improve this doc.

## Settings bugs
### omniChannelSettings
Removed `enableOmniAutoLoginPrompt` and `enableOmniSecondaryRoutingPriority`:

`All JSON input must have heads down camelcase keys.  E.g., { sfdcLoginUrl: "https://login.salesforce.com" } Found "$"`

```"omniChannelSettings": {
    "enableOmniAutoLoginPrompt": {
        "$": {
            "xsi:nil": true
        }
    },
    "enableOmniChannel": true,
    "enableOmniSecondaryRoutingPriority": {
        "$": {
            "xsi:nil": true
        }
    },
    "enableOmniSkillsRouting": false
}
````

### Voice
According to Case 24662543, this will only work with an add-on license, so removed the following:
* VoiceCallListEnabled
* VoiceCallRecordingEnabled
* VoiceCoachingEnabled
* VoiceConferencingEnabled
* VoiceEnabled
* VoiceLocalPresenceEnabled
* VoiceMailDropEnabled
* VoiceMailEnabled
* CallDispositionEnabled

### routingAddresses
Removed all routingAddresses because of the following error: `In field: caseOwner - no Queue named XXX found`

### Pardot
Problem: enableEngagementHistoryDashboards (no more detail on the error), removed:
* PardotAppV1Enabled
* PardotEmbeddedAnalyticsPref
* PardotEnabled

### allowUsersToRelateMultipleContactsToTasksAndEvents 
You can't use the Tooling API or Metadata API to enable or disable Shared Activities.  To enable this feature, visit the Activity Settings page in Setup.  To disable this feature, contact Salesforce.
https://success.salesforce.com/0D53A00004aZdl3
