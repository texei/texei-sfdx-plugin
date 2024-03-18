# summary

install dependent Packages for a sfdx project

# flags.installationkeys.summary

installation key for key-protected packages (format is 1:MyPackage1Key 2: 3:MyPackage3Key... to allow some packages without installation key)

# flags.branch.summary

the package version’s branch

# flags.packages.summary

comma-separated list of the packages to install related dependencies

# flags.securitytype.summary

security access type for the installed package (see sf packageinstall for default value)

# flags.namespaces.summary

filter package installation by namespace

# flags.wait.summary

number of minutes to wait for installation status (also used for publishwait). Default is 10

# flags.noprompt.summary

allow Remote Site Settings and Content Security Policy websites to send or receive data without confirmation

# flags.apexcompile.summary

compile all Apex in the org and package, or only Apex in the package (see force:package:install for default value)

# flags.upgrade-type.summary

upgrade type for the package installation; available only for unlocked packages (see sf packageinstall for default value)
