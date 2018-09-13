"use strict";

const {go} = require('ts-csp');
const cliParameterParsing = require('../bbr/common/cliParameterParsing');
const proddb = require('./proddb');

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
    yield withImportTransaction(client, 'migrate_1_23_0', txid => go(function* () {
      yield client.query(`
create index on dar1_Adresse_history_changes(id);
create index on dar1_Adressepunkt_history_changes(id);
create index on dar1_DARAfstemningsområde_history_changes(id);
create index on dar1_DARKommuneinddeling_history_changes(id);
create index on dar1_DARMenighedsrådsafstemningsområde_history_changes(id);
create index on dar1_DARSogneinddeling_history_changes(id);
create index on dar1_Husnummer_history_changes(id);
create index on dar1_NavngivenVej_history_changes(id);
create index on dar1_NavngivenVejKommunedel_history_changes(id);
create index on dar1_NavngivenVejPostnummerRelation_history_changes(id);
create index on dar1_NavngivenVejSupplerendeBynavnRelation_history_changes(id);
create index on dar1_Postnummer_history_changes(id);
create index on dar1_ReserveretVejnavn_history_changes(id);
create index on dar1_SupplerendeBynavn_history_changes(id);

create index on enhedsadresser_changes(changeid) where public;
create index on adgangsadresser_changes(changeid) where public;
ALTER TABLE jordstykker ADD COLUMN ejerlavnavn text;
ALTER TABLE jordstykker ADD COLUMN tsv tsvector;
ALTER TABLE jordstykker_changes ADD COLUMN ejerlavnavn text;
ALTER TABLE jordstykker_changes ADD COLUMN tsv tsvector;
CREATE INDEX ON jordstykker USING GIN(tsv);
UPDATE jordstykker SET ejerlavnavn = e.navn FROM ejerlav e WHERE ejerlavkode = e.kode;
UPDATE jordstykker_changes SET ejerlavnavn = e.navn FROM ejerlav e WHERE ejerlavkode = e.kode;
UPDATE jordstykker SET tsv = to_tsvector('adresser', processForIndexing(matrikelnr || ' ' || coalesce(ejerlavnavn, '')));
UPDATE jordstykker_changes SET tsv = to_tsvector('adresser', processForIndexing(matrikelnr || ' ' || coalesce(ejerlavnavn, '')));`
      );
    }));
  })).done();
});


