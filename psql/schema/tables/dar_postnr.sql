DROP TABLE IF EXISTS dar_postnr CASCADE;

CREATE TABLE dar_postnr(
  versionid uuid NOT NULL PRIMARY KEY DEFAULT uuid_generate_v4(),
  kommunekode smallint NOT NULL,
  vejkode smallint NOT NULL,
  registrering tstzrange NOT NULL DEFAULT tstzrange(current_timestamp, 'infinity', '[)'),
  husnrinterval husnr_range NOT NULL,
  side char(1) NOT NULL,
  postdistriktnummer smallint NOT NULL,
  oprettimestamp timestamptz,
  aendringstimestamp timestamptz,
  ophoerttimestamp timestamptz
);

CREATE INDEX ON dar_postnr(kommunekode, vejkode);