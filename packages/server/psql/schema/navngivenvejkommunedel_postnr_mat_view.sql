DROP VIEW IF EXISTS navngivenvejkommunedel_postnr_mat_view CASCADE;
CREATE VIEW navngivenvejkommunedel_postnr_mat_view AS
  ((SELECT DISTINCT nvk.id as navngivenvejkommunedel_id, postnummer_id
  FROM dar1_husnummer_current hn
    JOIN dar1_darkommuneinddeling_current k ON hn.darkommune_id = k.id
    JOIN dar1_navngivenvejkommunedel_current nvk ON nvk.navngivenvej_id = hn.navngivenvej_id
    AND k.kommunekode = nvk.kommune
   )
      UNION
      (WITH intersecting AS (
          SELECT DISTINCT nvk.id as navngivenvejkommunedel_id, postnr
          FROM navngivenvejkommunedel_mat nvk JOIN LATERAL (
              select nr as postnr FROM dagi_postnumre_divided p
              where st_intersects(st_force2d(nvk.geom), p.geom)) t  ON true)
       SELECT navngivenvejkommunedel_id, dar_p.id as postnummer_id
       FROM intersecting JOIN navngivenvejkommunedel_mat nvk ON intersecting.navngivenvejkommunedel_id = nvk.ID
                         JOIN dagi_postnumre p ON postnr = p.nr
      JOIN dar1_postnummer_current dar_p ON p.nr = dar_p.postnr
       WHERE st_length(st_intersection(st_force2d(nvk.geom), p.geom)) > 7));