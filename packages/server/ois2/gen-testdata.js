#!/usr/bin/env node
"use strict";
const {assert} = require('chai');
const {go} = require('ts-csp');
const fs = require('fs');
const {filterOisFile} = require('../ois-common/shorten-ois-file');
const proddb = require('../psql/proddb');
const runConfiguredImporter = require('@dawadk/import-util/src/run-configured-importer');
const grbbrModels = require('./parse-ea-model');
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

const getFileForEntity = (allFiles, entityName) => {
  const oisTable = grbbrModels.find(grbbrModel => grbbrModel.name === entityName).oisTable;
  const file = allFiles.find(file => new RegExp(`${oisTable}_NA`, 'i').test(file));
  assert(file, `found file for ${entityName}`);
  return file;
};

runConfiguredImporter('gen-ois-test-data', schema, (config) => go(function* () {
  proddb.init({
    connString: config.get('database_url'),
    pooled: false
  });

  yield proddb.withTransaction('READ_ONLY', client => go(function* () {
    const husnummerResult = yield client.queryRows('select id from dar1_husnummer_current');
    const husnummerArray = husnummerResult.map(row => row.id);
    const husnumre = new Set(husnummerArray);
    const allFiles = fs.readdirSync(config.get('source_dir'));
    const bygningFile = getFileForEntity(allFiles, 'bygning');
    const bygninger = yield filterOisFile(config.get('source_dir'), bygningFile, config.get('target_dir'), obj => husnumre.has(obj.husnummer));
    const bygningIds = new Set(bygninger.map(bygning => bygning.id_lokalId));
    const tekniskAnlægFile = getFileForEntity(allFiles, 'tekniskanlæg');
    const tekniskeAnlæg = yield filterOisFile(config.get('source_dir'), tekniskAnlægFile, config.get('target_dir'), obj => husnumre.has(obj.husnummer));
    const grundIds = new Set([...bygninger.map(bygning => bygning.grund), ...tekniskeAnlæg.map(anlæg => anlæg.grund)]);
    grundIds.delete('');
    const grundFile = getFileForEntity(allFiles, 'grund');
    const grunde = yield filterOisFile(config.get('source_dir'), grundFile, config.get('target_dir'), obj => grundIds.has(obj.id_lokalId));
    const enhedIdsFromTekniskeAnlæg = new Set(tekniskeAnlæg.map(anlæg => anlæg.enhed));
    const enhedFile = getFileForEntity(allFiles, 'enhed');
    const etageFile = getFileForEntity(allFiles, 'etage');
    const etager = yield filterOisFile(config.get('source_dir'), etageFile, config.get('target_dir'),
      obj => bygningIds.has(obj.bygning));
    const etageIds = new Set(etager.map(etage => etage.id_lokalId));

    const opgangFile = getFileForEntity(allFiles, 'opgang');
    const opgange = yield filterOisFile(config.get('source_dir'), opgangFile, config.get('target_dir'),
      obj => bygningIds.has(obj.bygning));
    const opgangIds = new Set(opgange.map(opgang => opgang.id_lokalId));
    const enheder = yield filterOisFile(config.get('source_dir'), enhedFile, config.get('target_dir'),
      obj => enhedIdsFromTekniskeAnlæg.has(obj.id_lokalId) || bygningIds.has(obj.bygning) || etageIds.has(obj.etage) || opgangIds.has(obj.opgang));
    const enhedIds = new Set(enheder.map(enhed => enhed.id_lokalId));
    const grundjordstykkeFile = getFileForEntity(allFiles, 'grundjordstykke');
    yield filterOisFile(config.get('source_dir'), grundjordstykkeFile, config.get('target_dir'),
      obj => grundIds.has(obj.grund));

    const bygningPåFremmedGrundFile = getFileForEntity(allFiles, 'bygningpåfremmedgrund');
    const bygningerPåFremmedGrund = yield filterOisFile(config.get('source_dir'), bygningPåFremmedGrundFile, config.get('target_dir'),
      obj => bygningIds.has(obj.bygning));
    const enhedEjerlejlighedFile = getFileForEntity(allFiles, 'enhedejerlejlighed');
    const enhedejerlejligheder = yield filterOisFile(config.get('source_dir'), enhedEjerlejlighedFile, config.get('target_dir'),
      obj => enhedIds.has(obj.enhed));
    const ejendomsrelationIds = new Set(
      [...bygningerPåFremmedGrund.map(obj => obj.bygningPåFremmedGrund),
        ...enhedejerlejligheder.map(obj => obj.ejerlejlighed),
        ...grunde.map(grund => grund.bestemtFastEjendom),
        ...tekniskeAnlæg.map(anlæg => anlæg.bygningPåFremmedGrund)]);
    const ejendomsRelationFile = getFileForEntity(allFiles, 'ejendomsrelation');
    yield filterOisFile(config.get('source_dir'), ejendomsRelationFile, config.get('target_dir'), obj => ejendomsrelationIds.has(obj.id_lokalId));
    const fordelingsarealFile = getFileForEntity(allFiles, 'fordelingsareal');
    yield filterOisFile(config.get('source_dir'), fordelingsarealFile, config.get('target_dir'), obj => true);
    const fordelingaffordelingsarealFile = getFileForEntity(allFiles, 'fordelingaffordelingsareal');
    yield filterOisFile(config.get('source_dir'), fordelingaffordelingsarealFile, config.get('target_dir'), obj => true);
  }));
}));
