interface DataPlan {
    excludedFields: Array<string>;
    lookupOverride?: {};
    sObjects: Array<DataPlanSObject>;
}

interface DataPlanSObject {
    name: string;
    label: string;
    filters: string;
    orderBy: string;
    externalId: string;
    excludedFields: Array<string>;
    lookupOverride?: {};
    batchSize?: number;
}
