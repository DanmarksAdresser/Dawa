DROP TABLE IF EXISTS cpr_postnr;
CREATE TABLE cpr_postnr(
  kommunekode smallint NOT NULL,
  vejkode smallint NOT NULL,
  husnrinterval husnr_range NOT NULL,
  side char(1) NOT NULL,
  nr smallint NOT NULL,
  navn text,
  virkning tstzrange NOT NULL
);

CREATE INDEX ON cpr_postnr(kommunekode, vejkode);