
\set ON_ERROR_STOP on
\set ECHO queries

DROP VIEW IF EXISTS PostnumreMini;
CREATE VIEW PostnumreMini AS
  SELECT nr, navn FROM Postnumre;

