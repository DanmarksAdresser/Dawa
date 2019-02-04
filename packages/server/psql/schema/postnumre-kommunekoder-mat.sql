DROP VIEW IF EXISTS postnumre_kommunekoder_mat_view;
CREATE VIEW postnumre_kommunekoder_mat_view AS(
    SELECT DISTINCT kommunekode,postnr FROM
      dar1_DARKommuneinddeling_current k
  JOIN dar1_Husnummer_current hn ON k.id = hn.darkommune_id AND hn.status IN (2,3)
  JOIN dar1_Postnummer_current p ON hn.postnummer_id = p.id AND p.status IN (2,3)
  WHERE k.status IN (2,3) AND kommunekode IS NOT NULL AND postnr IS NOT NULL
);