"use strict";
const path = require('path');
const {go} = require('ts-csp');
const runConfigured = require('@dawadk/common/src/cli/run-configured');
const proddb = require('./proddb');
const configHolder = require('@dawadk/common/src/config/holder');
const {reloadDatabaseCode,} = require('./initialization');
const schema = configHolder.mergeConfigSchemas([
    {
        database_url: {
            doc: "URL for databaseforbindelse",
            format: 'string',
            default: null,
            cli: true,
            required: true
        },
    },
    require('@dawadk/import-util/conf/schemas/s3-offload-schema')
]);


runConfigured(schema, [], config => go(function* () {
    proddb.init({
        connString: config.get('database_url'),
        pooled: false
    });

    yield go(function* () {
        yield proddb.withTransaction('READ_WRITE', client => go(function* () {
            yield client.query(`ALTER TABLE bbr_ejendomsrelation DROP COLUMN samletfastejendom CASCADE;
ALTER TABLE bbr_ejendomsrelation_changes DROP COLUMN samletfastejendom CASCADE;
ALTER TABLE bbr_ejendomsrelation_history DROP COLUMN samletfastejendom CASCADE;
ALTER TABLE bbr_ejendomsrelation_history_changes DROP COLUMN samletfastejendom CASCADE;
ALTER TABLE bbr_ejendomsrelation_current DROP COLUMN samletfastejendom CASCADE;
ALTER TABLE bbr_ejendomsrelation_current_changes DROP COLUMN samletfastejendom CASCADE;
ALTER TABLE bbr_ejendomsrelation DROP COLUMN ejerlejlighed CASCADE;
ALTER TABLE bbr_ejendomsrelation_changes DROP COLUMN ejerlejlighed CASCADE;
ALTER TABLE bbr_ejendomsrelation_history DROP COLUMN ejerlejlighed CASCADE;
ALTER TABLE bbr_ejendomsrelation_history_changes DROP COLUMN ejerlejlighed CASCADE;
ALTER TABLE bbr_ejendomsrelation_current DROP COLUMN ejerlejlighed CASCADE;
ALTER TABLE bbr_ejendomsrelation_current_changes DROP COLUMN ejerlejlighed CASCADE;
ALTER TABLE bbr_ejendomsrelation DROP COLUMN bygningpåfremmedgrund CASCADE;
ALTER TABLE bbr_ejendomsrelation_changes DROP COLUMN bygningpåfremmedgrund CASCADE;
ALTER TABLE bbr_ejendomsrelation_history DROP COLUMN bygningpåfremmedgrund CASCADE;
ALTER TABLE bbr_ejendomsrelation_history_changes DROP COLUMN bygningpåfremmedgrund CASCADE;
ALTER TABLE bbr_ejendomsrelation_current DROP COLUMN bygningpåfremmedgrund CASCADE;
ALTER TABLE bbr_ejendomsrelation_current_changes DROP COLUMN bygningpåfremmedgrund CASCADE;
ALTER TABLE bbr_bygning DROP COLUMN byg406koordinatsystem CASCADE;
ALTER TABLE bbr_bygning_changes DROP COLUMN byg406koordinatsystem CASCADE;
ALTER TABLE bbr_bygning_history DROP COLUMN byg406koordinatsystem CASCADE;
ALTER TABLE bbr_bygning_history_changes DROP COLUMN byg406koordinatsystem CASCADE;
ALTER TABLE bbr_bygning_current DROP COLUMN byg406koordinatsystem CASCADE;
ALTER TABLE bbr_bygning_current_changes DROP COLUMN byg406koordinatsystem CASCADE;
ALTER TABLE bbr_bygning DROP COLUMN byg301TypeAfFlytning CASCADE;
ALTER TABLE bbr_bygning_changes DROP COLUMN byg301TypeAfFlytning CASCADE;
ALTER TABLE bbr_bygning_history DROP COLUMN byg301TypeAfFlytning CASCADE;
ALTER TABLE bbr_bygning_history_changes DROP COLUMN byg301TypeAfFlytning CASCADE;
ALTER TABLE bbr_bygning_current DROP COLUMN byg301TypeAfFlytning CASCADE;
ALTER TABLE bbr_bygning_current_changes DROP COLUMN byg301TypeAfFlytning CASCADE;
ALTER TABLE bbr_enhed RENAME adresseidentificerer to adresse;
ALTER TABLE bbr_enhed_changes RENAME adresseidentificerer to adresse;
ALTER TABLE bbr_enhed_history RENAME adresseidentificerer to adresse;
ALTER TABLE bbr_enhed_history_changes RENAME adresseidentificerer to adresse;
ALTER TABLE bbr_enhed_current RENAME adresseidentificerer to adresse;
ALTER TABLE bbr_enhed_current_changes RENAME adresseidentificerer to adresse;
ALTER TABLE bbr_opgang RENAME adgangfrahusnummer to husnummer;
ALTER TABLE bbr_opgang_changes RENAME adgangfrahusnummer to husnummer;
ALTER TABLE bbr_opgang_history RENAME adgangfrahusnummer to husnummer;
ALTER TABLE bbr_opgang_history_changes RENAME adgangfrahusnummer to husnummer;
ALTER TABLE bbr_opgang_current RENAME adgangfrahusnummer to husnummer;
ALTER TABLE bbr_opgang_current_changes RENAME adgangfrahusnummer to husnummer;
CREATE INDEX ON bbr_bygning_current USING GIST(byg404Koordinat);
CREATE INDEX ON bbr_tekniskanlæg_current USING GIST(tek109Koordinat);
`);
            yield reloadDatabaseCode(client, path.join(__dirname, 'schema'));
        }));
    });
}));