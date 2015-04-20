DROP TABLE IF EXISTS dar_adgangspunkt CASCADE;
CREATE TABLE  dar_adgangspunkt (
  versionid integer NOT NULL,
  id integer NOT NULL,
  bkid uuid NOT NULL,
  statuskode smallint NOT NULL,
  kildekode smallint,
  registrering tstzrange NOT NULL,
  virkning tstzrange NOT NULL,
  tx_created integer NOT NULL DEFAULT current_dar_transaction(),
  tx_expired integer,
  tekniskstandard varchar(2),
  noejagtighedsklasse varchar(1),
  retning real,
  placering smallint,
  kommunenummer smallint,
  esdhreference text,
  journalnummer text,
  revisionsdato timestamptz,
  geom  geometry(point, 25832),
  exclude using gist(id with =, registrering with &&, virkning with &&) INITIALLY DEFERRED
);

CREATE INDEX ON dar_adgangspunkt(id);
CREATE INDEX ON dar_adgangspunkt(bkid);
CREATE INDEX ON dar_adgangspunkt(coalesce(upper(registrering), lower(registrering)));