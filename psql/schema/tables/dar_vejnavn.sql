DROP TABLE IF EXISTS dar_vejnavn CASCADE;
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
  ophoerttimestamp timestamptz
);

CREATE INDEX ON dar_vejnavn(id);
CREATE INDEX ON dar_vejnavn(vejkode, kommunekode);