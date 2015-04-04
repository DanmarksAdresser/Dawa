DROP VIEW IF EXISTS dar_husnummer_current CASCADE;
CREATE VIEW dar_husnummer_current AS
  SELECT * FROM dar_husnummer WHERE upper_inf(registrering) AND CURRENT_TIMESTAMP <@ virkning;