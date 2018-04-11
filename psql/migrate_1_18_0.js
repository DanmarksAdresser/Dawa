"use strict";

const {go} = require('ts-csp');
const {generateTemaTable} = require('../dagiImport/sqlGen');
const {reloadDatabaseCode} = require('./initialization');
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
    for(let temaName of ['afstemningsområde', 'menighedsrådsafstemningsområde', 'supplerendebynavn']) {
      yield client.query(generateTemaTable(temaName));
    }
    yield client.query(`
    ALTER TABLE dagi_postnumre ADD COLUMN IF NOT EXISTS dagi_id integer;
    ALTER TABLE dagi_postnumre_changes ADD COLUMN IF NOT EXISTS dagi_id integer;
    CREATE INDEX ON dagi_postnumre(dagi_id);
    ALTER TABLE kommuner ADD COLUMN IF NOT EXISTS dagi_id integer;
    ALTER TABLE kommuner_changes ADD COLUMN IF NOT EXISTS dagi_id integer;
    CREATE INDEX ON kommuner(dagi_id);
    ALTER TABLE regioner ADD COLUMN IF NOT EXISTS dagi_id integer;
    ALTER TABLE regioner_changes ADD COLUMN IF NOT EXISTS dagi_id integer;
    CREATE INDEX ON regioner(dagi_id);
    ALTER TABLE sogne ADD COLUMN IF NOT EXISTS dagi_id integer;
    ALTER TABLE sogne_changes ADD COLUMN IF NOT EXISTS dagi_id integer;
    CREATE INDEX ON sogne(dagi_id);
    ALTER TABLE politikredse ADD COLUMN IF NOT EXISTS dagi_id integer;
    ALTER TABLE politikredse_changes ADD COLUMN IF NOT EXISTS dagi_id integer;
    CREATE INDEX ON politikredse(dagi_id);
    ALTER TABLE retskredse ADD COLUMN IF NOT EXISTS dagi_id integer;
    ALTER TABLE retskredse_changes ADD COLUMN IF NOT EXISTS dagi_id integer;
    CREATE INDEX ON retskredse(dagi_id);
    ALTER TABLE opstillingskredse ADD COLUMN IF NOT EXISTS dagi_id integer;
    ALTER TABLE opstillingskredse_changes ADD COLUMN IF NOT EXISTS dagi_id integer;
    CREATE INDEX ON opstillingskredse(dagi_id);
    ALTER TABLE opstillingskredse ADD COLUMN IF NOT EXISTS nummer smallint;
    ALTER TABLE opstillingskredse_changes ADD COLUMN IF NOT EXISTS nummer smallint;
    CREATE INDEX ON opstillingskredse(nummer);
    ALTER TABLE opstillingskredse ADD COLUMN IF NOT EXISTS valgkredsnummer smallint;
    ALTER TABLE opstillingskredse_changes ADD COLUMN IF NOT EXISTS valgkredsnummer smallint;
    CREATE INDEX ON opstillingskredse(valgkredsnummer);
    ALTER TABLE opstillingskredse ADD COLUMN IF NOT EXISTS storkredsnummer smallint;
    ALTER TABLE opstillingskredse_changes ADD COLUMN IF NOT EXISTS storkredsnummer smallint;
    CREATE INDEX ON opstillingskredse(storkredsnummer);
    ALTER TABLE opstillingskredse ADD COLUMN IF NOT EXISTS kredskommunekode smallint;
    ALTER TABLE opstillingskredse_changes ADD COLUMN IF NOT EXISTS kredskommunekode smallint;
    CREATE INDEX ON opstillingskredse(kredskommunekode);
    ALTER TABLE storkredse ADD COLUMN IF NOT EXISTS dagi_id integer;
    ALTER TABLE storkredse_changes ADD COLUMN IF NOT EXISTS dagi_id integer;
    CREATE INDEX ON storkredse(dagi_id);
    ALTER TABLE storkredse ADD COLUMN IF NOT EXISTS regionskode smallint;
    ALTER TABLE storkredse_changes ADD COLUMN IF NOT EXISTS regionskode smallint;
    ALTER TABLE storkredse ADD COLUMN IF NOT EXISTS valglandsdelsbogstav char(1);
    ALTER TABLE storkredse_changes ADD COLUMN IF NOT EXISTS valglandsdelsbogstav char(1);
    
    ALTER TABLE valglandsdele ADD COLUMN IF NOT EXISTS dagi_id integer;
    ALTER TABLE valglandsdele_changes ADD COLUMN IF NOT EXISTS dagi_id integer;
    CREATE INDEX ON valglandsdele(dagi_id);
    
    ALTER TABLE tilknytninger_mat ADD COLUMN IF NOT EXISTS afstemningsområdenummer smallint;    
    ALTER TABLE tilknytninger_mat ADD COLUMN IF NOT EXISTS afstemningsområdenavn text;    
    ALTER TABLE tilknytninger_mat_changes ADD COLUMN IF NOT EXISTS afstemningsområdenummer smallint;    
    ALTER TABLE tilknytninger_mat_changes ADD COLUMN IF NOT EXISTS afstemningsområdenavn text;    
    `);
      yield reloadDatabaseCode(client, 'psql/schema');
    }
  )).done();
});

