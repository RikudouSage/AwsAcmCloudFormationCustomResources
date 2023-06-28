import {CustomResourceRequest, CustomResourceResponse, CustomResourceStatus} from "./cloudformation-types";
import {Certificate} from "./resource/certificate";
import {CloudformationResource} from "./resource/cloudformation-resource";
import {CertificateBlocker} from "./resource/certificate-blocker";
import fetch from "node-fetch";
import {CertificateDnsRecord} from "./resource/certificate-dns-record";

const maxRetries = 55;
let retriesLeft = maxRetries;

function timeout<T>(callable: () => Promise<T>, timeout: number): Promise<T> {
    return new Promise<T>(resolve => {
        setTimeout(() => {
            callable().then(result => resolve(result));
        }, timeout * 1_000);
    });
}

export async function handle(event: CustomResourceRequest): Promise<void> {
    let response: CustomResourceResponse;
    try {
        const certificate = new Certificate();
        const blocker = new CertificateBlocker();
        const dnsRecord = new CertificateDnsRecord();

        let target: CloudformationResource<any, any, any>;
        switch (event.ResourceType) {
            case certificate.name:
                target = certificate;
                break;
            case blocker.name:
                target = blocker;
                break;
            case dnsRecord.name:
                target = dnsRecord;
                break;
            default:
                throw new Error(`Unsupported resource type: ${event.ResourceType}`);
        }

        let result = await target.handle(event);
        while (result === null) {
            if (retriesLeft) {
                --retriesLeft;
                result = await timeout(async () => await target.handle(event), 5);
            } else {
                throw new Error(`Creating of a certificate failed after ${maxRetries} retries.`);
            }
        }
        response = {
            Status: CustomResourceStatus.Success,
            Data: result.Data,
            LogicalResourceId: event.LogicalResourceId,
            PhysicalResourceId: result.Arn,
            RequestId: event.RequestId,
            StackId: event.StackId,
        };
    } catch (e) {
        response = {
            Status: CustomResourceStatus.Failure,
            StackId: event.StackId,
            RequestId: event.RequestId,
            PhysicalResourceId: 'error',
            LogicalResourceId: event.LogicalResourceId,
            Reason: (<Error>e).message,
        }
    }

    await fetch(event.ResponseURL, {
        method: 'PUT',
        headers: {
            'Content-Type': 'application/json',
        },
        body: JSON.stringify(response),
    });
}
