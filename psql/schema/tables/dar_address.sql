DROP TABLE IF EXISTS dar_address CASCADE;
CREATE TABLE  dar_address (
  versionid uuid NOT NULL PRIMARY KEY,
  id uuid NOT NULL,
  statuskode smallint NOT NULL,
  kildekode smallint,
  registrering tstzrange,
  virkning tstzrange,
--  tx_created integer NOT NULL,
--  tx_expired integer NOT NULL,
  husnummerid uuid NOT NULL,
  etagebetegnelse varchar(2),
  doerbetegnelse varchar(4),
  esdhreference text,
  journalnummer text,
  ikrafttraedelsesdato timestamptz
);

CREATE INDEX ON dar_address(id);