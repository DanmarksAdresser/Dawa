DROP VIEW IF EXISTS dar_supplerendebynavn_current CASCADE;
CREATE VIEW dar_supplerendebynavn_current AS
  SELECT * FROM dar_supplerendebynavn WHERE upper_inf(registrering) AND ophoerttimestamp IS NULL;