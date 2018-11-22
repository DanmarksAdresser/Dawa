DROP TABLE IF EXISTS vask_postnrinterval;

CREATE TABLE vask_postnrinterval(
  kommunekode smallint NOT NULL,
  vejkode smallint NOT NULL,
  side char(1) NOT NULL,
  husnrinterval husnr_range NOT NULL,
  nr smallint NOT NULL,
  virkning tstzrange NOT NULL,
  exclude using gist(kommunekode with =, vejkode with =, side with =, husnrinterval with &&, virkning with &&)
);

CREATE INDEX ON vask_postnrinterval(kommunekode, vejkode);