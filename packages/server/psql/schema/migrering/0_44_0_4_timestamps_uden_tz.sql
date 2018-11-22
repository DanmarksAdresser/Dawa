DROP VIEW IF EXISTS adgangsadresserview CASCADE;
DROP VIEW IF EXISTS wms_adgangsadresser CASCADE;
DROP VIEW IF EXISTS wfs_adgangsadresser CASCADE;
ALTER TABLE enhedsadresser ALTER COLUMN oprettet TYPE timestamp without time zone USING (oprettet at time zone 'UTC'):: timestamp without time zone;
ALTER TABLE enhedsadresser ALTER COLUMN aendret TYPE timestamp without time zone USING (aendret at time zone 'UTC'):: timestamp without time zone;
ALTER TABLE enhedsadresser ALTER COLUMN ikraftfra TYPE timestamp without time zone USING (ikraftfra at time zone 'UTC'):: timestamp without time zone;
ALTER TABLE adgangsadresser ALTER COLUMN oprettet TYPE timestamp without time zone USING (oprettet at time zone 'UTC'):: timestamp without time zone;
ALTER TABLE adgangsadresser ALTER COLUMN aendret TYPE timestamp without time zone USING (aendret at time zone 'UTC'):: timestamp without time zone;
ALTER TABLE adgangsadresser ALTER COLUMN ikraftfra TYPE timestamp without time zone USING (ikraftfra at time zone 'UTC'):: timestamp without time zone;
ALTER TABLE adgangsadresser ALTER COLUMN adressepunktaendringsdato TYPE timestamp without time zone USING (adressepunktaendringsdato at time zone 'UTC'):: timestamp without time zone;
ALTER TABLE vejstykker ALTER COLUMN oprettet TYPE timestamp without time zone USING (oprettet at time zone 'UTC'):: timestamp without time zone;
ALTER TABLE vejstykker ALTER COLUMN aendret TYPE timestamp without time zone USING (aendret at time zone 'UTC'):: timestamp without time zone;

ALTER TABLE enhedsadresser_history ALTER COLUMN oprettet TYPE timestamp without time zone USING (oprettet at time zone 'UTC'):: timestamp without time zone;
ALTER TABLE enhedsadresser_history ALTER COLUMN aendret TYPE timestamp without time zone USING (aendret at time zone 'UTC'):: timestamp without time zone;
ALTER TABLE enhedsadresser_history ALTER COLUMN ikraftfra TYPE timestamp without time zone USING (ikraftfra at time zone 'UTC'):: timestamp without time zone;
ALTER TABLE adgangsadresser_history ALTER COLUMN oprettet TYPE timestamp without time zone USING (oprettet at time zone 'UTC'):: timestamp without time zone;
ALTER TABLE adgangsadresser_history ALTER COLUMN aendret TYPE timestamp without time zone USING (aendret at time zone 'UTC'):: timestamp without time zone;
ALTER TABLE adgangsadresser_history ALTER COLUMN ikraftfra TYPE timestamp without time zone USING (ikraftfra at time zone 'UTC'):: timestamp without time zone;
ALTER TABLE adgangsadresser_history ALTER COLUMN adressepunktaendringsdato TYPE timestamp without time zone USING (adressepunktaendringsdato at time zone 'UTC'):: timestamp without time zone;
ALTER TABLE vejstykker_history ALTER COLUMN oprettet TYPE timestamp without time zone USING (oprettet at time zone 'UTC'):: timestamp without time zone;
ALTER TABLE vejstykker_history ALTER COLUMN aendret TYPE timestamp without time zone USING (aendret at time zone 'UTC'):: timestamp without time zone;

