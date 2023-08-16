/* eslint-disable no-prototype-builtins */
/* eslint-disable @typescript-eslint/prefer-optional-chain */
/* eslint-disable @typescript-eslint/no-unsafe-return */
/* eslint-disable @typescript-eslint/no-unsafe-member-access */
/* eslint-disable @typescript-eslint/no-unsafe-call */
/* eslint-disable @typescript-eslint/restrict-template-expressions */
/* eslint-disable @typescript-eslint/restrict-plus-operands */
/* eslint-disable @typescript-eslint/no-unsafe-argument */
/* eslint-disable complexity */
/* eslint-disable no-await-in-loop */
/* eslint-disable @typescript-eslint/explicit-function-return-type */
/* eslint-disable @typescript-eslint/no-unsafe-assignment */
import {
  SfCommand,
  Flags,
  orgApiVersionFlagWithDeprecations,
  requiredOrgFlagWithDeprecations,
  requiredHubFlagWithDeprecations,
} from '@salesforce/sf-plugins-core';
import { JsonArray, JsonMap } from '@salesforce/ts-types';
import { Messages, SfProjectJson, SfError } from '@salesforce/core';
import childProcess = require('child-process-promise');

const packageIdPrefix = '0Ho';
const packageVersionIdPrefix = '04t';
const packageAliasesMap = [];
const defaultWait = 10;

// Initialize Messages with the current plugin directory
Messages.importMessagesDirectory(__dirname);

// Load the specific messages for this file. Messages from @salesforce/command, @salesforce/core,
// or any library that is using the messages framework can also be loaded this way.
const messages = Messages.loadMessages('texei-sfdx-plugin', 'package.dependencies.install');

export type PackageDependenciesInstallResult = {
  message: { installedPackages: object };
};

export default class Install extends SfCommand<PackageDependenciesInstallResult> {
  public static readonly summary = messages.getMessage('summary');

  public static readonly examples = [
    '$ sf texei package dependencies install --target-org MyScratchOrg --target-dev-hub MyDevHub -k "1:MyPackage1Key 2: 3:MyPackage3Key" -b "DEV"',
  ];

  public static readonly requiresProject = true;

  public static readonly flags = {
    'target-org': requiredOrgFlagWithDeprecations,
    'target-dev-hub': requiredHubFlagWithDeprecations,
    'api-version': orgApiVersionFlagWithDeprecations,
    installationkeys: Flags.string({
      char: 'k',
      summary: messages.getMessage('flags.installationkeys.summary'),
      required: false,
    }),
    branch: Flags.string({ char: 'b', summary: messages.getMessage('flags.branch.summary'), required: false }),
    packages: Flags.string({ char: 'p', summary: messages.getMessage('flags.packages.summary'), required: false }),
    securitytype: Flags.string({
      char: 's',
      summary: messages.getMessage('flags.securitytype.summary'),
      required: false,
    }),
    namespaces: Flags.string({ char: 'n', summary: messages.getMessage('flags.namespaces.summary'), required: false }),
    wait: Flags.integer({ char: 'w', summary: messages.getMessage('flags.wait.summary'), required: false }),
    noprompt: Flags.boolean({ char: 'r', summary: messages.getMessage('flags.noprompt.summary'), required: false }),
    apexcompile: Flags.string({
      char: 'a',
      summary: messages.getMessage('flags.apexcompile.summary'),
      required: false,
    }),
  };

