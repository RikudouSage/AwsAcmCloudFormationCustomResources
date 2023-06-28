export function getRegionFromArn(arn: string): string {
    return arn.split(':')[3];
}
