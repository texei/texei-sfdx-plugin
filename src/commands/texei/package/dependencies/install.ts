import { core, SfdxCommand, flags } from '@salesforce/command';
import { watchFile } from 'fs';
var exec = require('child-process-promise').exec;
var spawn = require('child-process-promise').spawn;

const packageIdPrefix = '0Ho';
const packageVersionIdPrefix = '04t';
let packageAliasesMap = [];
const defaultWait = 10;

// Initialize Messages with the current plugin directory
core.Messages.importMessagesDirectory(__dirname);

// Load the specific messages for this file. Messages from @salesforce/command, @salesforce/core,
// or any library that is using the messages framework can also be loaded this way.
const messages = core.Messages.loadMessages('texei-sfdx-plugin', 'install');

export default class Install extends SfdxCommand {

  public static description = messages.getMessage('commandDescription');

  public static examples = [
    `$ texei:package:dependencies:install -p "My Package" -u MyScratchOrg -v MyDevHub -k "1:MyPackage1Key 2: 3:MyPackage3Key" -b "DEV"`
  ];

  protected static flagsConfig = {
    package: { char: 'p', required: true, description: "ID (starts with 0Ho) or alias of the package to install dependencies" },
    installationkeys: { char: 'k', required: false, description: "installation key for key-protected packages (format is 1:MyPackage1Key 2: 3:MyPackage3Key... to allow some packages without installation key)" },
    branch: { char: 'b', required: false, description: "the package version’s branch" },
    wait: { char: 'w', type: 'number', required: false, description: "number of minutes to wait for installation status (also used for publishwait). Default is 10" },
    noprompt: { char: 'r', required: false, type: 'boolean', description: "allow Remote Site Settings and Content Security Policy websites to send or receive data without confirmation" }
  };

  // Comment this out if your command does not require an org username
  protected static requiresUsername = true;

  // Comment this out if your command does not support a hub org username
  protected static supportsDevhubUsername = true;

  // Set this to true if your command requires a project workspace; 'requiresProject' is false by default
  protected static requiresProject = true;

  public async run(): Promise<any> {

    let result = { installedPackages: [] };

    // Getting Package name
    const packageName = this.flags.package.trim();

    // this.org is guaranteed because requiresUsername=true, as opposed to supportsUsername
    const username = this.org.getUsername();

    // Getting Project config
    const project = await core.SfdxProjectJson.retrieve<core.SfdxProjectJson>();

    // Getting a list of alias
    const packageAliases = project.get('packageAliases') || {};
    if (typeof packageAliases != 'undefined') {

      Object.entries(packageAliases).forEach(([key, value]) => {
        packageAliasesMap[key] = value;
      });
    }

    // Getting Package
    let packagesToInstall = [];
    const packageDirectories = project.get('packageDirectories') as core.JsonArray || [];
    let packageFound = false;

    for (let packageDirectory  of packageDirectories) {
      packageDirectory = packageDirectory as core.JsonMap;
      let { package: name, dependencies } = packageDirectory;

      if (name == packageName) {
        packageFound = true;

        // TODO: Move all labels to message
        this.ux.log(`Package dependencies found:`);
        if (dependencies) {
          for (let dependency of (dependencies as core.JsonArray)) {

            const { package: dependentPackage, versionNumber } = dependency as core.JsonMap;

            const packageVersionId = await this.getPackageVersionId(dependentPackage, versionNumber);
            packagesToInstall.push(packageVersionId);
            this.ux.log(packageVersionId);
          }
        }
        else {
          this.ux.log('No dependencies found');
        }
      }
    }

    if (!packageFound) {
      this.ux.log(`Package not found.`);
    }
    else if (packagesToInstall.length > 0) { // Installing Packages

      // Getting Installation Key(s)
      let installationKeys = this.flags.installationkeys;
      if (installationKeys) {
        installationKeys = installationKeys.trim();
        installationKeys = installationKeys.split(' ');

        // Format is 1: 2: 3: ... need to remove these
        for (let i = 0; i < installationKeys.length; i++) {

          let key = installationKeys[i].trim();
          if (key.startsWith(`${i+1}:`)) {
            installationKeys[i] = key.substring(2);
          }
          else {
            // Format is not correct, throw an error
            throw new core.SfdxError("Installation Key should have this format: 1:MyPackage1Key 2: 3:MyPackage3Key");
          }
        }
      }

      let i = 0;
      for (const packageId of packagesToInstall) {

        // Split arguments to use spawn
        let args = [];
        args.push(`force:package:install`);

        // USERNAME
        args.push(`--targetusername`);
        args.push(`${username}`);

        // PACKAGE ID
        args.push(`--package`);
        args.push(`${packageId}`);

        // INSTALLATION KEY
        if (installationKeys && installationKeys[i]) {
          args.push(`--installationkey`);
          args.push(`${installationKeys[i]}`);
        }

        // WAIT
        const wait = this.flags.wait ? this.flags.wait.trim() : defaultWait;
        args.push(`--wait`);
        args.push(`${wait}`);
        args.push(`--publishwait`);
        args.push(`${wait}`);

        // NOPROMPT
        if (this.flags.noprompt) {
          args.push(`--noprompt`);
        }

        // INSTALL PACKAGE
        // TODO: How to add a debug flag or write to sfdx.log with --loglevel ?
        this.ux.log(`Installing package ${packageId}`);
        await spawn('sfdx', args, { stdio: 'inherit' });

        result.installedPackages[i] = packageId;

        i++;
      }
    }

    return { message: result };
  }