  public async run(): Promise<PackageDependenciesInstallResult> {
    const { flags } = await this.parse(Install);

    const result = { installedPackages: {} };

    const username = flags['target-org'].getUsername();
    const options = SfProjectJson.getDefaultOptions();
    const project = await SfProjectJson.create(options);

    if (flags.packages != null) {
      this.log('Filtering by packages: ' + flags.packages);
    }

    if (flags.namespaces != null) {
      this.log('Filtering by namespaces: ' + flags.namespaces);
    }

    // eslint-disable-next-line @typescript-eslint/prefer-nullish-coalescing
    const packageAliases = project.get('packageAliases') || {};
    if (typeof packageAliases !== undefined) {
      Object.entries(packageAliases).forEach(([key, value]) => {
        packageAliasesMap[key] = value;
      });
    }

    // Getting Package
    const packagesToInstall = [];

    const packageDirectories = (project.get('packageDirectories') as JsonArray) || [];
    const packages = new Set();
    if (flags.packages) {
      for (const pkg of flags.packages.split(',')) {
        packages.add(pkg.trim());
      }
    }

    // see if no filter is true
    const packagesNoFilter = flags.packages == null;

    this.spinner.start('Resolving dependencies', undefined, { stdout: true });

    for (let packageDirectory of packageDirectories) {
      packageDirectory = packageDirectory as JsonMap;
      const packageName =
        packageDirectory.package && packageDirectory.package.toString() ? packageDirectory.package.toString() : '';

      // If the package is found, or if there isn't any package filtering
      if (packages.has(packageName) || packagesNoFilter) {
        // eslint-disable-next-line @typescript-eslint/prefer-nullish-coalescing
        const dependencies = packageDirectory.dependencies || [];

        // TODO: Move all labels to message
        // eslint-disable-next-line @typescript-eslint/prefer-optional-chain
        if (dependencies && dependencies[0] !== undefined) {
          this.log(`Package dependencies found for package directory ${packageDirectory.path}`);
          for (const dependency of dependencies as JsonArray) {
            const packageInfo = {} as JsonMap;

            const dependencyInfo = dependency as JsonMap;
            const dependentPackage: string = (
              dependencyInfo.packageId != null ? dependencyInfo.packageId : dependencyInfo.package
            ) as string;
            const versionNumber: string = dependencyInfo.versionNumber as string;
            const namespaces = flags.namespaces !== undefined ? flags.namespaces.split(',') : null;

            if (dependentPackage == null) {
              throw Error('Dependent package version unknow error.');
            }

            packageInfo.dependentPackage = dependentPackage;
            packageInfo.versionNumber = versionNumber;
            const packageVersionId = await this.getPackageVersionId(dependentPackage, versionNumber, namespaces, flags);
            if (packageVersionId != null) {
              packageInfo.packageVersionId = packageVersionId;
              // @ts-ignore: TODO: working code, but look at TS warning
              packagesToInstall.push(packageInfo);
              this.log(
                `    ${packageInfo.packageVersionId} : ${packageInfo.dependentPackage}${
                  packageInfo.versionNumber === undefined ? '' : ' ' + packageInfo.versionNumber
                }`
              );
            }
          }
        } else {
          this.log(`No dependencies found for package directory ${packageDirectory.path}`);
        }

        // Removing package from packages flag list --> Used later to log if one of them wasn't found
        // eslint-disable-next-line @typescript-eslint/prefer-optional-chain
        if (packages && packages.has(packageName)) {
          packages.delete(packageName);
        }
      }
    }

    // In case one package wasn't found when filtering by packages
    if (packages && packages.size > 0) {
      this.log('Following packages were used in the --packages flag but were not found in the packageDirectories:');

      for (const packageName of packages) {
        this.log(`    ${packageName}`);
      }
    }

    this.spinner.stop('Done.');

    if (packagesToInstall.length > 0) {
      // Installing Packages

      // Checking previously installed packages
      this.debug('DEBUG looking for already installed packages');
      const conn = flags['target-org'].getConnection(flags['api-version']);
      const installedPackagesQuery = 'Select SubscriberPackageVersionId from InstalledSubscriberPackage';
      const installedPackageIds = (await conn.tooling.query(installedPackagesQuery)).records.map(
        (x) => x.SubscriberPackageVersionId
      );

      // Getting Installation Key(s)
      let installationKeysString: string = flags.installationkeys as string;
      let installationKeys: string[] = [];
      if (installationKeysString) {
        installationKeysString = installationKeysString.trim();
        installationKeys = installationKeysString.split(' ');

        // Format is 1: 2: 3: ... need to remove these
        for (let keyIndex = 0; keyIndex < installationKeys.length; keyIndex++) {
          const key = installationKeys[keyIndex].trim();
          if (key.startsWith(`${keyIndex + 1}:`)) {
            installationKeys[keyIndex] = key.substring(keyIndex.toString().length + 1);
          } else {
            // Format is not correct, throw an error
            throw new SfError('Installation Key should have this format: 1:MyPackage1Key 2: 3:MyPackage3Key');
          }
        }
      }

      this.log('\n');

      let i = 0;
      for (let packageInfo of packagesToInstall) {
        // @ts-ignore: TODO: working code, but look at TS warning
        packageInfo = packageInfo as JsonMap;
        if (
          // @ts-ignore: TODO: working code, but look at TS warning
          result.installedPackages.hasOwnProperty(packageInfo.packageVersionId) || // @ts-ignore: TODO: working code, but look at TS warning
          installedPackageIds.includes(packageInfo.packageVersionId)
        ) {
          // @ts-ignore: TODO: working code, but look at TS warning
          this.log(`PackageVersionId ${packageInfo.packageVersionId} already installed. Skipping...`);
          continue;
        }

        // Split arguments to use spawn
        const args: string[] = [];
        args.push('package:install');

        // USERNAME
        args.push('--target-org');
        args.push(`${username}`);

        // PACKAGE ID
        args.push('--package');
        // @ts-ignore: TODO: working code, but look at TS warning
        args.push(`${packageInfo.packageVersionId}`);

        // INSTALLATION KEY
        // eslint-disable-next-line @typescript-eslint/prefer-optional-chain
        if (installationKeys && installationKeys[i]) {
          args.push('--installationkey');
          args.push(`${installationKeys[i]}`);
        }

        // SECURITY TYPE
        if (flags.securitytype) {
          args.push('--securitytype');
          args.push(`${flags.securitytype}`);
        }

        // APEX COMPILE
        if (flags.apexcompile) {
          args.push('--apexcompile');
          args.push(`${flags.apexcompile}`);
        }

        // WAIT
        const wait = flags.wait != null ? flags.wait : defaultWait;
        args.push('--wait');
        args.push(`${wait}`);
        args.push('--publish-wait');
        args.push(`${wait}`);

        // NOPROMPT
        if (flags.noprompt) {
          args.push('--no-prompt');
        }

        // INSTALL PACKAGE
        // TODO: Fix waiting messages that should not be visibile with --json
        this.log(
          // @ts-ignore: TODO: working code, but look at TS warning
          `Installing package ${packageInfo.packageVersionId} : ${packageInfo.dependentPackage}${
            // @ts-ignore: TODO: working code, but look at TS warning
            packageInfo.versionNumber === undefined ? '' : ' ' + packageInfo.versionNumber
          }`
        );
        await childProcess.spawn('sfdx', args, { stdio: 'inherit' });

        this.log('\n');

        // @ts-ignore: TODO: working code, but look at TS warning
        result.installedPackages[packageInfo.packageVersionId] = packageInfo;

        i++;
      }
    }

    return { message: result };
  }

