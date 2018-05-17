"use strict";

const {go} = require('ts-csp');
const cliParameterParsing = require('../bbr/common/cliParameterParsing');
const proddb = require('./proddb');

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
    DROP VIEW adgangsadresserview cascade;
DROP VIEW adresser cascade;
DROP VIEW wms_adgangsadresser cascade;
DROP VIEW wms_housenumber_inspire cascade;
DROP VIEW adresser_mat_view;
DROP VIEW dar1_adgangsadresser_view CASCADE;
DROP VIEW adgangsadresser_mat_view CASCADE;
DROP VIEW adresser_mat_view CASCADE;
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

`)
  }));
});

