A custom resource for ACM certificates intended as a drop-in replacement for
[binxio/cfn-certificate-provider](https://github.com/binxio/cfn-certificate-provider).

It allows you to create a certificate in a different region than the rest of the resources.


## Installation

You need `serverless` framework.

1. Clone this repository
2. Run `yarn install` (or use `npm` if that's more your thing)
3. Run `yarn build` (or use `npm run build`)
4. Run `serverlesss deploy` (will deploy with stage name `dev`)
    1. Alternatively specify a stage, like `serverless deploy --stage prod`
    2. You can also specify a region: `serverless deploy --stage prod --region eu-central-1`
5. **Repeat for all regions you intend to use the custom resources in**

## Usage 

This is intended as a drop-in replacement for [binxio/cfn-certificate-provider](https://github.com/binxio/cfn-certificate-provider).

I didn't study their code closely, so there might be something that works differently,
feel free to open an issue, and I'll fix it.

Resources:

### Custom::Certificate

Creates a certificate.

Parameters:

- `DomainName` (**required**) - the domain name to create the certificate for
- `SubjectAlternativeNames` - list of strings, additional domain names
- `Region` - a string with region, if not provided, defaults to the current region
- `ValidationMethod` - DNS or EMAIL, defaults to DNS
- `CertificateAuthorityArn` - a string with the certificate authority
- `CertificateTransparencyLoggingPreference` - ENABLED or DISABLED, certificate transparency logging

Return values:

- `!Ref` - returns the certificate ARN

### Custom::IssuedCertificate

A virtual resource that gets created only after the certificate it references is successfully verified. You can
depend on a resource of this type to make sure the certificate is issued as most (all?) resources will fail creating
for a certificate that is pending validation.

Parameters:

- `CertificateArn` (**required**) - the ARN of the certificate to reference

Return values:

- `!Ref`- returns the ARN of the referenced certificate

### Custom::CertificateDNSRecord

A virtual resource that contains DNS records to create. It only gets created when a certificate is issued, meaning
it can be safely referenced even before the certificate is issued.

Parameters:

- `CertificateArn` (**required**) - the ARN of the certificate to get DNS for
- `DomainName` (**required**) - the domain name to get DNS records for

Return values:
- `!Ref` - returns the ARN of the referenced certificate
- `!GetAtt Name` - returns the DNS name
- `!GetAtt Type` - returns the type of the record (always CNAME)
- `!GetAtt Value` - returns the value of the record

## Example

```yaml
service: MyCoolService

provider:
  name: aws
  stage: ${opt:stage, 'dev'}
  region: eu-central-1
  runtime: nodejs14.x

custom:
  # change the 'prod' in 'AcmCustomResources-prod-customResources' if you deployed to a different stage
  ServiceToken: !Join [':', ['arn:aws:lambda', !Ref AWS::Region, !Ref AWS::AccountId, 'function:AcmCustomResources-prod-customResources']]
  Domain: supercooltest.example.com
  HostedZone: Z6T0SDLM1DCEF

resources:
  Resources:
    Certificate:
      Type: Custom::Certificate
      Properties:
        DomainName: ${self:custom.Domain}
        ValidationMethod: DNS
        Region: us-east-1 # custom region different to the global one (eu-central-1)
        ServiceToken: ${self:custom.ServiceToken}
    CertificateBlocker:
      Type: Custom::IssuedCertificate
      DependsOn:
        - DnsRecordsCertificateValidation
      Properties:
        CertificateArn: !Ref Certificate
        ServiceToken: ${self:custom.ServiceToken}
    CertificateDnsRecord:
      Type: Custom::CertificateDNSRecord
      Properties:
        CertificateArn: !Ref Certificate
        DomainName: ${self:custom.Domain}
        ServiceToken: ${self:custom.ServiceToken}
    DnsRecordsCertificateValidation:
      Type: AWS::Route53::RecordSetGroup
      Properties:
        HostedZoneId: ${self:custom.HostedZone}
        RecordSets:
          - Name: !GetAtt CertificateDnsRecord.Name
            Type: !GetAtt CertificateDnsRecord.Type
            TTL: 60
            Weight: 1
            SetIdentifier: !Ref Certificate
            ResourceRecords:
              - !GetAtt CertificateDnsRecord.Value
```
