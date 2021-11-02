interface DataPlan {
    excludedFields: Array<string>;
    sObjects: Array<DataPlanSObject>;
}

interface DataPlanSObject {
    name: string;
    label: string;
    filters: string;
    orderBy: string;
    externalId: string;
    excludedFields: Array<string>;
}
