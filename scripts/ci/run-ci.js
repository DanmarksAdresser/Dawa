#!/usr/bin/env node
const sh = require('shelljs');
require('shelljs-plugin-sleep');
const { exec } = require('../util');
exec('docker build -f docker/dawa-base/Dockerfile -t dawa-base:latest .');
exec('docker-compose -f ci/docker-compose.yml build');
exec('docker-compose -f ci/docker-compose.yml up -d db s3rver');
// Wait for DB server to be up
sh.sleep(30);
exec('docker-compose -f ci/docker-compose.yml run dawa-init-db');
exec('docker-compose -f ci/docker-compose.yml up -d dawa-server');
exec('docker-compose -f ci/docker-compose.yml run dawa-test');
exec('docker-compose -f ci/docker-compose.yml down');
