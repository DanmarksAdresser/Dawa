DROP VIEW IF EXISTS dar_adresse_current CASCADE;
CREATE VIEW dar_adresse_current AS
  SELECT * FROM dar_adresse WHERE upper_inf(registrering) AND CURRENT_TIMESTAMP <@ virkning;