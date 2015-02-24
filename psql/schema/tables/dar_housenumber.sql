DROP TABLE IF EXISTS dar_housenumber CASCADE;
CREATE TABLE  dar_housenumber (
  versionid uuid NOT NULL PRIMARY KEY,
  id uuid NOT NULL,
  adgangspunktid uuid NOT NULL,
  statuskode smallint NOT NULL,
  kildekode smallint,
  registrering tstzrange,
  virkning tstzrange,
--  tx_created integer NOT NULL,
--  tx_expired integer NOT NULL,
  vejkode smallint NOT NULL,
  husnummer varchar(6),
  ikrafttraedelsesdato timestamptz,
  vejnavn text,
  postnummer smallint,
  postdistrikt text,
  bynavn text
);

CREATE INDEX ON dar_housenumber(id);