DROP VIEW IF EXISTS adgangsadresserview CASCADE;
DROP VIEW IF EXISTS wms_adgangsadresser CASCADE;
DROP VIEW IF EXISTS wfs_adgangsadresser CASCADE;

ALTER TABLE adgangsadresser DROP COLUMN wgs84lat;
ALTER TABLE adgangsadresser DROP COLUMN wgs84long;
ALTER TABLE adgangsadresser_history DROP COLUMN wgs84lat;
ALTER TABLE adgangsadresser_history DROP COLUMN wgs84long;