  private async getPackageVersionId(name, version) {

    let packageId = messages.getMessage('invalidPackageName');
    // Keeping original name so that it can be used in error message if needed
    let packageName = name;

    // TODO: Some stuff are duplicated here, some code don't need to be executed for every package
    // First look if it's an alias
    if (typeof packageAliasesMap[packageName] !== 'undefined') {
      packageName = packageAliasesMap[packageName];
    }

    if (packageName.startsWith(packageVersionIdPrefix)) {
      // Package2VersionId is set directly
      packageId = packageName;
    }
    else if (packageName.startsWith(packageIdPrefix)) {
      // Get Package version id from package + versionNumber
      const vers = version.split('.');
      let query = 'Select SubscriberPackageVersionId, IsPasswordProtected, IsReleased ';
      query += 'from Package2Version ';
      query += `where Package2Id='${packageName}' and MajorVersion=${vers[0]} and MinorVersion=${vers[1]} and PatchVersion=${vers[2]} `;

      // If Build Number isn't set to LATEST, look for the exact Package Version
      if (vers[3] != 'LATEST') {
        query += `and BuildNumber=${vers[3]}`;
      }

      // If Branch is specified, use it to filter
      if (this.flags.branch) {
        query += `and Branch='${this.flags.branch.trim()}'`;
      }

      query+= ' ORDER BY BuildNumber DESC Limit 1';

      // SFDX command to retrieve Package Version
      let queryPackageVersion = `sfdx force:data:soql:query --query "${query}" --usetoolingapi --json`;

      // TODO: Move to something like this ?
      /*
      const conn = this.org.getConnection();
      const query = 'Select SubscriberPackageVersionId from Package2Version';
      const result = await conn.query<Package2Version>(query);
      */

      // If there is a DevHub specified, use it
      if (this.hubOrg) {
        // TODO: Sometimes it doesn't retrieve the correct DevHub ?
        queryPackageVersion += ` --targetusername ${this.hubOrg.getUsername()}`;
      }

      const { err, stdout, stderr } = await exec(queryPackageVersion);

      if (err) {
        // node couldn't execute the command
        this.ux.error(err);
        return;
      } else if (stderr) {
        // node couldn't execute the command
        this.ux.error(stderr);
        return;
      }
      else {
        let res = JSON.parse(stdout);
        // If Package not found, throw an error
        if (res.result.totalSize == 0) {
          const errorMessage = `Unable to find SubscriberPackageVersionId for dependent package ${name}`;
          throw new core.SfdxError(errorMessage);
        }
        else {
          packageId = res.result.records[0].SubscriberPackageVersionId;
        }
      }
    }

    return packageId;
  }
}
