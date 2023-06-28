export enum CustomResourceRequestType {
    Create = 'Create',
    Update = 'Update',
    Delete = 'Delete',
}

export enum CustomResourceStatus {
    Success = 'SUCCESS',
    Failure = 'FAILED',
}

export interface ResourceProperties {
    [name: string]: any;
}

export interface CustomResourceRequest {
    RequestType: CustomResourceRequestType;
    ResponseURL: string;
    StackId: string;
    RequestId: string;
    ResourceType: string;
    LogicalResourceId: string;
    PhysicalResourceId?: string; // only Update and Delete
    ResourceProperties?: ResourceProperties;
    OldResourceProperties?: ResourceProperties;
}

export interface CustomResourceResponse {
    Status: CustomResourceStatus;
    Reason?: string; // only for failure
    PhysicalResourceId: string; // copy from request
    StackId: string; // copy from request
    RequestId: string; // copy from request
    LogicalResourceId: string; // copy from request
    NoEcho?: boolean; // hide data from Data property
    Data?: ResourceProperties; // for !GetAtt
}

export interface ResourceTag {
    Key: string;
    Value: string;
}

export type ResourceTags = ResourceTag[];
