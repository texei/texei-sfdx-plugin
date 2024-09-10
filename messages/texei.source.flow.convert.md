# summary

Convert a Flow to a Subflow

# description

This command converts a record-triggered flow to a subflow, either by overriding it (default behavior) or saving it to a new file.
If the source Flow has Entry Conditions there are not kept (subflows don't have entry conditions) and a warning is displayed.

# flags.name.summary

Name of the Flow to convert

# flags.path.summary

Path of flows folder (default: force-app/main/default/flows)

# flags.path.save-to-file-name

Name of for new Flow file. If not provided, converted source Flow is overridden

# examples

- sf texei source flow convert --name My_Flow --save-to-file-name My_Converted_Flow

# warning.beta

This command is in BETA, test the converted Flow, and report any issue at https://github.com/texei/texei-sfdx-plugin/issues

# warning.filters

The source Flow has Entry Conditions that can't be moved to Subflow, review them and add them either as a decision node or to the parent Flow according to the needs

# error.no-scheduled-paths

The source Flow has Scheduled Paths, which are not possible in subflow. Review your Flow manually.
