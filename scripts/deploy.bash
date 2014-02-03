#!/bin/bash

# TODO.  Document and maybe rewrite in Node.js

set -x

GITHASH=`git rev-parse --short HEAD`
VERSION="git-$GITHASH"
TIME=`date +"%b-%d-%Y-%H-%M-%S"`
ZIP="dawa-$VERSION-$TIME.zip"
BUCKET=elasticbeanstalk-eu-west-1-040349710985
APPNAME="Dawa"
APPNAMEENV="$APPNAME-env"

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
