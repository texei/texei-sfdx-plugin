export type ProfileMetadataType = {
  Profile: Profile;
};

export type Profile = {
  custom: boolean;
  userLicense: string;
  fullName: string;
  applicationVisibilities?: ProfileApplicationVisibility[];
  tabVisibilities?: ProfileTabVisibility[];
};

export type ProfileAgentAccess = {
  agentName: string;
  enabled: boolean;
};

export type ProfileApplicationVisibility = {
  application: string;
  default: boolean;
  visible: boolean;
};

export type ProfileTabVisibility = {
  tab: string;
  visibility: string;
};

export type ProfileFieldLevelSecurity = {
  editable: boolean;
  field: string;
  readable: boolean;
};

export type ProfileObjectPermissions = {
  allowCreate: boolean;
  allowDelete: boolean;
  allowEdit: boolean;
  allowRead: boolean;
  modifyAllRecords: boolean;
  object: string;
  viewAllRecords: boolean;
};

export type ProfileUserPermission = {
  enabled: boolean;
  name: string;
};

export type ProfileApexClassAccess = {
  apexClass: string;
  enabled: boolean;
};

export type ProfileApexPageAccess = {
  apexPage: string;
  enabled: boolean;
};

export type ProfileCustomMetadataTypeAccess = {
  enabled: boolean;
  name: string;
};

export type ProfileFlowAccess = {
  enabled: boolean;
  flow: string;
};

export type ProfileCustomPermissions = {
  enabled: boolean;
  name: string;
};

export type ProfileCustomSettingAccesses = {
  enabled: boolean;
  name: string;
};

export type ProfileRecordTypeVisibility = {
  recordType: string;
  default: boolean;
  personAccountDefault?: boolean;
  visible: boolean;
};

export type ProfileExternalDataSourceAccess = {
  enabled: boolean;
  externalDataSource: string;
};

export type PermissionSetMetadataType = {
  hasActivationRequired: boolean;
  label: string;
  fullName?: string;
  description?: string;
  license?: string;
  applicationVisibilities?: PermissionSetApplicationVisibility[];
  classAccesses?: PermissionSetApexClassAccess[];
  customMetadataTypeAccesses?: PermissionSetCustomMetadataTypeAccess[];
  customPermissions?: PermissionSetCustomPermissions[];
  customSettingAccesses?: PermissionSetCustomSettingAccesses[];
  externalCredentialPrincipalAccesses?: PermissionSetExternalCredentialPrincipalAccess[];
  externalDataSourceAccesses?: PermissionSetExternalDataSourceAccess[];
  fieldPermissions?: PermissionSetFieldPermissions[];
  flowAccesses?: PermissionSetFlowAccess[];
  objectPermissions?: PermissionSetObjectPermissions[];
  pageAccesses?: PermissionSetApexPageAccess[];
  recordTypeVisibilities?: PermissionSetRecordTypeVisibility[];
  tabSettings?: PermissionSetTabVisibility[];
  userPermissions?: PermissionSetUserPermissions[];
};

export type PermissionSetApplicationVisibility = {
  application: string;
  visible: boolean;
};

export type PermissionSetApexClassAccess = {
  apexClass: string;
  enabled: boolean;
};

export type PermissionSetCustomMetadataTypeAccess = {
  enabled: boolean;
  name: string;
};

export type PermissionSetCustomPermissions = {
  enabled: boolean;
  name: string;
};

export type PermissionSetCustomSettingAccesses = {
  enabled: boolean;
  name: string;
};

export type PermissionSetExternalCredentialPrincipalAccess = {
  enabled: boolean;
  externalCredentialPrincipal: string;
};

export type PermissionSetExternalDataSourceAccess = {
  enabled: boolean;
  externalDataSource: string;
};

export type PermissionSetFieldPermissions = {
  editable: boolean;
  field: string;
  readable: boolean;
};

export type PermissionSetFlowAccess = {
  enabled: boolean;
  flow: string;
};

export type PermissionSetObjectPermissions = {
  allowCreate: boolean;
  allowDelete: boolean;
  allowEdit: boolean;
  allowRead: boolean;
  modifyAllRecords: boolean;
  object: string;
  viewAllRecords: boolean;
};

export type PermissionSetApexPageAccess = {
  apexPage: string;
  enabled: boolean;
};

export type PermissionSetRecordTypeVisibility = {
  recordType: string;
  visible: boolean;
};

export type PermissionSetTabVisibility = {
  tab: string;
  visibility: string;
};

export type PermissionSetUserPermissions = {
  enabled: boolean;
  name: string;
};

export type PermissionSetRecord = {
  Profile: {
    Name: string;
  };
};
