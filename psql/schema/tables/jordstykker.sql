DROP TABLE IF EXISTS jordstykker CASCADE;

CREATE TABLE jordstykker(
  ejerlavkode integer not null,
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
  geom geometry(Polygon, 25832)
);

CREATE INDEX ON jordstykker(matrikelnr);
CREATE INDEX ON jordstykker(kommunekode);
CREATE INDEX ON jordstykker(sognekode);
CREATE INDEX ON jordstykker(retskredskode);
CREATE INDEX ON jordstykker(esrejendomsnr);
CREATE INDEX ON jordstykker(udvidet_esrejendomsnr);
CREATE INDEX ON jordstykker(sfeejendomsnr);
CREATE INDEX ON jordstykker USING GIST(geom);

DROP TABLE IF EXISTS jordstykker_adgadr CASCADE;
CREATE TABLE jordstykker_adgadr(
  ejerlavkode integer not null,
  matrikelnr text not null,
  adgangsadresse_id uuid not null,
  primary key(ejerlavkode, matrikelnr, adgangsadresse_id)
);

CREATE UNIQUE INDEX ON jordstykker_adgadr(adgangsadresse_id);

DROP TABLE IF EXISTS jordstykker_adgadr_history CASCADE;
CREATE TABLE jordstykker_adgadr_history(
  valid_from integer,
  valid_to integer,
  ejerlavkode integer not null,
  matrikelnr text not null,
  adgangsadresse_id uuid not null
);

CREATE INDEX ON jordstykker_adgadr_history(valid_from);
CREATE INDEX ON jordstykker_adgadr_history(valid_to);
CREATE INDEX ON jordstykker_adgadr_history(adgangsadresse_id);
CREATE INDEX ON jordstykker_adgadr_history(ejerlavkode, matrikelnr);
