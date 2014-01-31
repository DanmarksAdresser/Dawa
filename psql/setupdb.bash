#!/bin/bash

set -x

if [ "$#" != "4" ]; then
	echo "Usage: $0 <data-dir> <DB-host> <DB-name> <DB-user>"
	exit 1
fi
OLDPWD=`pwd`
DATADIR=$OLDPWD/${1%/}
HOST=$2
DB=$3
USER=$4
GEN="setupdb.GENERATED.sql"

# Goto the script directory
cd `dirname $0`
PWD=`pwd`

cp setupdb.source.sql $GEN

SED="s/:DATADIR:/${DATADIR//\//\\/}/g;s/:SCRIPTDIR:/${PWD//\//\\/}/g"

sed -i $SED $GEN

psql -h $HOST $DB $USER -f $PWD/$GEN

