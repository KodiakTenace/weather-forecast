import * as pulumi from "@pulumi/pulumi";
import * as aws from "@pulumi/aws";
import * as awsx from "@pulumi/awsx";

// Create a new VPC for the application
const vpc = new awsx.ec2.Vpc("air-tek-vpc", {});

// Create a security group for the application
const securityGroup = new aws.ec2.SecurityGroup("air-tek-sg", {
    vpcId: vpc.vpcId,
});

// Create Web UI ECR repository
const webUIRepository = new awsx.ecr.Repository("web-ui-repository", {});
const webUIImage = new awsx.ecr.Image("web-ui-image", {
    repositoryUrl: webUIRepository.url,
    path: "./air-tek-weather-app/infra-web",
});

// Create Web API ECR repository
const webAPIRepository = new awsx.ecr.Repository("web-api-repository", {});
const webAPIImage = new awsx.ecr.Image("web-api-image", {
    repositoryUrl: webAPIRepository.url,
    path: "./air-tek-weather-app/infra-api",
});

// Create ECS Cluster
const cluster = new aws.ecs.Cluster("air-tek-cluster", {});


// Create an ALB associated with the default VPC for this region.
const alb = new awsx.lb.ApplicationLoadBalancer("web-traffic", {
    subnetIds: vpc.publicSubnetIds,
    listener: { port: 80 },
    defaultTargetGroup: {
        port: 3000,
    },
});

// Create Fargate services for Web UI
const webUIService = new awsx.ecs.FargateService("web-ui-service", {
    cluster: cluster.arn,
    networkConfiguration: {
      subnets: vpc.privateSubnetIds,
      securityGroups: [securityGroup.id]
    },
    desiredCount: 1,
    taskDefinitionArgs: {
        container: {
            name: 'web-ui-container',
            image: webUIImage.imageUri,
            cpu: 512,
            memory: 128,
            essential: true,
            portMappings: [{
                targetGroup: alb.defaultTargetGroup,
            }]
        },
    },
});

// Create Fargate services for Web UI
const webSPIService = new awsx.ecs.FargateService("web-api-service", {
    cluster: cluster.arn,
    networkConfiguration: {
        subnets: vpc.privateSubnetIds,
        securityGroups: [securityGroup.id]
    },
    desiredCount: 1,
    taskDefinitionArgs: {
        container: {
            name: 'web-api-container',
            image: webAPIImage.imageUri,
            cpu: 512,
            memory: 128,
            essential: true,
        },
    },
});

// Export endpoint
export const endpoint = alb.loadBalancer.dnsName;
