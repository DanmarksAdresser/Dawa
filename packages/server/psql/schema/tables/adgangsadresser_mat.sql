DROP TABLE IF EXISTS adgangsadresser_mat CASCADE;
CREATE TABLE adgangsadresser_mat(
  id uuid NOT NULL PRIMARY KEY,
  kommunekode INTEGER NOT NULL,
  vejkode INTEGER NOT NULL,
  husnr husnr,
  supplerendebynavn text NULL,
  supplerendebynavn_dagi_id integer,
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
  tekstretning numeric(5,2) NULL,
  adressepunktaendringsdato timestamp NULL,
  esdhReference text,
  journalnummer text,
  geom  geometry(point, 25832),
  tsv tsvector,
  hoejde double precision NULL,
  navngivenvej_id uuid,
  navngivenvejkommunedel_id uuid,
  supplerendebynavn_id uuid,
  darkommuneinddeling_id uuid,
  adressepunkt_id uuid,
  postnummer_id uuid,
  postnrnavn text,
  vejnavn text,
  adresseringsvejnavn text,
  ejerlavnavn text,
  stormodtagerpostnr smallint,
  stormodtagerpostnrnavn text,
  vejpunkt_id uuid,
  vejpunkt_kilde text,
  vejpunkt_noejagtighedsklasse text,
  vejpunkt_tekniskstandard text,
  vejpunkt_geom geometry(Point,25832)
);

CREATE INDEX ON adgangsadresser_mat USING GIST (geom);
CREATE INDEX ON adgangsadresser_mat(ejerlavkode, id);
CREATE INDEX ON adgangsadresser_mat(kommunekode, vejkode, postnr);
CREATE INDEX ON adgangsadresser_mat(postnr, kommunekode);
CREATE INDEX ON adgangsadresser_mat(postnr, id);
CREATE INDEX ON adgangsadresser_mat(supplerendebynavn, kommunekode, postnr);
CREATE INDEX ON adgangsadresser_mat(matrikelnr);
CREATE INDEX ON adgangsadresser_mat(husnr, id);
CREATE INDEX ON adgangsadresser_mat(esrejendomsnr);
CREATE INDEX ON adgangsadresser_mat(objekttype);
CREATE INDEX ON adgangsadresser_mat USING gin(tsv);
CREATE INDEX ON adgangsadresser_mat(noejagtighed, id);
CREATE INDEX ON adgangsadresser_mat(navngivenvej_id, postnr);
CREATE INDEX ON adgangsadresser_mat(vejnavn, postnr);
CREATE INDEX ON adgangsadresser_mat(vejkode,postnr);
CREATE INDEX ON adgangsadresser_mat(vejpunkt_id);
CREATE INDEX ON adgangsadresser_mat USING GIST (vejpunkt_geom);
CREATE INDEX ON adgangsadresser_mat(supplerendebynavn_dagi_id);
