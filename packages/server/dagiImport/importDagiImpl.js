"use strict";

const fs = require('fs');
const path = require('path');

const {go} = require('ts-csp');
const temaModels = require('./temaModels');
const {parseTemaGml, parseTemaGml2} = require('./temaParsing');
const {streamArrayToTable, streamCsvToTable} = require('@dawadk/import-util/src/postgres-streaming');
const tableDiffNg = require('@dawadk/import-util/src/table-diff');
const tableSchema = require('../psql/tableModel');
const {recomputeTemaTilknytninger} = require('../importUtil/materialize-dawa');
const logger = require('@dawadk/common/src/logger').forCategory('dagiImport');

const {updateSubdividedTable, updateGeometricFields, computeVisualCenters} = require('../importUtil/geometryImport');

const postProcess = {
  opstillingskreds: (client, table) => go(function* () {
    yield client.query(`CREATE TEMP TABLE kredskommuner AS (select nummer, kredskommunekode FROM ${table} WHERE false)`);
    yield streamCsvToTable(client, path.join(__dirname, '../data/opstillingskredse.csv'), 'kredskommuner', ['nummer', 'kredskommunekode']);
    yield client.query(`UPDATE ${table} t SET kredskommunekode = k.kredskommunekode FROM kredskommuner k WHERE t.nummer = k.nummer; DROP TABLE kredskommuner`);
  }),
  storkreds: (client, table) => go(function* () {
    const additionalFields = JSON.parse(fs.readFileSync(path.join(__dirname, '../data/storkredse.json'), {encoding: 'utf-8'}));
    yield client.query(`CREATE TEMP TABLE additional AS (select nummer, valglandsdelsbogstav, regionskode FROM ${table} where false)`);
    yield streamArrayToTable(client, additionalFields, 'additional', ['nummer', 'valglandsdelsbogstav', 'regionskode']);
    yield client.query(`UPDATE ${table} t SET valglandsdelsbogstav = a.valglandsdelsbogstav, regionskode = a.regionskode 
    FROM additional a WHERE t.nummer = a.nummer; DROP TABLE additional`);
  })
};

const getTemaFileNameWfs = (temaDef, dataDir, filePrefix) => {
  const directory = path.resolve(dataDir);
  const filename = filePrefix + temaDef.singular;
  return path.join(directory, filename);

};

const getTemaFileNameJson = (temaDef, dataDir, filePrefix) => {
  const directory = path.resolve(dataDir);
  const filename = filePrefix + temaDef.singular + '.json';
  return path.join(directory, filename);

};

const readTema = (temaDef, mapping, filePath) => go(function* () {
  const body = fs.readFileSync(filePath);
  return yield parseTemaGml(body, mapping);
});

const readTema2 = (temaDef, mapping, filePath) => go(function* () {
  const body = fs.readFileSync(filePath);
  return yield parseTemaGml2(body, mapping);
});

const computeTemaDifferences = (client, txid, srcTable, tableModel, fetchColumnNames) => {
  return tableDiffNg.computeDifferences(client, txid, srcTable, tableModel, fetchColumnNames);
};

const storeTemaWfsMultiGeom = (client, temaModel, featureMapping, dataDir, filePrefix, targetTable) => go(function* () {
  const temaName = temaModel.singular;
  if (!featureMapping) {
    throw new Error('No feature mapping for ' + temaName);
  }
  const additionalFields = temaModel.fields;
  const additionalFieldNames = additionalFields.map(field => field.name);
  const fetchColumnNames = [...additionalFieldNames, 'geom'];
  const tableModel = tableSchema.tables[temaModel.table];
  const temaFilePath = getTemaFileNameWfs(temaModel, dataDir, filePrefix);
  const temaRows = yield readTema2(temaModel, featureMapping, temaFilePath);
  // temaer afleveres i form af mange polygoner, og ikke et enkelt multipolygon.
  // Vi streamer polygonerne til databasen og kombinerer dem derefter med ST_Collect
  yield client.query(`CREATE TEMP TABLE ${targetTable} AS (SELECT ${additionalFieldNames.join(', ')}, null::text as geom FROM ${tableModel.table} WHERE false);`);
  yield streamArrayToTable(client, temaRows, targetTable, fetchColumnNames);
  yield client.query(`alter table ${targetTable} alter column geom type geometry(multipolygon, 25832) using st_multi(st_force2d(st_geomfromgml(geom, 25832)))`);
});

