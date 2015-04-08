DROP TABLE IF EXISTS dar_supplerendebynavn CASCADE;

CREATE TABLE dar_supplerendebynavn(
  versionid integer NOT NULL PRIMARY KEY DEFAULT nextval('id_sequence'),
  id uuid NOT NULL,
  kommunekode smallint,
  vejkode smallint,
  registrering tstzrange not null default tstzrange(current_timestamp, null, '[)'),
  husnrinterval husnr_range,
  side char(1),
  bynavn varchar(50),
  oprettimestamp timestamptz,
  aendringstimestamp timestamptz,
  ophoerttimestamp timestamptz
);

CREATE INDEX ON dar_supplerendebynavn(id);
CREATE INDEX ON dar_supplerendebynavn(kommunekode, vejkode);