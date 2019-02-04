DROP VIEW IF EXISTS supplerendebynavn2_postnr_view CASCADE;

CREATE VIEW supplerendebynavn2_postnr_view AS
  (select distinct supplerendebynavn1 as supplerendebynavn_dagi_id, postnr
  FROM dar1_supplerendebynavn_current sb
    JOIN dar1_husnummer_current hn ON hn.supplerendebynavn_id = sb.id AND hn.status IN (2,3)
    JOIN dar1_postnummer_current p ON p.id = hn.postnummer_id AND p.status IN (2,3)
  WHERE supplerendebynavn1 is not null and sb.status IN (2,3));