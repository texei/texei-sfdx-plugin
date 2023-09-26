interface DataPlan {
  excludedFields: string[];
  lookupOverride?: Record<string, never>;
  sObjects: DataPlanSObject[];
}

interface DataPlanSObject {
  name: string;
  label: string;
  filters: string;
  orderBy: string;
  externalId: string;
  excludedFields: string[];
  lookupOverride?: object;
  batchSize?: number;
}
