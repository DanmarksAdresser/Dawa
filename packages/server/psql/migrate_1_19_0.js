"use strict";

const fs = require('fs');
const {go} = require('ts-csp');
const cliParameterParsing = require('../bbr/common/cliParameterParsing');
const proddb = require('./proddb');

const {createChangeTable} = require('@dawadk/import-util/src/table-diff');
const tableSchema = require('./tableModel');
const { materializeFromScratch } = require('@dawadk/import-util/src/materialize');
const { reloadDatabaseCode } = require('./initialization');
const {withImportTransaction} = require('../importUtil/importUtil');
const dar10TableModels = require('../dar10/dar10TableModels');
const importDagiImpl = require('../dagiImport/importDagiImpl');
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
DROP VIEW IF EXISTS supplerendebynavntilknytninger_view CASCADE;
ALTER TABLE adgangsadresser alter column tekstretning set data type numeric(5,2);
ALTER TABLE adgangsadresser_changes alter column tekstretning set data type numeric(5,2);
ALTER TABLE adgangsadresser_mat alter column tekstretning set data type numeric(5,2);
ALTER TABLE adgangsadresser_mat_changes alter column tekstretning set data type numeric(5,2);
ALTER TABLE adresser_mat alter column tekstretning set data type numeric(5,2);
ALTER TABLE adresser_mat_changes alter column tekstretning set data type numeric(5,2);
ALTER TABLE dagi_supplerendebynavne alter dagi_id type INTEGER USING dagi_id::INTEGER;
ALTER TABLE dagi_supplerendebynavne_divided alter dagi_id type INTEGER USING dagi_id::INTEGER;
ALTER TABLE dagi_supplerendebynavne_changes alter dagi_id type INTEGER USING dagi_id::INTEGER;
ALTER TABLE supplerendebynavntilknytninger alter dagi_id type INTEGER USING dagi_id::INTEGER;
ALTER TABLE supplerendebynavntilknytninger_changes alter dagi_id type INTEGER USING dagi_id::INTEGER;
ALTER TABLE dagi_postnumre alter dagi_id type INTEGER USING dagi_id::INTEGER;
ALTER TABLE dagi_postnumre_changes alter dagi_id type INTEGER USING dagi_id::INTEGER;
ALTER TABLE politikredse alter dagi_id type INTEGER USING dagi_id::INTEGER;
ALTER TABLE politikredse_changes alter dagi_id type INTEGER USING dagi_id::INTEGER;
ALTER TABLE retskredse alter dagi_id type INTEGER USING dagi_id::INTEGER;
ALTER TABLE retskredse_changes alter dagi_id type INTEGER USING dagi_id::INTEGER;
ALTER TABLE sogne alter dagi_id type INTEGER USING dagi_id::INTEGER;
ALTER TABLE sogne_changes alter dagi_id type INTEGER USING dagi_id::INTEGER;
ALTER TABLE kommuner alter dagi_id type INTEGER USING dagi_id::INTEGER;
ALTER TABLE kommuner_changes alter dagi_id type INTEGER USING dagi_id::INTEGER;
ALTER TABLE regioner alter dagi_id type INTEGER USING dagi_id::INTEGER;
ALTER TABLE regioner_changes alter dagi_id type INTEGER USING dagi_id::INTEGER;
ALTER TABLE afstemningsomraader alter dagi_id type INTEGER USING dagi_id::INTEGER;
ALTER TABLE afstemningsomraader_changes alter dagi_id type INTEGER USING dagi_id::INTEGER;
ALTER TABLE afstemningsomraader alter opstillingskreds_dagi_id type INTEGER USING opstillingskreds_dagi_id::INTEGER;
ALTER TABLE afstemningsomraader_changes alter opstillingskreds_dagi_id type INTEGER USING opstillingskreds_dagi_id::INTEGER;
ALTER TABLE opstillingskredse alter dagi_id type INTEGER USING dagi_id::INTEGER;
ALTER TABLE opstillingskredse_changes alter dagi_id type INTEGER USING dagi_id::INTEGER;
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
    UPDATE adgangsadresser a SET supplerendebynavn_dagi_id = sb.supplerendebynavn1 FROM dar1_supplerendebynavn_current sb WHERE a.supplerendebynavn_id = sb.id;
WITH mostRecent AS (SELECT a.id, a.vejpunkt_id, a.supplerendebynavn_dagi_id, t.txid, t.changeid
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
UPDATE adgangsadresser_changes c SET vejpunkt_id = a.vejpunkt_id, supplerendebynavn_dagi_id = a.supplerendebynavn_dagi_id
FROM mostRecent a WHERE c.id = a.id AND c.txid IS NOT DISTINCT FROM a.txid AND c.changeid IS NOT DISTINCT FROM a.changeid;`);
    yield client.query(`DROP TABLE IF EXISTS  landpostnumre CASCADE;
CREATE TABLE landpostnumre(
  nr SMALLINT NOT NULL,
navn text NOT NULL,
  ændret timestamptz NOT NULL,
  geo_version integer NOT NULL,
  geo_ændret timestamptz NOT NULL,
  geom geometry(MultiPolygon, 25832),
  tsv tsvector,
  PRIMARY KEY (nr)
);

DROP TABLE IF EXISTS landpostnumre_changes CASCADE;
CREATE TABLE landpostnumre_changes AS (SELECT NULL::integer as txid, NULL::integer as changeid, NULL::operation_type as operation, null::boolean as public, landpostnumre.* FROM landpostnumre WHERE false);
CREATE INDEX ON landpostnumre_changes(txid);


DROP TABLE IF EXISTS landpostnumre_divided CASCADE;
CREATE TABLE landpostnumre_divided(
  nr SMALLINT NOT NULL,
  geom geometry(geometry, 25832)
);

CREATE INDEX ON landpostnumre_divided USING GIST(geom);
CREATE INDEX ON landpostnumre_divided(nr);`);
    yield client.query(fs.readFileSync('psql/schema/tables/navngivenvej.sql', {encoding: 'utf8'}));
    yield client.query(fs.readFileSync('psql/schema/tables/vejpunkter.sql', {encoding: 'utf8'}));
    yield createChangeTable(client, tableSchema.tables.navngivenvej);
    yield createChangeTable(client, tableSchema.tables.vejpunkter);
    yield reloadDatabaseCode(client, 'psql/schema');
    yield withImportTransaction(client, 'migrate_1_19_0', txid => go(function*() {
      yield materializeFromScratch(client, txid, tableSchema.tables, dar10TableModels.dawaMaterializations.vejpunkt);
      yield materializeFromScratch(client, txid, tableSchema.tables, dar10TableModels.dawaMaterializations.navngivenvej);
      yield importDagiImpl.importLandpostnummer(client, txid);
    }));
    yield client.query('analyze');
  })).done();
});

