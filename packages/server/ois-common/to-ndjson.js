#!/usr/bin/env node
"use strict";
const {go} = require('ts-csp');
const fs = require('fs');
const runConfigured = require('@dawadk/common/src/cli/run-configured');
const {getOisFileRegex} = require('./ois-import');
const {toNdjson} = require('./shorten-ois-file');
const logger = require('@dawadk/common/src/logger').forCategory('oisToNdjson');
const schema = {
  source_dir: {
    doc: 'Directory with OIS files',
    format: 'string',
    default: null,
    required: true,
    cli: true
  },
  target_dir: {
    doc: 'Where to store the NDJSON files',
    format: 'string',
    default: null,
    required: true,
    cli: true
  },
};


runConfigured(schema, [], (config) => go(function* () {
  const fileNames = fs.readdirSync(config.get('source_dir'));
  const regex = getOisFileRegex('grbbr');
  for(let fileName of fileNames) {
    if(regex.test(fileName)) {
      logger.info(`NDJSONing ${fileName}`);
      yield toNdjson(config.get('source_dir'), fileName, config.get('target_dir'));
    }
    else {
      logger.info(`Skipping file`, {fileName});
    }
  }
}));
