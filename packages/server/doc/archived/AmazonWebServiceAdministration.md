
This document contains various information on different aspects of
setting up and administration AWS services.  It mainly focuses on the
difficulties encountered.

## Management Console

Sign-in to the AWS Management Console here:
[https://console.aws.amazon.com/](https://console.aws.amazon.com/)


## Monitoring

All instances, load-balancers, and databases are monitored through the
AWS CloudWatch service.

For application level monitoring, the Beanstalk load-balance does a
HTTP GET against Dawa, with a query hitting the DB, every minute. I
this fails for 3 minutes in a row, the Currently, if this fail 5 times
in a row, an email is sent to the administrator.


## Setting up a PostgreSQL database

 - Sign in to the Management Console
 - Go to RDS (Relational Database Service)
 - Set current region to EU (Ireland) in the drop-down menu in the
   upper right corner
 - Click "Lunch a DB Instance"
 - Follow the 6 steps to create a DB (creating a DB will take some
   minutes).  A number of DB-service parameters will decided!
 - In the steps above a Security Group was selected, go to RDS > VPN >
   Security Groups and ensure that correct access to the DB is
   configured (if Internet access is required, do a strict IP filter).
   Also see the section on Security Groups


## AWS Security Groups

Access to services is controlled by Security Groups (SG).  To
configure SGs:

 - Go to the VPN service
 - Click Security Groups

It is possible to add one SG as a source to an inbound rule of another
SG.  Fx adding the SG for Beanstalk instances to the SG of an RDS
instance.


## Setting up a Node app in Beanstalk

In order to debug problems, having ssh access to the beanstalk
instances is nice.  So remember to add a key-pair when creating a new
beanstalk environment.

In general follow the [official
documentation](http://docs.aws.amazon.com/elasticbeanstalk/latest/dg/create_deploy_nodejs.sdlc.html)

That said, we have found that error reporting lacking, so:

  - Make sure that your NPM configuration is valid and up to date
    ([http://package-json-validator.com/](http://package-json-validator.com/)
    can be used)
  - Remember to use the newest Node.js version.  We have not found an
    official list of version supported, but we currently use v0.10.21
    (as of 2014-01-23)
  - Use eb (the command line tool).  Unfortunately eb is rather
    undocumented.  The path of least resistance is to create beanstalk
    environments with eb, and not using the web-interface.  For some
    reason I have not been able to make eb attach to an existing
    environment
  - Eb requires access credentials.  These can be made for your user,
    through the AWS/IAM service

## Key-pairs

Key-pairs can be managed through the EC2 Dashboard.

