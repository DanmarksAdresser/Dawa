DROP TABLE IF EXISTS adgangsadresser CASCADE;
CREATE TABLE  adgangsadresser (
  id uuid NOT NULL PRIMARY KEY,
  kommunekode INTEGER NOT NULL,
  vejkode INTEGER NOT NULL,
  husnr VARCHAR(6) NOT NULL,
  supplerendebynavn VARCHAR(34) NULL,
  postnr INTEGER NULL,
  ejerlavkode INTEGER,
  matrikelnr VARCHAR(7) NULL,
  esrejendomsnr integer NULL,
  oprettet timestamptz,
  ikraftfra timestamptz,
  aendret timestamptz,
  adgangspunktid uuid,
  etrs89oest double precision NULL,
  etrs89nord double precision NULL,
  wgs84lat double precision NULL,
  wgs84long double precision NULL,
  noejagtighed CHAR(1) NULL,
  kilde integer NULL,
  placering char(1),
  tekniskstandard CHAR(2) NULL,
  tekstretning DECIMAL(5,2) NULL,
  kn100mdk VARCHAR(15) NULL,
  kn1kmdk VARCHAR(15) NULL,
  kn10kmdk VARCHAR(15) NULL,
  adressepunktaendringsdato timestamptz NULL,
  geom  geometry(point, 25832),
  tsv tsvector
);

CREATE INDEX ON Adgangsadresser USING GIST (geom);
CREATE INDEX ON Adgangsadresser(ejerlavkode, id);
CREATE INDEX ON Adgangsadresser(wgs84lat);
CREATE INDEX ON Adgangsadresser(wgs84long);
CREATE INDEX ON Adgangsadresser(kommunekode, vejkode, postnr);
CREATE INDEX ON adgangsadresser(postnr, kommunekode);
CREATE INDEX ON adgangsadresser(supplerendebynavn, kommunekode, postnr);
CREATE INDEX ON adgangsadresser(matrikelnr);
CREATE INDEX ON adgangsadresser(husnr, id);
CREATE INDEX ON adgangsadresser(esrejendomsnr);
CREATE INDEX ON adgangsadresser USING gin(tsv);


DROP TABLE IF EXISTS adgangsadresser_history CASCADE;
CREATE TABLE adgangsadresser_history(
  valid_from integer,
  valid_to integer,
  id uuid NOT NULL,
  kommunekode INTEGER NOT NULL,
  vejkode INTEGER NOT NULL,
  husnr VARCHAR(6) NOT NULL,
  supplerendebynavn VARCHAR(34) NULL,
  postnr INTEGER NULL,
  ejerlavkode INTEGER,
  ejerlavnavn VARCHAR(255) NULL,
  matrikelnr VARCHAR(7) NULL,
  esrejendomsnr integer NULL,
  oprettet timestamptz,
  ikraftfra timestamptz,
  aendret timestamptz,
  adgangspunktid uuid,
  etrs89oest double precision NULL,
  etrs89nord double precision NULL,
  wgs84lat double precision NULL,
  wgs84long double precision NULL,
  noejagtighed CHAR(1) NULL,
  kilde integer NULL,
  placering char(1),
  tekniskstandard CHAR(2) NULL,
  tekstretning DECIMAL(5,2) NULL,
  kn100mdk VARCHAR(15) NULL,
  kn1kmdk VARCHAR(15) NULL,
  kn10kmdk VARCHAR(15) NULL,
  adressepunktaendringsdato timestamptz NULL
);

CREATE INDEX ON adgangsadresser_history(valid_to);
CREATE INDEX ON adgangsadresser_history(valid_from);
CREATE INDEX ON adgangsadresser_history(id);
