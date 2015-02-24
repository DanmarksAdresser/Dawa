DROP TABLE IF EXISTS dar_streetname CASCADE;
CREATE TABLE  dar_streetname (
  versionid uuid NOT NULL PRIMARY KEY,
  vejkode smallint NOT NULL,
  kommunekode smallint NOT NULL,
  registrering tstzrange not null default tstzrange(current_timestamp, 'infinity', '[)'),
--  tx_created integer NOT NULL,
--  tx_expired integer NOT NULL,
  navn text,
  adresseringsnavn text,
  aendringstimestamp timestamptz,
  oprettimestamp timestamptz,
  ophoerttimestamp timestamptz
);

CREATE INDEX ON dar_streetname(vejkode, kommunekode);