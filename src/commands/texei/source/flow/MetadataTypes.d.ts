export type FlowMetadataType = {
  Flow: Flow;
};

export type Flow = {
  interviewLabel: string;
  label: string;
  status: string;
  start?: {
    locationX: number;
    locationY: number;
    connector: {
      targetReference: string;
    };
    object?: string;
    recordTriggerType?: string;
    triggerType?: string;
    filterFormula?: string;
    filters?: FlowRecordFilter[];
  };
  variables?: FlowVariable[];
};

export type FlowVariable = {
  name: string;
  dataType: string;
  isCollection: boolean;
  isInput: boolean;
  isOutput: true;
  objectType: string;
};

export type FlowRecordFilter = {
  field: string;
  operator: string;
  value: FlowElementReferenceOrValue;
};

export type FlowElementReferenceOrValue = {
  apexValue?: string;
  booleanValue?: boolean;
};
