DROP VIEW IF EXISTS dar_postnr_current CASCADE;
CREATE VIEW dar_postnr_current AS
  SELECT * FROM dar_postnr WHERE upper_inf(registrering) and ophoerttimestamp IS NULL;