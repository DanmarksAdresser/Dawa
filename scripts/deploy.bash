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

if [ "$#" != "1" ]; then
	echo "Usage: $0 <git tag>"
	exit 1
fi

read -p "Are you sure you want to deploy to production (y/n)? " choice
case "$choice" in
  y|Y ) echo "Beginning deployment...";;
  n|N ) echo "Stopping..."; exit 0;;
  * )   echo "Input not understood. Stopping..."; exit 1;;
esac

set -x

VERSION="$1"
TIME=`date +"%b-%d-%Y-%H-%M-%S"`
ZIP="dawa-$VERSION-$TIME.zip"
BUCKET=elasticbeanstalk-eu-west-1-040349710985
APPNAME="Dawa"
APPNAMEENV="$APPNAME-env"
FILENAME="$VERSION.zip"
TMPDIR="/tmp/dawadeploy/$VERSION"

# EXISTS is 2 in case the version is new.
EXISTS=`aws elasticbeanstalk describe-application-versions --output json \
    --application-name "$APPNAME" \
    --version-label "$VERSION" | grep -v "\[\]" | wc -l | tr -d ' '`

if [[ $EXISTS == 2 ]]; then
    git clone https://github.com/DanmarksAdresser/Dawa "$TMPDIR"
    (cd "$TMPDIR" ; npm install ; zip --recurse-paths "$TMPDIR/$FILENAME" * -x data/\* \*.zip  )
    aws s3 cp "$TMPDIR/$FILENAME" "s3://$BUCKET/$FILENAME" &&
    aws elasticbeanstalk create-application-version \
        --application-name "$APPNAME" \
        --version-label "$VERSION" \
        --source-bundle S3Bucket="$BUCKET",S3Key="$FILENAME" &&
    aws elasticbeanstalk update-environment \
        --environment-name "$APPNAMEENV" \
        --version-label "$VERSION"
else
    echo "Version exist: $VERSION";
fi
