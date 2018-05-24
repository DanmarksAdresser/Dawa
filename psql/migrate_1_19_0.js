"use strict";

const fs = require('fs');
const {go} = require('ts-csp');
const cliParameterParsing = require('../bbr/common/cliParameterParsing');
const proddb = require('./proddb');

const {createChangeTable} = require('../importUtil/tableDiffNg');
const tableSchema = require('./tableModel');
const { materializeFromScratch } = require('../importUtil/materialize');
const { reloadDatabaseCode } = require('./initialization');
const {withImportTransaction} = require('../importUtil/importUtil');

const optionSpec = {
  pgConnectionUrl: [false, 'URL som anvendes ved forbindelse til test database', 'string']
};


cliParameterParsing.main(optionSpec, Object.keys(optionSpec), function (args, options) {
  proddb.init({
    connString: options.pgConnectionUrl,
    pooled: false
  });
  proddb.withTransaction('READ_WRITE', (client) => go(function* () {
    yield client.query(`
    DROP VIEW IF EXISTS adgangsadresserview cascade;
DROP VIEW  IF EXISTS adresser cascade;
DROP VIEW  IF EXISTS wms_adgangsadresser cascade;
DROP VIEW  IF EXISTS wms_housenumber_inspire cascade;
DROP VIEW  IF EXISTS adresser_mat_view;
DROP VIEW  IF EXISTS dar1_adgangsadresser_view CASCADE;
DROP VIEW  IF EXISTS adgangsadresser_mat_view CASCADE;
DROP VIEW  IF EXISTS adresser_mat_view CASCADE;
ALTER TABLE adgangsadresser alter column tekstretning set data type numeric(5,2);
ALTER TABLE adgangsadresser_changes alter column tekstretning set data type numeric(5,2);
ALTER TABLE adgangsadresser_mat alter column tekstretning set data type numeric(5,2);
ALTER TABLE adgangsadresser_mat_changes alter column tekstretning set data type numeric(5,2);
ALTER TABLE adresser_mat alter column tekstretning set data type numeric(5,2);
ALTER TABLE adresser_mat_changes alter column tekstretning set data type numeric(5,2);
ALTER TABLE dagi_supplerendebynavne alter dagi_id type INTEGER USING dagi_id::INTEGER;
ALTER TABLE dagi_supplerendebynavne_changes alter dagi_id type INTEGER USING dagi_id::INTEGER;
ALTER TABLE supplerendebynavntilknytninger alter dagi_id type INTEGER USING dagi_id::INTEGER;
ALTER TABLE supplerendebynavntilknytninger_changes alter dagi_id type INTEGER USING dagi_id::INTEGER;
ALTER TABLE kommuner alter dagi_id type INTEGER USING dagi_id::INTEGER;
ALTER TABLE kommuner_changes alter dagi_id type INTEGER USING dagi_id::INTEGER;
ALTER TABLE regioner alter dagi_id type INTEGER USING dagi_id::INTEGER;
ALTER TABLE regioner_changes alter dagi_id type INTEGER USING dagi_id::INTEGER;
ALTER TABLE afstemningsomraader alter dagi_id type INTEGER USING dagi_id::INTEGER;
ALTER TABLE afstemningsomraader_changes alter dagi_id type INTEGER USING dagi_id::INTEGER;
ALTER TABLE menighedsraadsafstemningsomraader alter dagi_id type INTEGER USING dagi_id::INTEGER;
ALTER TABLE menighedsraadsafstemningsomraader_changes alter dagi_id type INTEGER USING dagi_id::INTEGER;
ALTER TABLE adgangsadresser ADD COLUMN supplerendebynavn_dagi_id integer;
ALTER TABLE adgangsadresser_mat ADD COLUMN supplerendebynavn_dagi_id integer;
ALTER TABLE adresser_mat ADD COLUMN supplerendebynavn_dagi_id integer;
ALTER TABLE adgangsadresser_changes ADD COLUMN supplerendebynavn_dagi_id integer;
ALTER TABLE adgangsadresser_mat_changes ADD COLUMN supplerendebynavn_dagi_id integer;
ALTER TABLE adresser_mat_changes ADD COLUMN supplerendebynavn_dagi_id integer;
CREATE INDEX ON adgangsadresser_mat(supplerendebynavn_dagi_id);
CREATE INDEX ON adresser_mat(supplerendebynavn_dagi_id);
    ALTER TABLE adgangsadresser ADD COLUMN vejpunkt_id UUID;
    ALTER TABLE adgangsadresser_changes ADD COLUMN vejpunkt_id UUID;
    CREATE INDEX ON adgangsadresser(vejpunkt_id);
    UPDATE adgangsadresser a SET vejpunkt_id = hn.vejpunkt_id FROM dar1_husnummer_current hn where a.id = hn.id;
WITH mostRecent AS (SELECT a.id, a.vejpunkt_id, t.txid, t.changeid
                          FROM adgangsadresser a
                            JOIN LATERAL
                            (SELECT
                               id,
                               txid,
                               changeid
                             FROM adgangsadresser_changes c
                             WHERE a.id = c.id
                             ORDER BY txid DESC NULLS LAST,
                               changeid DESC NULLS LAST
                             LIMIT 1) t ON TRUE)
UPDATE adgangsadresser_changes c SET vejpunkt_id = a.vejpunkt_id
FROM mostRecent a WHERE c.id = a.id AND c.txid IS NOT DISTINCT FROM a.txid AND c.changeid IS NOT DISTINCT FROM a.changeid;`)
    yield client.query(fs.readFileSync('psql/schema/tables/navngivenvej.sql', {encoding: 'utf8'}));
    yield client.query(fs.readFileSync('psql/schema/tables/vejpunkter.sql', {encoding: 'utf8'}));
    yield createChangeTable(client, tableSchema.tables.navngivenvej);
    yield createChangeTable(client, tableSchema.tables.vejpunkter);
    yield reloadDatabaseCode(client, 'psql/schema');
    yield withImportTransaction(client, 'migrate_1_19_0', txid =>
      materializeFromScratch(client, txid, tableSchema.tables, tableSchema.materializations.vejpunkter));
  }));
});

