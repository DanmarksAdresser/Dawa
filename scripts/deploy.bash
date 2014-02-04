#!/bin/bash

if [ "$1" == "--help" ]; then
    echo ""
    echo "     ################################################################################"
    echo "     ### Deployment script for Beanstalk ############################################"
    echo "     ################################################################################"
    echo "     #                                                                              #"
    echo "     # This script will deploy the current HEAD of you git repository to the Dawa   #"
    echo "     # Elastic Beanstalk production environment.                                    #"
    echo "     #                                                                              #"
    echo "     # To use it you first need to install the awscli tool:                         #"
    echo "     #                                                                              #"
    echo "     #    $> sudo aptitude install python-pip                                       #"
    echo "     #    $> sudo pip install awscli                                                #"
    echo "     #                                                                              #"
    echo "     # Then you need your AWS access keys installed in awscli:                      #"
    echo "     #                                                                              #"
    echo "     #    $> aws configure                                                          #"
    echo "     #                                                                              #"
    echo "     # Access keys can be created through the AWS>IAM>User>Security-Credentials     #"
    echo "     # web-console:                                                                 #"
    echo "     #                                                                              #"
    echo "     #    https://console.aws.amazon.com/iam/home?region=eu-west-1#users            #"
    echo "     #                                                                              #"
    echo "     ################################################################################"
    echo "     ################################################################################"
    echo "     ################################################################################"
    echo ""
    echo ""
    echo "   Usage: $0 [--help]"

    exit 1
fi

set -x

GITHASH=`git rev-parse --short HEAD`
VERSION="git-$GITHASH"
TIME=`date +"%b-%d-%Y-%H-%M-%S"`
ZIP="dawa-$VERSION-$TIME.zip"
BUCKET=elasticbeanstalk-eu-west-1-040349710985
APPNAME="Dawa"
APPNAMEENV="$APPNAME-env"

# EXISTS is 2 in case the version is new.
EXISTS=`aws elasticbeanstalk describe-application-versions --output json \
    --application-name "$APPNAME" \
    --version-label "$VERSION" | grep -v "\[\]" | wc -l`

if [[ $EXISTS == 2 ]]; then
    zip --recurse-paths "$ZIP" * -x data/\* node_modules/\* \*.zip &&
    aws s3 cp $ZIP s3://$BUCKET/$ZIP &&
    aws elasticbeanstalk create-application-version \
        --application-name "$APPNAME" \
        --version-label "$VERSION" \
        --source-bundle S3Bucket="$BUCKET",S3Key="$ZIP" &&
    aws elasticbeanstalk update-environment \
        --environment-name "$APPNAMEENV" \
        --version-label "$VERSION"
else
    echo "Version exist: $VERSION";
fi
