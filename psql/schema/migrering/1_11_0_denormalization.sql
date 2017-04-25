BEGIN;
DROP FUNCTION IF EXISTS enhedsadresser_history_update() CASCADE;
DROP FUNCTION IF EXISTS adgangsadresser_history_update() CASCADE;
DROP FUNCTION IF EXISTS postnumre_history_update() CASCADE;
DROP FUNCTION IF EXISTS ejerlav_history_update() CASCADE;

CREATE TABLE transactions(
  txid INTEGER PRIMARY KEY,
  ts TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  description text NOT NULL
);

CREATE TABLE current_tx(
  txid INTEGER
);

INSERT INTO current_tx VALUES (null);
CREATE UNIQUE INDEX
  ON current_tx((true));

ALTER TABLE transaction_history ADD COLUMN txid integer;
CREATE INDEX ON transaction_history(txid, sequence_number);


CREATE TABLE adgangsadresser_mat(
  id uuid NOT NULL PRIMARY KEY,
  kommunekode INTEGER NOT NULL,
  vejkode INTEGER NOT NULL,
  husnr husnr,
  supplerendebynavn text NULL,
  postnr INTEGER NULL,
  ejerlavkode INTEGER,
  matrikelnr text NULL,
  esrejendomsnr integer NULL,
  objekttype smallint,
  oprettet timestamp,
  ikraftfra timestamp,
  aendret timestamp,
  adgangspunktid uuid,
  etrs89oest double precision NULL,
  etrs89nord double precision NULL,
  noejagtighed CHAR(1) NULL,
  adgangspunktkilde smallint NULL,
  husnummerkilde smallint,
  placering smallint,
  tekniskstandard CHAR(2) NULL,
  tekstretning float4 NULL,
  adressepunktaendringsdato timestamp NULL,
  esdhReference text,
  journalnummer text,
  geom  geometry(point, 25832),
  tsv tsvector,
  hoejde double precision NULL,
  navngivenvej_id uuid,
  postnrnavn text,
  vejnavn text,
  adresseringsvejnavn text,
  ejerlavnavn text,
  stormodtagerpostnr smallint,
  stormodtagerpostnrnavn text
);

ALTER TABLE adgangsadresser DROP COLUMN geom CASCADE;
ALTER TABLE adgangsadresser DROP COLUMN tsv CASCADE;

CREATE TABLE adresser_mat(
  id UUID PRIMARY KEY,
  adgangsadresseid UUID NOT NULL,
  objekttype smallint,
  oprettet timestamp,
  ikraftfra timestamp,
  aendret timestamp,
  etage VARCHAR(3),
  doer VARCHAR(4),
  kilde smallint,
  esdhReference text,
  journalnummer text,
  a_objekttype smallint,
  a_oprettet timestamp,
  a_aendret timestamp,
  a_ikraftfra timestamp,
  kommunekode INTEGER NOT NULL,
  vejkode INTEGER NOT NULL,
  husnr husnr,
  supplerendebynavn text NULL,
  postnr INTEGER NULL,
  ejerlavkode INTEGER,
  matrikelnr text NULL,
  esrejendomsnr integer NULL,
  adgangspunktid uuid,
  etrs89oest double precision NULL,
  etrs89nord double precision NULL,
  noejagtighed CHAR(1) NULL,
  adgangspunktkilde smallint NULL,
  husnummerkilde smallint,
  placering smallint,
  tekniskstandard CHAR(2) NULL,
  tekstretning float4 NULL,
  adressepunktaendringsdato timestamp NULL,
  geom  geometry(point, 25832),
  tsv tsvector,
  hoejde double precision NULL,
  navngivenvej_id uuid,
  postnrnavn text,
  vejnavn text,
  adresseringsvejnavn text,
  ejerlavnavn text,
  stormodtagerpostnr smallint,
  stormodtagerpostnrnavn text
);

ALTER TABLE enhedsadresser DROP COLUMN tsv CASCADE;

