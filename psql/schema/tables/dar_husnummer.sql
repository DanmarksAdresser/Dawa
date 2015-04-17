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
--  tx_created integer NOT NULL,
--  tx_expired integer NOT NULL,
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