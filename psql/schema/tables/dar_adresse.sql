DROP TABLE IF EXISTS dar_adresse CASCADE;
CREATE TABLE  dar_adresse (
  versionid integer NOT NULL PRIMARY KEY,
  id integer NOT NULL,
  bkid uuid NOT NULL,
  statuskode smallint NOT NULL,
  kildekode smallint,
  registrering tstzrange NOT NULL,
  virkning tstzrange NOT NULL,
  tx_created integer NOT NULL DEFAULT current_dar_transaction(),
  tx_expired integer,
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
CREATE INDEX ON dar_adresse(tx_created);
CREATE INDEX ON dar_adresse(tx_expired);