CREATE TABLE ejerlav_changes AS (SELECT NULL::integer as txid, NULL::integer as changeid, NULL::operation_type as operation, null::boolean as public, kode, navn, tsv FROM ejerlav WHERE false);
CREATE INDEX ON ejerlav_changes(kode, changeid desc NULLS LAST);
CREATE INDEX ON ejerlav_changes(changeid desc NULLS LAST);
CREATE TABLE postnumre_changes AS (SELECT NULL::integer as txid, NULL::integer as changeid, NULL::operation_type as operation, null::boolean as public, nr, navn, tsv, stormodtager FROM postnumre WHERE false);
CREATE INDEX ON postnumre_changes(nr, changeid desc NULLS LAST);
CREATE INDEX ON postnumre_changes(changeid desc NULLS LAST);
CREATE TABLE vejstykker_changes AS (SELECT NULL::integer as txid, NULL::integer as changeid, NULL::operation_type as operation, null::boolean as public, kommunekode, kode, oprettet, aendret, vejnavn, adresseringsnavn, tsv, geom, navngivenvej_id FROM vejstykker WHERE false);
CREATE INDEX ON vejstykker_changes(kommunekode, kode, changeid desc NULLS LAST);
CREATE INDEX ON vejstykker_changes(changeid desc NULLS LAST);
CREATE TABLE adgangsadresser_changes AS (SELECT NULL::integer as txid, NULL::integer as changeid, NULL::operation_type as operation, null::boolean as public, id, kommunekode, vejkode, husnr, supplerendebynavn, postnr, ejerlavkode, matrikelnr, esrejendomsnr, oprettet, ikraftfra, aendret, adgangspunktid, etrs89oest, etrs89nord, noejagtighed, adgangspunktkilde, placering, tekniskstandard, tekstretning, adressepunktaendringsdato, objekttype, husnummerkilde, esdhreference, journalnummer, hoejde, navngivenvej_id FROM adgangsadresser WHERE false);
CREATE INDEX ON adgangsadresser_changes(id, changeid desc NULLS LAST);
CREATE INDEX ON adgangsadresser_changes(changeid desc NULLS LAST);
CREATE TABLE enhedsadresser_changes AS (SELECT NULL::integer as txid, NULL::integer as changeid, NULL::operation_type as operation, null::boolean as public, id, adgangsadresseid, oprettet, ikraftfra, aendret, etage, doer, objekttype, kilde, esdhreference, journalnummer FROM enhedsadresser WHERE false);
CREATE INDEX ON enhedsadresser_changes(id, changeid desc NULLS LAST);
CREATE INDEX ON enhedsadresser_changes(changeid desc NULLS LAST);
CREATE TABLE adgangsadresser_mat_changes AS (SELECT NULL::integer as txid, NULL::integer as changeid, NULL::operation_type as operation, null::boolean as public, id, kommunekode, vejkode, husnr, supplerendebynavn, postnr, ejerlavkode, matrikelnr, esrejendomsnr, oprettet, ikraftfra, aendret, adgangspunktid, etrs89oest, etrs89nord, noejagtighed, adgangspunktkilde, placering, tekniskstandard, tekstretning, adressepunktaendringsdato, objekttype, husnummerkilde, esdhreference, journalnummer, hoejde, navngivenvej_id, ejerlavnavn, tsv, geom, vejnavn, adresseringsvejnavn, postnrnavn, stormodtagerpostnr, stormodtagerpostnrnavn FROM adgangsadresser_mat WHERE false);
CREATE INDEX ON adgangsadresser_mat_changes(id, changeid desc NULLS LAST);
CREATE INDEX ON adgangsadresser_mat_changes(changeid desc NULLS LAST);
CREATE TABLE stormodtagere_changes AS (SELECT NULL::integer as txid, NULL::integer as changeid, NULL::operation_type as operation, null::boolean as public, nr, navn, adgangsadresseid FROM stormodtagere WHERE false);
CREATE INDEX ON stormodtagere_changes(adgangsadresseid, changeid desc NULLS LAST);
CREATE INDEX ON stormodtagere_changes(changeid desc NULLS LAST);
CREATE TABLE adresser_mat_changes AS (SELECT NULL::integer as txid, NULL::integer as changeid, NULL::operation_type as operation, null::boolean as public, id, adgangsadresseid, oprettet, ikraftfra, aendret, etage, doer, objekttype, kilde, esdhreference, journalnummer, kommunekode, vejkode, husnr, supplerendebynavn, postnr, ejerlavkode, matrikelnr, esrejendomsnr, adgangspunktid, etrs89oest, etrs89nord, noejagtighed, adgangspunktkilde, placering, tekniskstandard, tekstretning, adressepunktaendringsdato, husnummerkilde, hoejde, navngivenvej_id, ejerlavnavn, vejnavn, adresseringsvejnavn, postnrnavn, stormodtagerpostnr, stormodtagerpostnrnavn, a_objekttype, a_oprettet, a_aendret, a_ikraftfra, geom, tsv FROM adresser_mat WHERE false);
CREATE INDEX ON adresser_mat_changes(id, changeid desc NULLS LAST);
CREATE INDEX ON adresser_mat_changes(changeid desc NULLS LAST);
CREATE INDEX ON ejerlav_changes(txid);
CREATE INDEX ON postnumre_changes(txid);
CREATE INDEX ON vejstykker_changes(txid);
CREATE INDEX ON adgangsadresser_changes(txid);
CREATE INDEX ON enhedsadresser_changes(txid);
CREATE INDEX ON adgangsadresser_mat_changes(txid);
CREATE INDEX ON stormodtagere_changes(txid);
CREATE INDEX ON adresser_mat_changes(txid);

