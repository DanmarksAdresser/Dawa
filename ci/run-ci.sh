#!/usr/bin/env bash
set -e
docker-compose -f ci/docker-compose.yml build
docker-compose -f ci/docker-compose.yml up -d db s3rver
# Wait for DB server to be up
sleep 30s
docker-compose -f ci/docker-compose.yml run dawa-init-db
docker-compose -f ci/docker-compose.yml up -d dawa-server
docker-compose -f ci/docker-compose.yml run dawa-test
docker-compose -f ci/docker-compose.yml down
