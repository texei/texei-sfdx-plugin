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