CREATE INDEX ON adgangsadresser_mat USING GIST (geom);
CREATE INDEX ON adgangsadresser_mat(ejerlavkode, id);
CREATE INDEX ON adgangsadresser_mat(kommunekode, vejkode, postnr);
CREATE INDEX ON adgangsadresser_mat(postnr, kommunekode);
CREATE INDEX ON adgangsadresser_mat(supplerendebynavn, kommunekode, postnr);
CREATE INDEX ON adgangsadresser_mat(matrikelnr);
CREATE INDEX ON adgangsadresser_mat(husnr, id);
CREATE INDEX ON adgangsadresser_mat(esrejendomsnr);
CREATE INDEX ON adgangsadresser_mat(objekttype);
CREATE INDEX ON adgangsadresser_mat USING gin(tsv);
CREATE INDEX ON adgangsadresser_mat(noejagtighed, id);
CREATE INDEX ON adgangsadresser_mat(navngivenvej_id, postnr);
CREATE INDEX ON adgangsadresser_mat(vejnavn, postnr);

DROP INDEX adgangsadresser_ejerlavkode_id_idx;
DROP INDEX adgangsadresser_esrejendomsnr_idx;
DROP INDEX adgangsadresser_husnr_id_idx;
DROP INDEX adgangsadresser_kommunekode_vejkode_postnr_idx;
DROP INDEX adgangsadresser_matrikelnr_idx;
DROP INDEX adgangsadresser_navngivenvej_id_postnr_idx;
DROP INDEX adgangsadresser_objekttype_idx;
DROP INDEX adgangsadresser_postnr_kommunekode_idx;
DROP INDEX adgangsadresser_supplerendebynavn_kommunekode_postnr_idx;

CREATE INDEX ON adgangsadresser(kommunekode, vejkode);
CREATE INDEX ON adgangsadresser(postnr);
CREATE INDEX ON adgangsadresser(ejerlavkode);

DROP INDEX enhedsadresser_doer_id_idx;
DROP INDEX enhedsadresser_etage_id_idx;
DROP INDEX enhedsadresser_objekttype_idx;

CREATE INDEX ON adresser_mat USING GIST (geom);
CREATE INDEX ON adresser_mat(ejerlavkode, id);
CREATE INDEX ON adresser_mat(kommunekode, vejkode, postnr);
CREATE INDEX ON adresser_mat(postnr, kommunekode);
CREATE INDEX ON adresser_mat(supplerendebynavn, kommunekode, postnr);
CREATE INDEX ON adresser_mat(matrikelnr);
CREATE INDEX ON adresser_mat(husnr, id);
CREATE INDEX ON adresser_mat(esrejendomsnr);
CREATE INDEX ON adresser_mat(objekttype);
CREATE INDEX ON adresser_mat USING gin(tsv);
CREATE INDEX ON adresser_mat(noejagtighed, id);
CREATE INDEX ON adresser_mat(navngivenvej_id, postnr);
CREATE INDEX ON adresser_mat(adgangsadresseid);
CREATE INDEX ON adresser_mat(etage, id);
CREATE INDEX ON adresser_mat(doer, id);
CREATE INDEX ON adresser_mat(vejnavn, postnr);
COMMIT;
