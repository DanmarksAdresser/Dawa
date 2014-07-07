DROP VIEW IF EXISTS adgangsadresserview CASCADE;
DROP VIEW IF EXISTS wms_adgangsadresser CASCADE;
DROP VIEW IF EXISTS wfs_adgangsadresser CASCADE;
ALTER TABLE adgangsadresser ALTER COLUMN tekstretning TYPE float4;
ALTER TABLE adgangsadresser_history ALTER COLUMN tekstretning TYPE float4;