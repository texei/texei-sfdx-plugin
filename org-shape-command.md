# Issues
## omniChannelSettings
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
}```

## Voice
add-on license
24662543
VoiceCallListEnabled
VoiceCallRecordingEnabled
VoiceCoachingEnabled
VoiceConferencingEnabled
VoiceEnabled
VoiceLocalPresenceEnabled
VoiceMailDropEnabled
VoiceMailEnabled
CallDispositionEnabled

## routingAddresses
In field: caseOwner - no Queue named XXX found

## Pardot
Problem: enableEngagementHistoryDashboards (no more detail on the error)

# allowUsersToRelateMultipleContactsToTasksAndEvents 
You can't use the Tooling API or Metadata API to enable or disable Shared Activities.  To enable this feature, visit the Activity Settings page in Setup.  To disable this feature, contact Salesforce.
https://success.salesforce.com/0D53A00004aZdl3
