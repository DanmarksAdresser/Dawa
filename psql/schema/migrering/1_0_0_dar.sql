CREATE EXTENSION IF  NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "btree_gist";
CREATE SEQUENCE id_sequence START 1;

CREATE TYPE husnr AS (
  tal smallint,
  bogstav varchar(1)
);

CREATE TYPE husnr_range AS RANGE (
  subtype = husnr
);

DROP INDEX temaer_geom_idx;

ALTER TABLE adgangsadresser RENAME COLUMN kilde TO adgangspunktkilde;
ALTER TABLE adgangsadresser ALTER COLUMN placering TYPE smallint USING placering::smallint;
ALTER TABLE adgangsadresser ADD COLUMN husnummerkilde smallint, ADD COLUMN esdhreference text, ADD COLUMN journalnummer text;

ALTER TABLE adgangsadresser_history RENAME COLUMN kilde TO adgangspunktkilde;
ALTER TABLE adgangsadresser_history ALTER COLUMN placering TYPE smallint USING placering::smallint;
ALTER TABLE adgangsadresser_history ADD COLUMN husnummerkilde smallint, ADD COLUMN esdhreference text, ADD COLUMN journalnummer text;

ALTER TABLE enhedsadresser ADD COLUMN kilde smallint, ADD COLUMN esdhreference text, ADD COLUMN journalnummer text;
ALTER TABLE enhedsadresser_history ADD COLUMN kilde smallint, ADD COLUMN esdhreference text, ADD COLUMN journalnummer text;

CREATE TABLE  dar_adgangspunkt (
  versionid integer NOT NULL,
  id integer NOT NULL,
  bkid uuid NOT NULL,
  statuskode smallint NOT NULL,
  kildekode smallint,
  registrering tstzrange NOT NULL,
  virkning tstzrange NOT NULL,
--  tx_created integer NOT NULL,
--  tx_expired integer NOT NULL,
  tekniskstandard varchar(2),
  noejagtighedsklasse varchar(1),
  retning real,
  placering smallint,
  kommunenummer smallint,
  esdhreference text,
  journalnummer text,
  revisionsdato timestamptz,
  geom  geometry(point, 25832),
  exclude using gist(id with =, registrering with &&, virkning with &&) INITIALLY DEFERRED
);

CREATE INDEX ON dar_adgangspunkt(id);
CREATE INDEX ON dar_adgangspunkt(bkid);
CREATE INDEX ON dar_adgangspunkt(coalesce(upper(registrering), lower(registrering)));

CREATE TABLE  dar_husnummer (
  versionid integer NOT NULL PRIMARY KEY,
  id integer NOT NULL,
  bkid uuid NOT NULL,
  adgangspunktid integer NOT NULL,
  statuskode smallint NOT NULL,
  kildekode smallint,
  registrering tstzrange NOT NULL,
  virkning tstzrange NOT NULL,
--  tx_created integer NOT NULL,
--  tx_expired integer NOT NULL,
  vejkode smallint,
  husnummer husnr,
  ikrafttraedelsesdato timestamptz,
  vejnavn text,
  postnummer smallint,
  postdistrikt text,
  bynavn text,
  exclude using gist(id with =, registrering with &&, virkning with &&) INITIALLY DEFERRED
);

CREATE INDEX ON dar_husnummer(id);
CREATE INDEX ON dar_husnummer(bkid);
CREATE INDEX ON dar_husnummer(adgangspunktid);
CREATE INDEX ON dar_husnummer(coalesce(upper(registrering), lower(registrering)));

CREATE TABLE  dar_adresse (
  versionid integer NOT NULL PRIMARY KEY,
  id integer NOT NULL,
  bkid uuid NOT NULL,
  statuskode smallint NOT NULL,
  kildekode smallint,
  registrering tstzrange NOT NULL,
  virkning tstzrange NOT NULL,
--  tx_created integer NOT NULL,
--  tx_expired integer NOT NULL,
  husnummerid integer NOT NULL,
  etagebetegnelse varchar(2),
  doerbetegnelse varchar(4),
  esdhreference text,
  journalnummer text,
  ikrafttraedelsesdato timestamptz,
  exclude using gist(id with =, registrering with &&, virkning with &&) INITIALLY DEFERRED

);

CREATE INDEX ON dar_adresse(id);
CREATE INDEX ON dar_adresse(bkid);
CREATE INDEX ON dar_adresse(husnummerid);
CREATE INDEX ON dar_adresse(coalesce(upper(registrering), lower(registrering)));

CREATE TABLE  dar_vejnavn (
  versionid integer NOT NULL PRIMARY KEY DEFAULT nextval('id_sequence'),
  id uuid not null,
  vejkode smallint,
  kommunekode smallint,
  registrering tstzrange NOT NULL DEFAULT tstzrange(current_timestamp, null, '[)'),
--  tx_created integer NOT NULL,
--  tx_expired integer NOT NULL,
  navn text,
  adresseringsnavn text,
  aendringstimestamp timestamptz,
  oprettimestamp timestamptz,
  ophoerttimestamp timestamptz,
  exclude using gist((id::text) with =, registrering with &&) INITIALLY DEFERRED
);

CREATE INDEX ON dar_vejnavn(id);
CREATE INDEX ON dar_vejnavn(vejkode, kommunekode);

CREATE TABLE dar_postnr(
  versionid integer NOT NULL PRIMARY KEY DEFAULT nextval('id_sequence'),
  id uuid not null,
  kommunekode smallint,
  vejkode smallint,
  registrering tstzrange not null default tstzrange(current_timestamp, null, '[)'),
  husnrinterval husnr_range,
  side char(1),
  postdistriktnummer smallint,
  oprettimestamp timestamptz,
  aendringstimestamp timestamptz,
  ophoerttimestamp timestamptz,
  exclude using gist((id::text) with =, registrering with &&) INITIALLY DEFERRED

);

CREATE INDEX ON dar_postnr(id);
CREATE INDEX ON dar_postnr(kommunekode, vejkode);

CREATE TABLE dar_supplerendebynavn(
  versionid integer NOT NULL PRIMARY KEY DEFAULT nextval('id_sequence'),
  id uuid NOT NULL,
  kommunekode smallint,
  vejkode smallint,
  registrering tstzrange not null default tstzrange(current_timestamp, null, '[)'),
  husnrinterval husnr_range,
  side char(1),
  bynavn varchar(50),
  oprettimestamp timestamptz,
  aendringstimestamp timestamptz,
  ophoerttimestamp timestamptz,
  exclude using gist((id::text) with =, registrering with &&) INITIALLY DEFERRED
);

CREATE INDEX ON dar_supplerendebynavn(id);
CREATE INDEX ON dar_supplerendebynavn(kommunekode, vejkode);

CREATE TABLE dar_lastfetched(
  lastfetched timestamptz
);

INSERT INTO dar_lastfetched values(null);

-- Ensure table only contains a single value
CREATE UNIQUE INDEX ON dar_lastfetched((true));