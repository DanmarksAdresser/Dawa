DROP TABLE IF EXISTS dar_supplerendebynavn CASCADE;

CREATE TABLE dar_supplerendebynavn(
  versionid integer NOT NULL PRIMARY KEY DEFAULT nextval('id_sequence'),
  kommunekode smallint NOT NULL,
  vejkode smallint NOT NULL,
  registrering tstzrange not null default tstzrange(current_timestamp, null, '[)'),
  husnrinterval husnr_range NOT NULL,
  side char(1) NOT NULL,
  bynavn varchar(50) NOT NULL,
  oprettimestamp timestamptz,
  aendringstimestamp timestamptz,
  ophoerttimestamp timestamptz
);

CREATE INDEX ON dar_supplerendebynavn(kommunekode, vejkode);