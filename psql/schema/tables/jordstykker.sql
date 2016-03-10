DROP MATERIALIZED VIEW IF EXISTS jordstykker;
CREATE MATERIALIZED VIEW jordstykker AS
  (SELECT
     id,
     (fields->>'ejerlavkode')::integer as ejerlavkode,
     (fields->>'matrikelnr')::text as matrikelnr
   FROM temaer WHERE tema = 'jordstykke');

CREATE UNIQUE INDEX ON jordstykker(ejerlavkode, matrikelnr);
CREATE INDEX ON jordstykker(matrikelnr);

ALTER TABLE jordstykker ALTER COLUMN matrikelnr SET STATISTICS 10000;
