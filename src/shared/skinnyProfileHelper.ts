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
  ProfileApplicationVisibility,
  ProfileTabVisibility,
  ProfileFieldLevelSecurity,
  ProfileObjectPermissions,
  ProfileUserPermission,
  ProfileApexClassAccess,
  ProfileApexPageAccess,
  ProfileCustomMetadataTypeAccess,
  ProfileFlowAccess,
  ProfileCustomPermissions,
  ProfileCustomSettingAccesses,
  ProfileRecordTypeVisibility,
  ProfileExternalDataSourceAccess,
} from '../commands/texei/skinnyprofile/MetadataTypes';

// This should be on a Permission Set
// TODO: customSettingAccesses ?
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

export const mandatoryPermissionsForLicense: Map<string, string[]> = new Map([
  [
    'Salesforce',
    ['ActivitiesAccess', 'AllowViewKnowledge', 'ChatterInternalUser', 'LightningConsoleAllowedForUser', 'ViewHelpLink'],
  ],
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

export function removeAllProfileAccess(profileNodeName: string, profileNodeValue: AnyJson, license: string): void {
  switch (profileNodeName) {
    case 'applicationVisibilities': {
      const isDefaultApp = (profileNodeValue as ProfileApplicationVisibility).default;
      if (!isDefaultApp) {
        (profileNodeValue as ProfileApplicationVisibility).visible = false;
      }
      break;
    }
    case 'classAccesses': {
      (profileNodeValue as ProfileApexClassAccess).enabled = false;
      break;
    }
    case 'customMetadataTypeAccesses': {
      (profileNodeValue as ProfileCustomMetadataTypeAccess).enabled = false;
      break;
    }
    case 'customPermissions': {
      (profileNodeValue as ProfileCustomPermissions).enabled = false;
      break;
    }
    case 'customSettingAccesses': {
      (profileNodeValue as ProfileCustomSettingAccesses).enabled = false;
      break;
    }
    case 'externalDataSourceAccesses': {
      (profileNodeValue as ProfileExternalDataSourceAccess).enabled = false;
      break;
    }
    case 'fieldPermissions': {
      const fieldPermission = profileNodeValue as ProfileFieldLevelSecurity;
      fieldPermission.editable = false;
      fieldPermission.readable = false;
      break;
    }
    case 'flowAccesses': {
      (profileNodeValue as ProfileFlowAccess).enabled = false;
      break;
    }
    case 'objectPermissions': {
      const fieldPermission = profileNodeValue as ProfileObjectPermissions;
      fieldPermission.allowCreate = false;
      fieldPermission.allowDelete = false;
      fieldPermission.allowEdit = false;
      fieldPermission.allowRead = false;
      fieldPermission.modifyAllRecords = false;
      fieldPermission.viewAllRecords = false;
      break;
    }
    case 'pageAccesses': {
      (profileNodeValue as ProfileApexPageAccess).enabled = false;
      break;
    }
    case 'recordTypeVisibilities': {
      const recordTypeAccess = profileNodeValue as ProfileRecordTypeVisibility;
      if (!(recordTypeAccess.default === true || recordTypeAccess.personAccountDefault === true)) {
        recordTypeAccess.visible = false;
      }
      break;
    }
    case 'tabVisibilities': {
      (profileNodeValue as ProfileTabVisibility).visibility = 'Hidden';
      break;
    }
    case 'userPermissions': {
      const mandatoryPermissions = mandatoryPermissionsForLicense.get(license);
      const permission = profileNodeValue as ProfileUserPermission;

      if (!mandatoryPermissions?.includes(permission.name)) {
        permission.enabled = false;
      }
      break;
    }
  }
}
