DROP VIEW IF EXISTS vejstykkerPostnr;
CREATE VIEW vejstykkerPostnr AS SELECT DISTINCT vejkode, kommunekode, postnr FROM AdgangsAdresser;
