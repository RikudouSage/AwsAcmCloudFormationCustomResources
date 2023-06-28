import {CloudformationResource, CloudformationResourceResult} from "./cloudformation-resource";
import {ResourceProperties} from "../cloudformation-types";
import {ValidationObject} from "../validation/validation";
import {getAcm} from "../aws/acm";

interface CertificateBlockerProperties extends ResourceProperties {
    CertificateArn: string;
}

export class CertificateBlocker extends CloudformationResource<
    'Custom::IssuedCertificate',
    CertificateBlockerProperties,
    {}
> {
    constructor() {
        super('Custom::IssuedCertificate');
    }

    protected async create(logicalResourceId: string, properties: CertificateBlockerProperties): Promise<CloudformationResourceResult<{}> | null> {
        const region = properties.CertificateArn.split(':')[3];
        const acm = getAcm(region);

        const certificate = await acm.describeCertificate({
            CertificateArn: properties.CertificateArn,
        }).promise();

        if (certificate.Certificate === undefined) {
            return null;
        }

        if (certificate.Certificate.Status !== 'ISSUED' && certificate.Certificate.Status !== 'PENDING_VALIDATION') {
            throw new Error(`Invalid status of certificate: ${certificate.Certificate!.Status}`)
        }

        if (certificate.Certificate.Status !== 'ISSUED') {
            return null;
        }

        return {
            Arn: properties.CertificateArn,
            Data: {},
        };
    }

    protected async update(logicalResourceId: string, physicalResourceId: string, properties: CertificateBlockerProperties, oldProperties: CertificateBlockerProperties): Promise<CloudformationResourceResult<{}> | null> {
        return await this.create(logicalResourceId, properties);
    }

    protected async delete(physicalResourceId: string): Promise<CloudformationResourceResult<{}>> {
        return {
            Arn: physicalResourceId,
            Data: {},
        };
    }

    protected get validationData(): ValidationObject {
        return {
            CertificateArn: {
                required: true,
                requiresReplacement: true,
                pattern: /arn:[\w+=/,.@-]+:acm:[\w+=/,.@-]*:[0-9]+:[\w+=,.@-]+(\/[\w+=,.@-]+)*/
            }
        };
    }
}
