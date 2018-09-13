DROP TABLE IF EXISTS jordstykker CASCADE;

CREATE TABLE jordstykker(
  ejerlavkode integer not null,
  ejerlavnavn text,
  matrikelnr text not null,
  kommunekode smallint,
  sognekode smallint,
  regionskode smallint,
  retskredskode smallint,
  esrejendomsnr text,
  udvidet_esrejendomsnr text,
  sfeejendomsnr text,
  ændret timestamptz NOT NULL DEFAULT now(),
  geo_version integer NOT NULL DEFAULT 1,
  geo_ændret timestamptz NOT NULL DEFAULT now(),
  primary key(ejerlavkode, matrikelnr),
  geom geometry(Polygon, 25832),
  bbox geometry(Polygon, 25832),
  visueltcenter geometry(Point, 25832),
  tsv tsvector
);

CREATE INDEX ON jordstykker(matrikelnr);
CREATE INDEX ON jordstykker(kommunekode);
CREATE INDEX ON jordstykker(sognekode);
CREATE INDEX ON jordstykker(retskredskode);
CREATE INDEX ON jordstykker(esrejendomsnr);
CREATE INDEX ON jordstykker(udvidet_esrejendomsnr);
CREATE INDEX ON jordstykker(sfeejendomsnr);
CREATE INDEX ON jordstykker USING GIST(geom);
CREATE INDEX ON jordstykker USING GIN(tsv);

DROP TABLE IF EXISTS jordstykker_changes CASCADE;
CREATE TABLE jordstykker_changes AS (SELECT NULL::integer as txid, NULL::integer as changeid, NULL::operation_type as operation, null::boolean as public, jordstykker.* FROM jordstykker WHERE false);
CREATE INDEX ON jordstykker_changes(ejerlavkode, matrikelnr, changeid DESC NULLS LAST);
CREATE INDEX ON jordstykker_changes(ejerlavkode, matrikelnr);
CREATE INDEX ON jordstykker_changes(changeid DESC NULLS LAST);
CREATE INDEX ON jordstykker_changes(txid);


DROP TABLE IF EXISTS jordstykker_adgadr CASCADE;
CREATE TABLE jordstykker_adgadr(
  ejerlavkode integer not null,
  matrikelnr text not null,
  adgangsadresse_id uuid not null,
  primary key(ejerlavkode, matrikelnr, adgangsadresse_id)
);

CREATE UNIQUE INDEX ON jordstykker_adgadr(adgangsadresse_id);

DROP TABLE IF EXISTS jordstykker_adgadr_history CASCADE;

DROP TABLE IF EXISTS jordstykker_adgadr_changes CASCADE;
CREATE TABLE jordstykker_adgadr_changes AS (SELECT NULL::integer as txid, NULL::integer as changeid, NULL::operation_type as operation, null::boolean as public, adgangsadresse_id, ejerlavkode, matrikelnr FROM jordstykker_adgadr WHERE false);
CREATE INDEX ON jordstykker_adgadr_changes(adgangsadresse_id, ejerlavkode, matrikelnr, changeid DESC NULLS LAST);
CREATE INDEX ON jordstykker_adgadr_changes(ejerlavkode, matrikelnr);
CREATE INDEX ON jordstykker_adgadr_changes(changeid DESC NULLS LAST);
CREATE INDEX ON jordstykker_adgadr_changes(txid);

CREATE VIEW jordstykker_adgadr_view AS (
  (SELECT DISTINCT j.ejerlavkode, j.matrikelnr, a.id as adgangsadresse_id FROM adgangsadresser_mat a
    JOIN jordstykker j ON ST_Covers(j.geom, a.geom)));