DROP VIEW IF EXISTS dar_adgangspunkt_current CASCADE;
CREATE VIEW dar_adgangspunkt_current AS
  SELECT * FROM dar_adgangspunkt WHERE upper_inf(registrering) AND CURRENT_TIMESTAMP <@ virkning;