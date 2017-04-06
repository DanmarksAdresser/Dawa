DROP TABLE IF EXISTS adresser_mat;
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
CREATE INDEX ON adresser_mat(objekttype);
CREATE INDEX ON adresser_mat(vejnavn, postnr);