  // eslint-disable-next-line class-methods-use-this
  private async getPackageVersionId(name: string, version: string, namespaces, flags) {
    let packageId = null;
    // Keeping original name so that it can be used in error message if needed
    let packageName = name;

    // TODO: Some stuff are duplicated here, some code don't need to be executed for every package
    // First look if it's an alias
    if (typeof packageAliasesMap[packageName] !== 'undefined') {
      packageName = packageAliasesMap[packageName];
    }

    if (packageName.startsWith(packageVersionIdPrefix)) {
      // Package2VersionId is set directly
      // @ts-ignore: TODO: working code, but look at TS warning
      packageId = packageName;
    } else if (packageName.startsWith(packageIdPrefix)) {
      // Get Package version id from package + versionNumber
      const vers = version.split('.');
      let query = 'Select SubscriberPackageVersionId, IsPasswordProtected, IsReleased, Package2.NamespacePrefix ';
      query += 'from Package2Version ';
      query += `where Package2Id='${packageName}' and MajorVersion=${vers[0]} and MinorVersion=${vers[1]} and PatchVersion=${vers[2]} and IsDeprecated = false `;

      if (namespaces != null) {
        query += ` and Package2.NamespacePrefix IN ('${namespaces.join("','")}')`;
      }

      // If Build Number is RELEASED, filter on IsReleased
      // eslint-disable-next-line eqeqeq
      if (vers[3] == 'RELEASED') {
        query += 'and IsReleased=true ';
      }
      // If Build Number isn't set to LATEST, look for the exact Package Version
      else if (vers[3] !== 'LATEST') {
        query += `and BuildNumber=${vers[3]} `;
      }

      // If Branch is specified, use it to filter
      if (flags.branch) {
        query += `and Branch='${flags.branch.trim()}' `;
      }

      query += ' ORDER BY BuildNumber DESC Limit 1';

      // Query DevHub to get the expected Package2Version
      const connDevHub = flags['target-dev-hub'].getConnection(flags['api-version']);
      const resultPackageId = await connDevHub.tooling.query(query);

      if (resultPackageId.size > 0) {
        packageId = resultPackageId.records[0].SubscriberPackageVersionId;
      }
    }

    return packageId;
  }
}
