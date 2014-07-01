DROP VIEW IF EXISTS adgangsadresserview CASCADE;
ALTER TABLE Adgangsadresser ALTER COLUMN adressepunktaendringsdato TYPE date, ALTER COLUMN ikraftfra TYPE date;
ALTER TABLE Enhedsadresser ALTER COLUMN ikraftfra TYPE date;