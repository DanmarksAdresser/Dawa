DROP TABLE IF EXISTS dar_supplerendebynavn CASCADE;

CREATE TABLE dar_supplerendebynavn(
  versionid uuid NOT NULL PRIMARY KEY DEFAULT uuid_generate_v4(),
  kommunekode smallint NOT NULL,
  vejkode smallint NOT NULL,
  registrering tstzrange not null default tstzrange(current_timestamp, 'infinity', '[)'),
  husnrinterval husnr_range NOT NULL,
  side char(1) NOT NULL,
  bynavn varchar(50) NOT NULL,
  oprettimestamp timestamptz,
  aendringstimestamp timestamptz,
  ophoerttimestamp timestamptz
);

CREATE INDEX ON dar_supplerendebynavn(kommunekode, vejkode);