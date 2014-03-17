
\set ON_ERROR_STOP on
\set ECHO queries

DROP VIEW IF EXISTS vejstykkerPostnr;
CREATE VIEW vejstykkerPostnr AS SELECT DISTINCT vejkode, kommunekode, postnr FROM AdgangsAdresser;
