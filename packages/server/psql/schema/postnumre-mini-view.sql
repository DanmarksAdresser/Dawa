DROP VIEW IF EXISTS PostnumreMini CASCADE;
CREATE VIEW PostnumreMini AS
  SELECT nr, navn FROM Postnumre;

