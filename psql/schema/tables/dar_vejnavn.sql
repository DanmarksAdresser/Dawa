DROP TABLE IF EXISTS dar_vejnavn CASCADE;
CREATE TABLE  dar_vejnavn (
  versionid integer NOT NULL PRIMARY KEY DEFAULT nextval('id_sequence'),
  id uuid not null,
  vejkode smallint,
  kommunekode smallint,
  registrering tstzrange NOT NULL DEFAULT tstzrange(current_timestamp, null, '[)'),
  navn text,
  adresseringsnavn text,
  aendringstimestamp timestamptz,
  oprettimestamp timestamptz,
  ophoerttimestamp timestamptz,
  exclude using gist((id::text) with =, registrering with &&) INITIALLY DEFERRED
);

CREATE INDEX ON dar_vejnavn(id);
CREATE INDEX ON dar_vejnavn(vejkode, kommunekode);
