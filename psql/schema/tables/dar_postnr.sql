DROP TABLE IF EXISTS dar_postnr CASCADE;

CREATE TABLE dar_postnr(
  versionid integer NOT NULL PRIMARY KEY DEFAULT nextval('id_sequence'),
  id uuid not null,
  kommunekode smallint,
  vejkode smallint,
  registrering tstzrange not null default tstzrange(current_timestamp, null, '[)'),
  husnrinterval husnr_range,
  side char(1),
  postdistriktnummer smallint,
  oprettimestamp timestamptz,
  aendringstimestamp timestamptz,
  ophoerttimestamp timestamptz
);

CREATE INDEX ON dar_postnr(id);
CREATE INDEX ON dar_postnr(kommunekode, vejkode);