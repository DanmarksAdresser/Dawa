DROP TABLE IF EXISTS dar_postnr CASCADE;

CREATE TABLE dar_postnr(
  versionid integer NOT NULL PRIMARY KEY DEFAULT nextval('id_sequence'),
  kommunekode smallint NOT NULL,
  vejkode smallint NOT NULL,
  registrering tstzrange not null default tstzrange(current_timestamp, null, '[)'),
  husnrinterval husnr_range NOT NULL,
  side char(1) NOT NULL,
  postdistriktnummer smallint NOT NULL,
  oprettimestamp timestamptz,
  aendringstimestamp timestamptz,
  ophoerttimestamp timestamptz
);

CREATE INDEX ON dar_postnr(kommunekode, vejkode);