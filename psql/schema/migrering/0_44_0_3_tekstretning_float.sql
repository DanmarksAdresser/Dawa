DROP VIEW adgangsadresserview CASCADE;
DROP VIEW wms_adgangsadresser CASCADE;
DROP VIEW wfs_adgangsadresser CASCADE;
ALTER TABLE adgangsadresser ALTER COLUMN tekstretning TYPE float4;
ALTER TABLE adgangsadresser_history ALTER COLUMN tekstretning TYPE float4;