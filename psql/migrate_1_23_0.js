"use strict";

const {go} = require('ts-csp');
const cliParameterParsing = require('../bbr/common/cliParameterParsing');
const proddb = require('./proddb');

const {withImportTransaction} = require('../importUtil/importUtil');
const {reloadDatabaseCode} = require('./initialization');

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
UPDATE jordstykker_changes SET tsv = to_tsvector('adresser', processForIndexing(matrikelnr || ' ' || coalesce(ejerlavnavn, '')));

DROP TABLE if exists bygninger CASCADE;
CREATE  TABLE bygninger (
  id            BIGINT primary key,
  bygningstype  TEXT,
  målemetode    TEXT,
  målested      TEXT,
  bbrbygning_id UUID,
  ændret timestamptz NOT NULL DEFAULT now(),
  geo_version integer NOT NULL DEFAULT 1,
  geo_ændret timestamptz NOT NULL DEFAULT now(),
  geom geometry(PolygonZ, 25832),
  bbox geometry(Polygon, 25832),
  visueltcenter geometry(Point, 25832)
);

CREATE INDEX ON bygninger(bbrbygning_id);
CREATE INDEX ON bygninger(bygningstype);
CREATE INDEX ON bygninger(målemetode);
CREATE INDEX ON bygninger(målested);
CREATE INDEX ON bygninger USING GIST(geom);

DROP TABLE if exists bygninger_changes CASCADE;
CREATE TABLE bygninger_changes AS (SELECT NULL::integer as txid, NULL::integer as changeid, NULL::operation_type as operation, null::boolean as public, bygninger.* FROM bygninger WHERE false);
CREATE INDEX ON bygninger_changes(txid);
create index on bygninger_changes(changeid) WHERE public;
create index on bygninger_changes(id, txid DESC NULLS LAST, changeid DESC NULLS LAST);

DROP TABLE if exists bygningtilknytninger CASCADE;
CREATE TABLE bygningtilknytninger(
  bygningid bigint NOT NULL,
  adgangsadresseid uuid NOT NULL,
  PRIMARY KEY(bygningid, adgangsadresseid)
);

-- Covering index for better performance
CREATE INDEX ON bygningtilknytninger(adgangsadresseid, bygningid);

DROP TABLE IF EXISTS bygningtilknytninger_changes CASCADE;
CREATE TABLE bygningtilknytninger_changes AS (SELECT NULL::integer as txid, NULL::integer as changeid, NULL::operation_type as operation, null::boolean as public, bygningtilknytninger.* FROM bygningtilknytninger WHERE false);
CREATE INDEX ON bygningtilknytninger_changes(txid);
create index on bygningtilknytninger_changes(changeid) WHERE public;
create index on bygningtilknytninger_changes(bygningid, adgangsadresseid, txid DESC NULLS LAST, changeid DESC NULLS LAST);


DROP TABLE IF EXISTS bygning_kommune CASCADE;
CREATE TABLE bygning_kommune(
  bygningid bigint,
  kommunekode smallint,
  primary key(bygningid, kommunekode)
);
CREATE UNIQUE INDEX ON bygning_kommune(kommunekode,bygningid);

DROP TABLE IF EXISTS bygning_kommune_changes CASCADE;
CREATE TABLE bygning_kommune_changes AS (SELECT NULL::integer as txid, NULL::integer as changeid, NULL::operation_type as operation, null::boolean as public, bygning_kommune.* FROM bygning_kommune WHERE false);
CREATE INDEX ON bygning_kommune_changes(txid);
create index on bygning_kommune_changes(changeid) WHERE public;
create index on bygning_kommune_changes(bygningid, kommunekode, txid DESC NULLS LAST, changeid DESC NULLS LAST);

ALTER TABLE navngivenvej ADD COLUMN bbox geometry(Polygon, 25832);
UPDATE navngivenvej SET bbox = st_envelope(geom);

ALTER TABLE navngivenvej_changes ADD COLUMN bbox geometry(Polygon, 25832);
UPDATE navngivenvej_changes SET bbox = st_envelope(geom);

ALTER TABLE navngivenvej ADD COLUMN visueltcenter geometry(point, 25832);
UPDATE navngivenvej set visueltcenter = ST_ClosestPoint(geom, ST_Centroid(geom));

ALTER TABLE navngivenvej_changes ADD COLUMN visueltcenter geometry(Point, 25832);
UPDATE navngivenvej_changes set visueltcenter = ST_ClosestPoint(geom, ST_Centroid(geom));

ALTER TABLE steder ADD COLUMN bbox geometry(Polygon, 25832);
update steder set bbox = CASE WHEN st_geometrytype(st_envelope(geom)) = 'ST_Polygon' THEN st_envelope(geom) ELSE null END;
ALTER TABLE steder_changes ADD COLUMN bbox geometry(Polygon, 25832);
update steder_changes set bbox = CASE WHEN st_geometrytype(st_envelope(geom)) = 'ST_Polygon' THEN st_envelope(geom) ELSE null END;
`
      );
    }));
    yield reloadDatabaseCode(client, 'psql/schema');
  })).done();
});


