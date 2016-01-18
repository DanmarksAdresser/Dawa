DROP VIEW adgangsadresserview CASCADE;
DROP VIEW wms_adgangsadresser;
DROP VIEW wms_housenumber_inspire;

ALTER TABLE adgangsadresser ALTER husnr TYPE husnr USING CASE WHEN husnr IS NULL THEN null ELSE (substring(husnr, '([0-9]{1,3})[A-Z]{0,1}')::smallint, substring(husnr, '[0-9]{1,3}([A-Z]{0,1})'))::husnr END;
ALTER TABLE adgangsadresser_history ALTER husnr TYPE husnr USING CASE WHEN husnr IS NULL THEN null ELSE (substring(husnr, '([0-9]{1,3})[A-Z]{0,1}')::smallint, substring(husnr, '[0-9]{1,3}([A-Z]{0,1})'))::husnr END;

CREATE OR REPLACE FUNCTION formatHusnr(husnr) RETURNS text AS $$
select $1.tal || $1.bogstav;
$$ language sql;

--- initialize cpr_vej table
DROP TABLE IF EXISTS cpr_vej CASCADE;

CREATE TABLE cpr_vej(
  kommunekode smallint NOT NULL,
  vejkode smallint NOT NULL,
  navn text,
  adresseringsnavn text,
  virkning tstzrange NOT NULL,
  exclude using gist(kommunekode with =, vejkode with =, registrering with &&) INITIALLY DEFERRED
);

CREATE INDEX ON cpr_vej(kommunekode, vejkode);

--- initialize cpr_postnr table
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

--- vask_vejnavn table
DROP TABLE IF EXISTS vask_vejnavn;

CREATE TABLE vask_vejnavn(
  kommunekode smallint NOT NULL,
  vejkode smallint NOT NULL,
  navn text NOT NULL,
  adresseringsnavn text NOT NULL,
  virkning tstzrange NOT NULL,
  exclude using gist(kommunekode with =, vejkode with =, virkning with &&)
);

CREATE INDEX ON vask_vejnavn(kommunekode, vejkode);

--- vask_postnrinterval table
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

--- vask_vejstykker_postnumre
DROP TABLE IF EXISTS vask_vejstykker_postnumre CASCADE;

CREATE TABLE vask_vejstykker_postnumre(
  kommunekode smallint NOT NULL,
  vejkode smallint NOT NULL,
  vejnavn text NOT NULL,
  postnr smallint NOT NULL,
  tekst text NOT NULL,
  PRIMARY KEY(kommunekode, vejkode, postnr)
);

CREATE INDEX ON vask_vejstykker_postnumre USING GIST(tekst gist_trgm_ops);