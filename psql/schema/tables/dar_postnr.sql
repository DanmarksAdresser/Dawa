DROP TABLE IF EXISTS dar_postnr CASCADE;

CREATE TABLE dar_postnr(
  versionid uuid NOT NULL PRIMARY KEY,
  kommunekode smallint NOT NULL,
  vejkode smallint NOT NULL,
  registrering tstzrange NOT NULL DEFAULT tstzrange(current_timestamp, 'infinity', '[)'),
  husnr husnr_range NOT NULL,
  side char(1) NOT NULL,
  postnr smallint NOT NULL,
  oprettimestamp timestamptz,
  aendringstimestamp timestamptz,
  ophoerttimestamp timestamptz
);

CREATE INDEX ON dar_postnr(kommunekode, vejkode);