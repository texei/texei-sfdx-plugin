import { AnyJson } from '@salesforce/ts-types';
import {
  PermissionSetApplicationVisibility,
  PermissionSetApexClassAccess,
  PermissionSetCustomMetadataTypeAccess,
  PermissionSetCustomPermissions,
  PermissionSetCustomSettingAccesses,
  PermissionSetExternalCredentialPrincipalAccess,
  PermissionSetExternalDataSourceAccess,
  PermissionSetFieldPermissions,
  PermissionSetFlowAccess,
  PermissionSetObjectPermissions,
  PermissionSetApexPageAccess,
  PermissionSetRecordTypeVisibility,
  PermissionSetTabVisibility,
  PermissionSetUserPermissions,
} from '../commands/texei/skinnyprofile/MetadataTypes';

// This should be on a Permission Set
export const permissionSetNodes = [
  'userPermissions',
  'classAccesses',
  'externalDataSourceAccesses',
  'fieldPermissions',
  'objectPermissions',
  'pageAccesses',
  'tabVisibilities',
  'customMetadataTypeAccesses',
  'customPermissions',
  'flowAccesses',
  'externalDataSourceAccesses',
];

// These metadata are on Permission Set, but Default is selected on Profile. Keeping only the default value
export const nodesHavingDefault = ['applicationVisibilities', 'recordTypeVisibilities'];

export const commonProfilePermissionSetNodes = ['description'];

export const profileNodesToPermissionSetNodes: Map<string, string> = new Map([
  ['userLicense', 'license'],
  ['fullName', 'label'],
  ['tabVisibilities', 'tabSettings'],
]);

export const profileTabVisibiltyToPermissionSetTabVisibility: Map<string, string> = new Map([
  ['DefaultOff', 'Available'],
  ['DefaultOn', 'Visible'],
  ['Hidden', 'None'],
]);

/* Metadata without access are not part of the pulled Permission Set, so removing them to be coherent */
// eslint-disable-next-line complexity
export function isMetadataWithoutAccess(permissionSetNodeName: string, permissionSetNodeValue: AnyJson): boolean {
  // Keep default to true to potentially keep new nodes not handled here
  let hasAccess = true;

  switch (permissionSetNodeName) {
    case 'applicationVisibilities': {
      hasAccess = (permissionSetNodeValue as PermissionSetApplicationVisibility).visible;
      break;
    }
    case 'classAccesses': {
      hasAccess = (permissionSetNodeValue as PermissionSetApexClassAccess).enabled;
      break;
    }
    case 'customMetadataTypeAccesses': {
      hasAccess = (permissionSetNodeValue as PermissionSetCustomMetadataTypeAccess).enabled;
      break;
    }
    case 'customPermissions': {
      hasAccess = (permissionSetNodeValue as PermissionSetCustomPermissions).enabled;
      break;
    }
    case 'customSettingAccesses': {
      hasAccess = (permissionSetNodeValue as PermissionSetCustomSettingAccesses).enabled;
      break;
    }
    case 'externalCredentialPrincipalAccesses': {
      hasAccess = (permissionSetNodeValue as PermissionSetExternalCredentialPrincipalAccess).enabled;
      break;
    }
    case 'externalDataSourceAccesses': {
      hasAccess = (permissionSetNodeValue as PermissionSetExternalDataSourceAccess).enabled;
      break;
    }
    case 'fieldPermissions': {
      const fieldPermission = permissionSetNodeValue as PermissionSetFieldPermissions;
      hasAccess = fieldPermission.editable || fieldPermission.readable;
      break;
    }
    case 'flowAccesses': {
      hasAccess = (permissionSetNodeValue as PermissionSetFlowAccess).enabled;
      break;
    }
    case 'objectPermissions': {
      const fieldPermission = permissionSetNodeValue as PermissionSetObjectPermissions;
      hasAccess =
        fieldPermission.allowCreate ||
        fieldPermission.allowDelete ||
        fieldPermission.allowEdit ||
        fieldPermission.allowRead ||
        fieldPermission.modifyAllRecords ||
        fieldPermission.viewAllRecords;
      break;
    }
    case 'pageAccesses': {
      hasAccess = (permissionSetNodeValue as PermissionSetApexPageAccess).enabled;
      break;
    }
    case 'recordTypeVisibilities': {
      hasAccess = (permissionSetNodeValue as PermissionSetRecordTypeVisibility).visible;
      break;
    }
    case 'tabSettings': {
      const fieldPermission = permissionSetNodeValue as PermissionSetTabVisibility;
      hasAccess = fieldPermission.visibility !== 'None';
      break;
    }
    case 'userPermissions': {
      hasAccess = (permissionSetNodeValue as PermissionSetUserPermissions).enabled;
      break;
    }
  }

  return hasAccess;
}
