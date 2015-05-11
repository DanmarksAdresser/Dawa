DROP TABLE IF EXISTS dar_husnummer CASCADE;
CREATE TABLE  dar_husnummer (
  versionid integer NOT NULL PRIMARY KEY,
  id integer NOT NULL,
  bkid uuid NOT NULL,
  adgangspunktid integer NOT NULL,
  statuskode smallint NOT NULL,
  kildekode smallint,
  registrering tstzrange NOT NULL,
  virkning tstzrange NOT NULL,
  dbregistrering tstzrange,
  tx_created integer NOT NULL DEFAULT current_dar_transaction(),
  tx_expired integer,
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
CREATE INDEX ON dar_husnummer(tx_created);
CREATE INDEX ON dar_husnummer(tx_expired);
CREATE INDEX ON dar_husnummer(coalesce(upper(dbregistrering), lower(dbregistrering)));
