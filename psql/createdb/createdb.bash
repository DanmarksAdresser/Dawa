#!/bin/bash

set -x

if [ "$#" != "3" ]; then
	echo "Usage: $0  <DB-host> <DB-name> <DB-user>"
	exit 1
fi

DIR=`dirname $0`
DB_HOST=$1
DB_NAME=$2
DB_USER=$3

sed "s/DB_NAME/$DB_NAME/g" < "$DIR/createdb.sql" | psql -U "$DB_USER" -h "$DB_HOST"