const storeTemaWfs = (client, temaModel, featureMapping, dataDir, filePrefix, targetTable) => go(function* () {
  const temaName = temaModel.singular;
  if (!featureMapping) {
    throw new Error('No feature mapping for ' + temaName);
  }
  const additionalFields = temaModel.fields;
  const additionalFieldNames = additionalFields.map(field => field.name);
  const fetchColumnNames = [...additionalFieldNames, 'geom'];
  const tableModel = tableSchema.tables[temaModel.table];
  const temaFilePath = getTemaFileNameWfs(temaModel, dataDir, filePrefix);
  const temaRows = yield readTema(temaModel, featureMapping, temaFilePath);
  const fetchTableName = `fetch_${temaName}`;

  // temaer afleveres i form af mange polygoner, og ikke et enkelt multipolygon.
  // Vi streamer polygonerne til databasen og kombinerer dem derefter med ST_Collect
  yield client.query(`CREATE TEMP TABLE ${fetchTableName} AS (SELECT ${fetchColumnNames.join(', ')} FROM ${tableModel.table} WHERE false);`);
  if (temaName !== 'zone') {
    yield client.query(` ALTER TABLE ${fetchTableName} ALTER COLUMN geom TYPE geometry(Polygon)`)
  }
  yield streamArrayToTable(client, temaRows, fetchTableName, fetchColumnNames);
  yield client.query(`CREATE TEMP TABLE ${targetTable} AS (select ${additionalFieldNames.join(', ')}, ST_Multi(ST_Union(st_collectionextract(ST_MakeValid(geom), 3))) AS geom FROM ${fetchTableName} GROUP BY ${additionalFieldNames.join(', ')})`);
  yield client.query(`DROP TABLE ${fetchTableName}`);
});

const streamTemaToTable = (client, temaModel, temaRows, targetTable) => go(function* () {
  const additionalFields = temaModel.fields;
  const additionalFieldNames = additionalFields.map(field => field.name);
  const fetchColumnNames = [...additionalFieldNames, 'geom'];
  yield client.query(`CREATE TEMP TABLE ${targetTable} AS (select ${additionalFieldNames.join(', ')}, geom FROM ${temaModel.table} WHERE false)`);
  yield streamArrayToTable(client, temaRows, targetTable, fetchColumnNames);
});

const storeTemaJson = (client, temaDef, dataDir, filePrefix, targetTable) => go(function* () {
  const temaFilePath = getTemaFileNameJson(temaDef, dataDir, filePrefix);
  const temaRows = JSON.parse(fs.readFileSync(temaFilePath, {encoding: 'utf8'}));
  yield streamTemaToTable(client, temaDef, temaRows, targetTable);
});

const makeStoreTemaWfsFn = featureMappings =>
  (client, temaDef, dataDir, filePrefix, targetTable) => {
    const featureMapping = featureMappings[temaDef.singular];
    return storeTemaWfs(client, temaDef, featureMapping, dataDir, filePrefix, targetTable);
  };

const makeStoreTemaWfsMultiGeomFn = featureMappings =>
  (client, temaDef, dataDir, filePrefix, targetTable) => {
    const featureMapping = featureMappings[temaDef.singular];
    return storeTemaWfsMultiGeom(client, temaDef, featureMapping, dataDir, filePrefix, targetTable);
  };


const importTemaer = (client, txid, temaNames, dataDir, filePrefix, maxChanges, storeTemaFn) => go(function* () {
  for (let temaName of temaNames) {
    const temaModel = temaModels.modelMap[temaName];
    const tableModel = tableSchema.tables[temaModel.table];
    const additionalFields = temaModel.fields;
    const additionalFieldNames = additionalFields.map(field => field.name);
    const fetchColumnNames = [...additionalFieldNames, 'geom'];
    yield storeTemaFn(client, temaModel, dataDir, filePrefix, 'desired');
    if (postProcess[temaName]) {
      yield postProcess[temaName](client, 'desired');
    }


    // Beregn ændringer til temaet
    yield computeTemaDifferences(client, txid, 'desired', tableModel, fetchColumnNames);
    yield client.query(`DROP TABLE desired`);

    // Opdater meta-felter (oprettet, ændret, geo_version, geo_ændret)
    yield updateGeometricFields(client, txid, tableModel);

    yield computeVisualCenters(client, txid, tableModel);

    yield tableDiffNg.applyChanges(client, txid, tableModel);

    // Temaer opdeles i mindre polygoner ad hensyn til query-performance. Disse ligger i en separat tabel.
    yield updateSubdividedTable(client, txid, tableModel.table, `${tableModel.table}_divided`, tableModel.primaryKey);

    // Vi gemmer ikke historik på temaer.
    yield client.query(`DELETE FROM ${tableModel.table}_changes`);
  }

  const hasTilknytninger = temaNames.map(temaName => temaModels.modelMap[temaName])
    .filter(temaModel => !temaModel.withoutTilknytninger)
    .length > 0;
  if (hasTilknytninger) {
    yield recomputeTemaTilknytninger(client, txid, temaNames.map(temaName => temaModels.modelMap[temaName]));
    for (let temaName of temaNames) {
      const temaModel = temaModels.modelMap[temaName];
      if (maxChanges) {
        const changes = yield tableDiffNg.countChanges(client, txid, tableSchema.tables[temaModel.tilknytningTable]);
        if (changes > maxChanges) {
          logger.error("Too Many Changes", {
            temaName,
            changes,
            maxChanges
          });
          throw new Error("Too Many Changes");
        }
      }
    }
  }
});

