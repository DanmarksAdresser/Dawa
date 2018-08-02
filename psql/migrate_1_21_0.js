"use strict";

const {go} = require('ts-csp');
const cliParameterParsing = require('../bbr/common/cliParameterParsing');
const proddb = require('./proddb');

const temaModels = require('../dagiImport/temaModels');

const {reloadDatabaseCode} = require('./initialization');
const {withImportTransaction} = require('../importUtil/importUtil');
const {deriveColumn} = require('../importUtil/tableModelUtil');
const {initVisualCenters} = require('../importUtil/geometryImport');
const tableSchema = require('./tableModel');

const optionSpec = {
  pgConnectionUrl: [false, 'URL som anvendes ved forbindelse til test database', 'string']
};


cliParameterParsing.main(optionSpec, Object.keys(optionSpec), function (args, options) {
  proddb.init({
    connString: options.pgConnectionUrl,
    pooled: false
  });
  proddb.withTransaction('READ_WRITE', (client) => go(function* () {
    yield withImportTransaction(client, 'migrate_1_21_0', txid => go(function* () {
      yield client.query(`
ALTER TABLE navngivenvej
  ADD COLUMN geom GEOMETRY(Geometry, 25832);
ALTER TABLE navngivenvej_changes
  ADD COLUMN geom GEOMETRY(Geometry, 25832);
CREATE INDEX ON navngivenvej USING GIST (geom);
UPDATE navngivenvej
SET geom = COALESCE(beliggenhed_vejnavnelinje,
                    beliggenhed_vejnavneområde);
UPDATE navngivenvej_changes
SET geom = COALESCE(beliggenhed_vejnavnelinje,
                    beliggenhed_vejnavneområde);

DELETE FROM tilknytninger_mat_changes;
ALTER TABLE tilknytninger_mat ADD COLUMN  afstemningsområde_dagi_id INTEGER;
ALTER TABLE tilknytninger_mat_changes ADD COLUMN  afstemningsområde_dagi_id INTEGER;
ALTER TABLE tilknytninger_mat ADD COLUMN  menighedsrådsafstemningsområdenummer smallint;
ALTER TABLE tilknytninger_mat_changes ADD COLUMN  menighedsrådsafstemningsområdenummer smallint;
ALTER TABLE tilknytninger_mat ADD COLUMN  menighedsrådsafstemningsområdenavn   TEXT;
ALTER TABLE tilknytninger_mat_changes ADD COLUMN  menighedsrådsafstemningsområdenavn   TEXT;
`);

      yield reloadDatabaseCode(client, 'psql/schema');
      yield client.query(`
UPDATE tilknytninger_mat t
SET afstemningsområde_dagi_id = v.afstemningsområde_dagi_id,
menighedsrådsafstemningsområdenummer = v.menighedsrådsafstemningsområdenummer,
menighedsrådsafstemningsområdenavn = v.menighedsrådsafstemningsområdenavn 
FROM tilknytninger_mat_view v WHERE v.adgangsadresseid = t.adgangsadresseid; 
`);
    }));

    yield client.query('analyze');
  })).done();
});

