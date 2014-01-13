CREATE DATABASE dawa;
\c dawa;

CREATE EXTENSION postgis;

CREATE TABLE Postnumre (
  nr integer NOT NULL PRIMARY KEY,
  version VARCHAR(255) NOT NULL,
  navn VARCHAR(20) NOT NULL
);

CREATE TABLE Vejnavne (
  kode integer NOT NULL,
  kommunekode integer NOT NULL,
  version VARCHAR(255) NOT NULL,
  vejnavn VARCHAR(255) NOT NULL,
  PRIMARY KEY(kode, kommunekode)
);

CREATE TABLE Adgangsadresser (
  id uuid NOT NULL PRIMARY KEY,
  version VARCHAR(255) NOT NULL,
  vejkode INTEGER NOT NULL,
  kommunekode INTEGER NOT NULL,
  husnr VARCHAR(6) NOT NULL,
  postnr INTEGER,
  ejerlavkode INTEGER NOT NULL,
  ejerlavnavn VARCHAR(255) NULL,
  matrikelnr VARCHAR(7) NULL,
  oprettet VARCHAR(255) NULL,
  aendret VARCHAR(255) NULL,
  etrs89oest DECIMAL(7,2),
  etrs89nord DECIMAL(7,2),
  wgs84 GEOGRAPHY(POINT, 4326)
);

CREATE TABLE Enhedsadresser (
  id uuid NOT NULL PRIMARY KEY,
  version VARCHAR(255) NOT NULL,
  adgangsadresseid UUID NOT NULL,
  oprettet VARCHAR(255) NULL,
  aendret VARCHAR(255) NULL,
  etage VARCHAR(3),
  doer VARCHAR(4)
);
