DROP TABLE IF EXISTS dar_accesspoint CASCADE;
CREATE TABLE  dar_accesspoint (
  versionid uuid NOT NULL PRIMARY KEY,
  id uuid NOT NULL,
  statuskode smallint NOT NULL,
  kildekode smallint,
  registrering tstzrange,
  virkning tstzrange,
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
  geom  geometry(point, 25832)
);

CREATE INDEX ON dar_accesspoint(id);