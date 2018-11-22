#!/bin/bash
set -x

if [ "$#" != "1" ]; then
	echo "Usage: $0 <out-dir>"
	exit 1
fi

OUTDIR=`pwd`/${1%/}

# Gote script directory
cd `dirname $0`
SCRIPTDIR=`pwd`

# Goto output directory
cd $OUTDIR

psql -h localhost dawa dawa -f ${SCRIPTDIR}/createTestData.sql &&
gzip *
