DROP TABLE IF EXISTS adresser_mat CASCADE;
CREATE TABLE adresser_mat(
  id UUID PRIMARY KEY,
  adgangsadresseid UUID NOT NULL,
  status smallint,
  oprettet timestamp,
  ikraftfra timestamp,
  aendret timestamp,
  nedlagt timestamp,
  etage VARCHAR(3),
  doer VARCHAR(4),
  a_status smallint,
  a_oprettet timestamp,
  a_aendret timestamp,
  a_ikraftfra timestamp,
  a_nedlagt TIMESTAMP,
  kommunekode INTEGER NOT NULL,
  vejkode INTEGER NOT NULL,
  husnr husnr,
  supplerendebynavn text NULL,
  supplerendebynavn_dagi_id integer,
  postnr INTEGER NULL,
  adgangspunktid uuid,
  etrs89oest double precision NULL,
  etrs89nord double precision NULL,
  noejagtighed CHAR(1) NULL,
  adgangspunktkilde smallint NULL,
  placering smallint,
  tekniskstandard CHAR(2) NULL,
  tekstretning numeric(5,2) NULL,
  adressepunktaendringsdato timestamp NULL,
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
  stormodtagerpostnr smallint,
  stormodtagerpostnrnavn text,
  vejpunkt_id uuid,
  vejpunkt_kilde text,
  vejpunkt_noejagtighedsklasse text,
  vejpunkt_tekniskstandard text,
  vejpunkt_ændret timestamp,
  vejpunkt_geom geometry(Point,25832)
);

CREATE INDEX ON adresser_mat USING GIST (geom);
CREATE INDEX ON adresser_mat(kommunekode, vejkode, postnr);
CREATE INDEX ON adresser_mat(postnr, kommunekode);
CREATE INDEX ON adresser_mat(postnr, id);
CREATE INDEX ON adresser_mat(supplerendebynavn, kommunekode, postnr);
CREATE INDEX ON adresser_mat(husnr, id);
CREATE INDEX ON adresser_mat USING gin(tsv);
CREATE INDEX ON adresser_mat(noejagtighed, id);
CREATE INDEX ON adresser_mat(navngivenvej_id, postnr);
CREATE INDEX ON adresser_mat(adgangsadresseid);
CREATE INDEX ON adresser_mat(etage, id);
CREATE INDEX ON adresser_mat(doer, id);
CREATE INDEX ON adresser_mat(status);
CREATE INDEX ON adresser_mat(vejnavn, postnr);
CREATE INDEX ON adresser_mat(vejkode,postnr);
CREATE INDEX ON adresser_mat(vejpunkt_id);
CREATE INDEX ON adresser_mat USING GIST (vejpunkt_geom);
CREATE INDEX ON adresser_mat(supplerendebynavn_dagi_id);
