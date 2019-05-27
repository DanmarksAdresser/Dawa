"use strict";

const fs = require('fs');
const path = require('path');

const {go} = require('ts-csp');
const temaModels = require('../../dagiImport/temaModels');
const {parseTemaGml, parseTemaGml2} = require('../../dagiImport/temaParsing');
const {streamArrayToTable, streamCsvToTable} = require('@dawadk/import-util/src/postgres-streaming');
const tableDiffNg = require('@dawadk/import-util/src/table-diff');
const tableSchema = require('../../psql/tableModel');

const {updateSubdividedTable } = require('../../importUtil/geometryImport');

const postProcess = {
  opstillingskreds: (client, table) => go(function* () {
    yield client.query(`CREATE TEMP TABLE kredskommuner AS (select nummer, kredskommunekode FROM ${table} WHERE false)`);
    yield streamCsvToTable(client, path.join(__dirname, '../../data/opstillingskredse.csv'), 'kredskommuner', ['nummer', 'kredskommunekode']);
    yield client.query(`UPDATE ${table} t SET kredskommunekode = k.kredskommunekode FROM kredskommuner k WHERE t.nummer = k.nummer; DROP TABLE kredskommuner`);
  }),
  storkreds: (client, table) => go(function* () {
    const additionalFields = JSON.parse(fs.readFileSync(path.join(__dirname, '../../data/storkredse.json'), {encoding: 'utf-8'}));
    yield client.query(`CREATE TEMP TABLE additional AS (select nummer, valglandsdelsbogstav, regionskode FROM ${table} where false)`);
    yield streamArrayToTable(client, additionalFields, 'additional', ['nummer', 'valglandsdelsbogstav', 'regionskode']);
    yield client.query(`UPDATE ${table} t SET valglandsdelsbogstav = a.valglandsdelsbogstav, regionskode = a.regionskode 
    FROM additional a WHERE t.nummer = a.nummer; DROP TABLE additional`);
  }),
  landsdel: (client, table) => go(function*() {
    const additionalFields = JSON.parse(fs.readFileSync(path.join(__dirname, '../../data/landsdele.json'), {encoding: 'utf-8'}));
    yield client.query(`CREATE TEMP TABLE additional AS (select nuts3, regionskode FROM ${table} where false)`);
    yield streamArrayToTable(client, additionalFields, 'additional', ['nuts3', 'regionskode']);
    yield client.query(`UPDATE ${table} t SET  regionskode = a.regionskode 
    FROM additional a WHERE t.nuts3 = a.nuts3; DROP TABLE additional`);
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
    yield storeTemaFn(client, temaModel, dataDir, filePrefix, 'desired');
    if (postProcess[temaName]) {
      yield postProcess[temaName](client, 'desired');
    }


    // Beregn ændringer til temaet
    yield computeTemaDifferences(client, txid, 'desired', tableModel);
    yield client.query(`DROP TABLE desired`);

    yield tableDiffNg.applyChanges(client, txid, tableModel);

    // Temaer opdeles i mindre polygoner ad hensyn til query-performance. Disse ligger i en separat tabel.
    yield updateSubdividedTable(client, txid, tableModel.table, `${tableModel.table}_divided`, tableModel.primaryKey);

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
  WITH geoms AS (SELECT storkredsnummer as nummer, st_multi(ST_Union(geom)) AS geom
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
  WITH geoms AS (SELECT valglandsdelsbogstav as bogstav, st_multi(ST_Union(geom)) AS geom
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

const createDagiImporter = ({temaNames, dataDir, filePrefix, source, featureMappings}) => {
  const allTemaNamesSet = new Set(temaNames);
  if(temaNames.includes('postnummer')) {
    allTemaNamesSet.add('landpostnummer');
  }
  if(temaNames.includes('opstillingskreds')) {
    allTemaNamesSet.add('storkreds');
    allTemaNamesSet.add( 'valglandsdel');
  }
  const allTemaNames = Array.from(allTemaNamesSet);
  return {
    id: 'DAGI-import',
    description: 'DAGI importer',
    requires: [],
    produces: allTemaNames.map(temaName => temaModels.modelMap[temaName].table),
    execute: (client, txid) => go(function*() {
      if(source === 'wfs') {
        yield importTemaerWfs(client, txid, temaNames, featureMappings, dataDir, filePrefix);
      }
      else if(source === 'json') {
        yield importTemaerJson(client, txid, temaNames, dataDir, filePrefix);
      }
      else if(source === 'wfsMulti') {
        yield importTemaerWfsMulti(client, txid, temaNames, featureMappings, dataDir, filePrefix);
      }
      else {
        throw new Error(`Unknown DAGI source ${source}`);
      }
      if(allTemaNamesSet.has('landpostnummer')) {
        yield importLandpostnummer(client, txid);
      }
      if(allTemaNamesSet.has('storkreds') && !temaNames.includes('storkreds')) {
        yield importStorkreds(client, txid);
      }
      if(allTemaNamesSet.has('valglandsdel') && !temaNames.includes('valglandsdel')) {
        yield importValglandsdel(client, txid);
      }
    })
  }
};

const createSingleTemaImporter = (temaModel, temaData) => {
  return {
    id: 'DAGI-import',
    description: 'DAGI importer',
    requires: [],
    produces: [temaModel.table],
    execute: (client, txid) => go(function* () {
      yield importSingleTema(client, txid, temaModel, temaData);
    })
  };
};


module.exports = {
  createDagiImporter,
  createSingleTemaImporter
};
