DROP TABLE IF EXISTS dar_adresse CASCADE;
CREATE TABLE  dar_adresse (
  versionid integer NOT NULL PRIMARY KEY,
  id integer NOT NULL,
  bkid uuid NOT NULL,
  statuskode smallint NOT NULL,
  kildekode smallint,
  registrering tstzrange,
  virkning tstzrange,
--  tx_created integer NOT NULL,
--  tx_expired integer NOT NULL,
  husnummerid integer NOT NULL,
  etagebetegnelse varchar(2),
  doerbetegnelse varchar(4),
  esdhreference text,
  journalnummer text,
  ikrafttraedelsesdato timestamptz
);

CREATE INDEX ON dar_adresse(id);
CREATE INDEX ON dar_adresse(bkid);
CREATE INDEX ON dar_adresse(husnummerid);