const importTemaerWfs = (client, txid, temaNames, featureMappings, dataDir, filePrefix, maxChanges) => go(function* () {
  const storeTemaFn = makeStoreTemaWfsFn(featureMappings);
  yield importTemaer(client, txid, temaNames, dataDir, filePrefix, maxChanges, storeTemaFn);
});

const importTemaerWfsMulti = (client, txid, temaNames, featureMappings, dataDir, filePrefix, maxChanges) => go(function* () {
  const storeTemaFn = makeStoreTemaWfsMultiGeomFn(featureMappings);
  yield importTemaer(client, txid, temaNames, dataDir, filePrefix, maxChanges, storeTemaFn);
});

const importTemaerJson = (client, txid, temaNames, dataDir, filePrefix, maxChanges) => go(function* () {
  yield importTemaer(client, txid, temaNames, dataDir, filePrefix, maxChanges, storeTemaJson);
});

const importSingleTema = (client, txid, temaModel, temaData, maxChanges) => go(function* () {
  const storeTemaFn = (client, temaDef, dataDir, filePrefix, targetTable) =>
    streamTemaToTable(client, temaDef, temaData, targetTable);
  yield importTemaer(client, txid, [temaModel.singular], null, null, maxChanges, storeTemaFn);
});

const importStorkreds = (client, txid) => {
  const storeTemaFn = (client, temaDef, dataDir, filePrefix, targetTable) => {
    return client.query(`
  CREATE TEMP TABLE ${targetTable} AS (
  WITH geoms AS (SELECT storkredsnummer as nummer, ST_Union(geom) AS geom
                  FROM opstillingskredse group by storkredsnummer)
  SELECT
    s.nummer, s.navn, s.regionskode, s.valglandsdelsbogstav, g.geom from 
    storkredse s join geoms g on s.nummer = g.nummer)`);
  };
  return importTemaer(client, txid, ['storkreds'], null, null, 10000000, storeTemaFn);
};

const importValglandsdel = (client, txid) => {
  const storeTemaFn = (client, temaDef, dataDir, filePrefix, targetTable) => {
    return client.query(`
  CREATE TEMP TABLE ${targetTable} AS (
  WITH geoms AS (SELECT valglandsdelsbogstav as bogstav, ST_Union(geom) AS geom
                  FROM storkredse group by valglandsdelsbogstav)
  SELECT
    v.bogstav, v.navn, g.geom from 
    valglandsdele v join geoms g on v.bogstav = g.bogstav)`);
  };
  return importTemaer(client, txid, ['valglandsdel'], null, null, 10000000, storeTemaFn);

};


const importLandpostnummer = (client, txid) => {
  const storeTemaFn = (client, temaDef, dataDir, filePrefix, targetTable) => {
    return client.query(`
  CREATE TEMP TABLE ${targetTable} AS (
  WITH dkgeom AS (SELECT ST_Union(geom) AS dkgeom
                  FROM regioner)
  SELECT
    nr,
    navn,
    st_multi(ST_CollectionExtract(st_intersection(dkgeom, geom), 3)) as geom
  FROM dagi_postnumre
    JOIN dkgeom on true);
    update desired set geom=null where st_isempty(geom)`);
  };
  return importTemaer(client, txid, ['landpostnummer'], null, null, 10000000, storeTemaFn);
};

module.exports = {
  importTemaerWfs,
  importTemaerWfsMulti,
  importTemaerJson,
  importSingleTema,
  importLandpostnummer,
  importStorkreds,
  importValglandsdel
};
