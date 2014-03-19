
\set ON_ERROR_STOP on
\set ECHO queries

INSERT INTO SupplerendeBynavne(supplerendebynavn, kommunekode, postnr)
  SELECT DISTINCT supplerendebynavn, kommunekode, postnr FROM AdgangsAdresser
  WHERE supplerendebynavn IS NOT NULL and kommunekode IS NOT NULL and postnr IS NOT NULL;

UPDATE SupplerendeBynavne SET tsv = to_tsvector('danish', supplerendebynavn);
