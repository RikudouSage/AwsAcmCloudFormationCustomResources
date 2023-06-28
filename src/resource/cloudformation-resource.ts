import {CustomResourceRequest, CustomResourceRequestType, ResourceProperties} from "../cloudformation-types";
import {ValidationObject} from "../validation/validation";

export interface CloudformationResourceResult<T extends ResourceProperties> {
    Arn: string;
    Data: T;
}

export abstract class CloudformationResource<
    TName extends string,
    TProperties extends ResourceProperties,
    TResultData extends ResourceProperties,
> {
    protected constructor(
        private _name: TName
    ) {
    }

    protected abstract get validationData(): ValidationObject;
    protected abstract create(logicalResourceId: string, properties: TProperties): Promise<CloudformationResourceResult<TResultData> | null>;
    protected abstract delete(physicalResourceId: string): Promise<CloudformationResourceResult<TResultData>>;
    protected abstract update(logicalResourceId: string, physicalResourceId: string, properties: TProperties, oldProperties: TProperties): Promise<CloudformationResourceResult<TResultData> | null>;

    public get name(): TName {
        return this._name;
    }

    public async handle(event: CustomResourceRequest): Promise<CloudformationResourceResult<TResultData> | null> {
        const properties = this.validated(<TProperties>(event.ResourceProperties ?? {}));
        switch (event.RequestType) {
            case CustomResourceRequestType.Create:
                return await this.create(event.LogicalResourceId, properties);
            case CustomResourceRequestType.Delete:
                return await this.delete(event.PhysicalResourceId!);
            case CustomResourceRequestType.Update:
                if (this.requiredPropertiesChanged(properties, <TProperties>event.OldResourceProperties)) {
                    return await this.create(event.LogicalResourceId, properties);
                }
                return await this.update(event.LogicalResourceId, event.PhysicalResourceId!, properties, <TProperties>event.OldResourceProperties);
            default:
                throw new Error(`Unsupported request type: ${event.RequestType}`);
        }
    }

    protected validated(properties: TProperties): TProperties {
        let result: any = {};
        const errors: string[] = [];
        for (const propertyName of Object.keys(this.validationData)) {
            const config = this.validationData[propertyName];

            let targetValue = properties[propertyName];
            if (config.transform) {
                targetValue = config.transform(targetValue);
            }
            targetValue ??= config.defaultValue;

            if (config.required && typeof targetValue === 'undefined') {
                errors.push(`The property '${propertyName}' is required.`);
                continue;
            }
            if (typeof targetValue === 'undefined') {
                continue;
            }

            if (typeof targetValue === 'string') {
                if (config.enum && config.enum.indexOf(targetValue) < 0) {
                    errors.push(`The property ${propertyName} must be one of: ${config.enum.join(', ')}. '${targetValue}' given.`);
                    continue;
                }
                if (config.pattern && !config.pattern.test(targetValue)) {
                    errors.push(`The property ${propertyName} doesn't match the required format. Pattern: '${config.pattern.source}'.`);
                    continue;
                }
            }

            result[propertyName] = targetValue;
        }

        if (errors.length) {
            throw new Error(`Error: ${errors.join(', ')}`);
        }

        return <TProperties>result;
    }

    private requiredPropertiesChanged(properties: TProperties, oldProperties: TProperties): boolean {
        for (const propertyName of Object.keys(this.validationData)) {
            const config = this.validationData[propertyName];
            if (!config.requiresReplacement) {
                continue;
            }

            if (properties[propertyName] === oldProperties[propertyName]) {
                continue;
            }

            return true;
        }

        return false;
    }
}
