DROP VIEW adgangsadresserview CASCADE;
DROP VIEW wms_adgangsadresser;
DROP VIEW wms_housenumber_inspire;

ALTER TABLE adgangsadresser ALTER husnr TYPE husnr USING CASE WHEN husnr IS NULL THEN null ELSE (substring(husnr, '([0-9]{1,3})[A-Z]{0,1}')::smallint, substring(husnr, '[0-9]{1,3}([A-Z]{0,1})'))::husnr END;
ALTER TABLE adgangsadresser_history ALTER husnr TYPE husnr USING CASE WHEN husnr IS NULL THEN null ELSE (substring(husnr, '([0-9]{1,3})[A-Z]{0,1}')::smallint, substring(husnr, '[0-9]{1,3}([A-Z]{0,1})'))::husnr END;

CREATE TABLE cpr_vej(
  kommunekode smallint NOT NULL,
  vejkode smallint NOT NULL,
  navn text,
  adresseringsnavn text,
  registrering tstzrange NOT NULL,
  exclude using gist(kommunekode with =, vejkode with =, registrering with &&)
);

CREATE OR REPLACE FUNCTION formatHusnr(husnr) RETURNS text AS $$
select $1.tal || $1.bogstav;
$$ language sql;
