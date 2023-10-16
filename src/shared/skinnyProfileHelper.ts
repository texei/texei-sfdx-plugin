import * as puppeteer from 'puppeteer';

// This should be on a Permission Set
export const nodesNotAllowed = [
  'userPermissions',
  'classAccesses',
  'externalDataSourceAccesses',
  'fieldPermissions',
  'objectPermissions',
  'pageAccesses',
  'tabVisibilities',
  'customMetadataTypeAccesses',
];

// These metadata are on Permission Set, but Default is selected on Profile. Keeping only the default value
export const nodesHavingDefault = ['applicationVisibilities', 'recordTypeVisibilities'];

// eslint-disable-next-line @typescript-eslint/require-await
export async function getProfilesInOrg(): Promise<string[]> {
  /*
  // Look for a default package directory
  const options = SfProjectJson.getDefaultOptions();
  const project = await SfProjectJson.create(options);
  const packageDirectories = (project.get('packageDirectories') as JsonArray) || [];

  // Use the vanilla default DX folder if no default package directory is found
  let foundPath: string = defaultPackageFolder;
  for (let packageDirectory of packageDirectories) {
    packageDirectory = packageDirectory as JsonMap;

    if (packageDirectory.path && packageDirectory.default) {
      foundPath = path.join(packageDirectory.path as string, 'main', 'default');
      break;
    }
  }

  return foundPath;
  */

  return [''];
}
