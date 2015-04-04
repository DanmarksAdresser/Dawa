DROP VIEW IF EXISTS dar_vejnavn_current CASCADE;
CREATE VIEW dar_vejnavn_current AS
  SELECT * FROM dar_vejnavn WHERE upper_inf(registrering);