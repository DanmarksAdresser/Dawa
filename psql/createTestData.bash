#!/bin/bash

cd test/data
psql -h localhost -p 5432 dawa dawa -f ../../psql/createTestData.sql
gzip *
