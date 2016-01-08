DROP TABLE IF EXISTS vask_postnrinterval;

CREATE TABLE vask_postnrinterval(
  kommunekode smallint NOT NULL,
  vejkode smallint NOT NULL,
  side char(1) NOT NULL,
  husnrinterval husnr_range NOT NULL,
  nr smallint NOT NULL,
  virkning tstzrange NOT NULL
);

CREATE INDEX ON vask_postnrinterval(kommunekode, vejkode);