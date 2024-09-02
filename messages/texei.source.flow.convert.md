# summary

Convert a Flow to a Subflow

# description

Convert a Flow to a Subflow

# flags.name.summary

Name of the Flow to convert

# flags.path.summary

Path of flows folder (default: force-app/main/default/flows)

# flags.path.save-to-file-name

Name of for new Flow file. If not provided, converted source Flow is overridden

# examples

- sf texei source flow convert --name My_Flow

# warning.beta

This command is in BETA, test the converted Flow, and report any issue at https://github.com/texei/texei-sfdx-plugin/issues

# warning.filters

The source Flow has Entry Conditions that can't be moved to Subflow, review them and add them either as a decision node or to the parent Flow according to the needs
