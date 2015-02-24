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
  nord double precision,
  oest double precision,
  tekniskstandard varchar(2),
  noejagtighedsklasse varchar(1),
  retning real,
  placering smallint,
  kommunenummer smallint,
  esdhreference text,
  journalnummer text,
  revisionsdato timestamptz
);

CREATE INDEX ON dar_accesspoint(id);