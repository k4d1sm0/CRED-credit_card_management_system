import * as pulumi from "@pulumi/pulumi";
import * as aws from "@pulumi/aws";

// Configuration
const config = new pulumi.Config();
const dbName = config.require("dbName");
const dbUser = config.require("dbUser");
const dbPassword = config.requireSecret("dbPassword");
const dbInstanceClass = config.require("dbInstanceClass");

// Create a new VPC
const vpc = new aws.ec2.Vpc("my-vpc", {
    cidrBlock: "10.0.0.0/16",
    enableDnsSupport: true,
    enableDnsHostnames: true,
    tags: {
        Name: "my-vpc",
    },
});

// Create an Internet Gateway
const internetGateway = new aws.ec2.InternetGateway("my-internet-gateway", {
    vpcId: vpc.id,
    tags: {
        Name: "my-internet-gateway",
    },
});

// Create a route table
const routeTable = new aws.ec2.RouteTable("my-route-table", {
    vpcId: vpc.id,
    routes: [
        {
            cidrBlock: "0.0.0.0/0",
            gatewayId: internetGateway.id,
        },
    ],
    tags: {
        Name: "my-route-table",
    },
});

// Create subnets
const subnet1 = new aws.ec2.Subnet("subnet-1", {
    vpcId: vpc.id,
    cidrBlock: "10.0.1.0/24",
    availabilityZone: "us-east-1a",
    tags: {
        Name: "my-subnet-1",
    },
});

const subnet2 = new aws.ec2.Subnet("subnet-2", {
    vpcId: vpc.id,
    cidrBlock: "10.0.2.0/24",
    availabilityZone: "us-east-1b",
    tags: {
        Name: "my-subnet-2",
    },
});

// Associate subnets with the route table
new aws.ec2.RouteTableAssociation("subnet1-association", {
    subnetId: subnet1.id,
    routeTableId: routeTable.id,
});

new aws.ec2.RouteTableAssociation("subnet2-association", {
    subnetId: subnet2.id,
    routeTableId: routeTable.id,
});

// Create a new security group for the RDS instance
const securityGroup = new aws.ec2.SecurityGroup("rdsSecurityGroup", {
    vpcId: vpc.id,
    description: "Allow MySQL access",
    ingress: [
        {
            protocol: "tcp",
            fromPort: 3306,
            toPort: 3306,
            cidrBlocks: ["0.0.0.0/0"], // For testing purposes, allows access from anywhere. Restrict this in production.
        },
    ],
    egress: [
        {
            protocol: "-1",
            fromPort: 0,
            toPort: 0,
            cidrBlocks: ["0.0.0.0/0"],
        },
    ],
});

// Create a subnet group
const subnetGroup = new aws.rds.SubnetGroup("rdsSubnetGroup", {
    name: "my-subnet-group",
    subnetIds: [subnet1.id, subnet2.id],
    tags: {
        Name: "my-subnet-group",
    },
});

// Create an RDS instance
const db = new aws.rds.Instance("rdsInstance", {
    allocatedStorage: 20, // Minimum storage size
    identifier: "my-instance",
    engine: "mysql",
    engineVersion: "8.0.35",
    instanceClass: dbInstanceClass,
    dbName: dbName,
    username: dbUser,
    password: dbPassword,
    skipFinalSnapshot: true,
    dbSubnetGroupName: subnetGroup.name,
    vpcSecurityGroupIds: [securityGroup.id],
    publiclyAccessible: true,
    storageType: "gp3",
    tags: {
        Name: "my-rds-instance",
    },
});

// Export the connection details
export const endpoint = db.endpoint;
export const port = db.port;
export const vpcId = vpc.id;
export const subnetIds = [subnet1.id, subnet2.id];
export const securityGroupId = securityGroup.id;
