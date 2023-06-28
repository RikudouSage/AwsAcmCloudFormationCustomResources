import {ResourceProperties} from "../cloudformation-types";
import {CloudformationResource, CloudformationResourceResult} from "./cloudformation-resource";
import {ValidationObject} from "../validation/validation";
import {getAcm} from "../aws/acm";

interface CertificateDnsRecordProperties extends ResourceProperties {
    CertificateArn: string;
    DomainName: string;
}

interface CertificateDnsRecordResult extends ResourceProperties {
    Name: string;
    Type: string;
    Value: string;
}

export class CertificateDnsRecord extends CloudformationResource<
    'Custom::CertificateDNSRecord',
    CertificateDnsRecordProperties,
    CertificateDnsRecordResult
>{
    constructor() {
        super('Custom::CertificateDNSRecord');
    }

    protected async create(logicalResourceId: string, properties: CertificateDnsRecordProperties): Promise<CloudformationResourceResult<CertificateDnsRecordResult> | null> {
        const region = properties.CertificateArn.split(':')[3];
        const acm = getAcm(region);

        const certificate = await acm.describeCertificate({
            CertificateArn: properties.CertificateArn,
        }).promise();

        if (certificate.Certificate === undefined) {
            return null;
        }

        if (certificate.Certificate.DomainValidationOptions === undefined) {
            return null;
        }

        for (const option of certificate.Certificate.DomainValidationOptions) {
            if (option.DomainName !== properties.DomainName) {
                continue;
            }

            const record = option.ResourceRecord;
            if (record === undefined) {
                return null;
            }

            return {
                Arn: properties.CertificateArn,
                Data: {
                    Type: record.Type,
                    Value: record.Value,
                    Name: record.Name,
                },
            };
        }

        return null;
    }

    protected async delete(physicalResourceId: string): Promise<CloudformationResourceResult<CertificateDnsRecordResult>> {
        return {
            Arn: physicalResourceId,
            Data: {
                Type: '',
                Name: '',
                Value: '',
            },
        };
    }

    protected async update(logicalResourceId: string, physicalResourceId: string, properties: CertificateDnsRecordProperties, oldProperties: CertificateDnsRecordProperties): Promise<CloudformationResourceResult<CertificateDnsRecordResult> | null> {
        return await this.create(logicalResourceId, properties);
    }

    protected get validationData(): ValidationObject {
        return {
            CertificateArn: {
                required: true,
                requiresReplacement: true,
                pattern: /arn:[\w+=/,.@-]+:acm:[\w+=/,.@-]*:[0-9]+:[\w+=,.@-]+(\/[\w+=,.@-]+)*/
            },
            DomainName: {
                required: true,
                requiresReplacement: true,
                pattern: /^(\*\.)?(((?!-)[A-Za-z0-9-]{0,62}[A-Za-z0-9])\.)+((?!-)[A-Za-z0-9-]{1,62}[A-Za-z0-9])$/,
            }
        };
    }
}
