DROP VIEW adgangsadresserview CASCADE;
DROP VIEW wms_adgangsadresser;
DROP VIEW wms_housenumber_inspire;

ALTER TABLE adgangsadresser ALTER husnr TYPE husnr USING CASE WHEN husnr IS NULL THEN null ELSE (substring(husnr, '([0-9]{1,3})[A-Z]{0,1}')::smallint, substring(husnr, '[0-9]{1,3}([A-Z]{0,1})'))::husnr END;
ALTER TABLE adgangsadresser_history ALTER husnr TYPE husnr USING CASE WHEN husnr IS NULL THEN null ELSE (substring(husnr, '([0-9]{1,3})[A-Z]{0,1}')::smallint, substring(husnr, '[0-9]{1,3}([A-Z]{0,1})'))::husnr END;

CREATE OR REPLACE FUNCTION formatHusnr(husnr) RETURNS text AS $$
select $1.tal || $1.bogstav;
$$ language sql;
