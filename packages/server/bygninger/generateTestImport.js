"use strict";

const fs = require('fs');
const { go } = require('ts-csp');
const _ = require('underscore');
const JSONStream = require('JSONStream');

const cliParameterParsing = require('../bbr/common/cliParameterParsing');
const promisingStreamCombiner = require('../promisingStreamCombiner');

const csvParse = require('csv-parse');

const optionSpec = {
  src: [false, 'fil med Bygninger i geojson-format', 'string'],
  dst: [false, 'Output-fil med bygninger', 'string', 'test/data/bygninger.json'],
  subset: [false, 'File containing ids of buildings', 'string', 'test/data_subsets/bygninger_subset.csv']
};

const FILE_HEAD = `\
{
  "name": "Bygning",
  "type": "FeatureCollection",
  "crs": {
    "type": "name",
    "properties": {
      "name": "EPSG:25832"
    }
  },
  "features": `;

const FILE_TAIL = `}`;

const getFeatureSubset = (bygningFilePath, subsetFilePath) => go(function*() {
  const bygningIds = new Set();

  const csvParser = csvParse({
    columns: true
  });

  csvParser.on('data', (row) => bygningIds.add(row.id));
  yield promisingStreamCombiner([
    fs.createReadStream(subsetFilePath),
    csvParser
  ]);

  const stream = fs.createReadStream(bygningFilePath, {encoding: 'utf8'});
  const jsonTransformer = JSONStream.parse('features.*');
  const result = [];
  stream.pipe(jsonTransformer);
  jsonTransformer.on('data', feature => {
    if(bygningIds.has(feature.properties.ID_LOKALID)) {
      result.push(feature);
    }
  });
  yield new Promise((resolve, reject) => {
    stream.on('end', resolve);
    stream.on('error', reject);
    jsonTransformer.on('error', reject);
  });
  return result;
});

cliParameterParsing.main(optionSpec, _.keys(optionSpec), function (args, options) {
  go(function*() {
    const features = yield getFeatureSubset(options.src, options.subset);
    const output = fs.createWriteStream(options.dst, {encoding: 'utf8'});
    output.write(FILE_HEAD);
    output.write(JSON.stringify(features, null, 2));
    output.write(FILE_TAIL);
    output.end();
    yield new Promise((resolve, reject) => {
      output.on('close', resolve);
      output.on('error', reject);
    });
  }).asPromise().done();
});
