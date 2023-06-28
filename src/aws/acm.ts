import {ACM} from "aws-sdk";

export function getAcm(region: string | undefined): ACM {
    if (region === undefined) {
        return new ACM({apiVersion: '2015-12-08'});
    }
    return new ACM({region: region, apiVersion: '2015-12-08'});
}
