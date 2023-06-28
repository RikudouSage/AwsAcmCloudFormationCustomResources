import {CloudformationResource, CloudformationResourceResult} from "./cloudformation-resource";
import {ValidationObject} from "../validation/validation";
import {ResourceProperties, ResourceTags} from "../cloudformation-types";
import {ACM} from "aws-sdk";
import {getAcm} from "../aws/acm";
import {getRegionFromArn} from "../aws/arn";

interface CertificateProperties extends ResourceProperties {
    CertificateAuthorityArn?: string;
    CertificateTransparencyLoggingPreference?: 'DISABLED' | 'ENABLED';
    DomainName: string;
    SubjectAlternativeNames?: string[];
    ValidationMethod: 'DNS' | 'EMAIL';
    Region?: string;
    // Tags?: ResourceTags;
}

export class Certificate extends CloudformationResource<
    'Custom::Certificate',
    CertificateProperties,
    ResourceProperties
> {
    protected get validationData(): ValidationObject {
        return {
            CertificateAuthorityArn: {
                required: false,
                requiresReplacement: true,
                pattern: /arn:[\w+=/,.@-]+:acm-pca:[\w+=/,.@-]*:[0-9]+:[\w+=,.@-]+(\/[\w+=,.@-]+)*/,
            },
            CertificateTransparencyLoggingPreference: {
                required: false,
                requiresReplacement: false,
                enum: ['ENABLED', 'DISABLED'],
            },
            DomainName: {
                required: true,
                requiresReplacement: true,
                pattern: /^(\*\.)?(((?!-)[A-Za-z0-9-]{0,62}[A-Za-z0-9])\.)+((?!-)[A-Za-z0-9-]{1,62}[A-Za-z0-9])$/
            },
            SubjectAlternativeNames: {
                required: false,
                requiresReplacement: true,
            },
            ValidationMethod: {
                required: true,
                requiresReplacement: true,
                defaultValue: 'DNS',
            },
            Region: {
                required: false,
                requiresReplacement: true,
            },
            Tags: {
                required: false,
                requiresReplacement: false,
            },
        };
    }

    constructor() {
        super("Custom::Certificate");
    }

    protected async create(logicalResourceId: string, properties: CertificateProperties): Promise<CloudformationResourceResult<ResourceProperties>> {
        const acm = getAcm(properties.Region);
        const result = await acm.requestCertificate({
            CertificateAuthorityArn: properties.CertificateAuthorityArn,
            Options: {
                CertificateTransparencyLoggingPreference: properties.CertificateTransparencyLoggingPreference,
            },
            DomainName: properties.DomainName,
            SubjectAlternativeNames: properties.SubjectAlternativeNames,
            ValidationMethod: properties.ValidationMethod,
        }).promise();

        return {
            Arn: result.CertificateArn ?? 'error',
            Data: {},
        };
    }

    protected async delete(physicalResourceId: string): Promise<CloudformationResourceResult<ResourceProperties>> {
        const acm = getAcm(getRegionFromArn(physicalResourceId));
        await acm.deleteCertificate({
            CertificateArn: physicalResourceId,
        }).promise();

        return {
            Arn: physicalResourceId,
            Data: {},
        };
    }

    protected async update(logicalResourceId: string, physicalResourceId: string, properties: CertificateProperties, oldProperties: CertificateProperties): Promise<CloudformationResourceResult<ResourceProperties> | null> {
        const acm = getAcm(getRegionFromArn(physicalResourceId));
        if (properties.CertificateTransparencyLoggingPreference !== oldProperties.CertificateTransparencyLoggingPreference) {
            await acm.updateCertificateOptions({
                CertificateArn: physicalResourceId,
                Options: {
                    CertificateTransparencyLoggingPreference: properties.CertificateTransparencyLoggingPreference,
                }
            }).promise();
        }

        // if (properties.Tags !== oldProperties.Tags) {
        //     const newTags = properties.Tags?.filter(tag => {
        //         return !oldProperties.Tags?.includes(tag);
        //     }) ?? [];
        //     if (newTags.length) {
        //         await acm.addTagsToCertificate({
        //             CertificateArn: physicalResourceId,
        //             Tags: newTags,
        //         }).promise();
        //     }
        //
        //     const removedTags = oldProperties.Tags?.filter(tag => {
        //         return !properties.Tags?.includes(tag);
        //     }) ?? [];
        //     console.log(properties, oldProperties, removedTags);
        //     if (removedTags.length) {
        //         await acm.removeTagsFromCertificate({
        //             CertificateArn: physicalResourceId,
        //             Tags: removedTags,
        //         });
        //     }
        // }

        return {
            Arn: physicalResourceId,
            Data: {},
        };
    }
}
