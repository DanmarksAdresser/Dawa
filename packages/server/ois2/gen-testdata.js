#!/usr/bin/env node
"use strict";

const { go } = require('ts-csp');
const {shortenOisFiles} = require('../ois-common/shorten-ois-file');

const runConfigured  = require('@dawadk/common/src/cli/run-configured');


const schema = {
  source_dir: {
    doc: 'Directory with OIS files',
    format: 'string',
    default: null,
    required: true,
    cli: true
  },
  target_dir: {
    doc: 'Where to store the files',
    format: 'string',
    default: null,
    required: true,
    cli: true
  },
};

runConfigured(schema, [], config => go(function*() {
  yield shortenOisFiles(config.get('source_dir'), config.get('target_dir'), 1000);
}));
