DROP VIEW IF EXISTS dar1_enhedsadresser_view CASCADE;
CREATE VIEW dar1_enhedsadresser_view AS
  SELECT
    adr.id,
    adr.husnummer_id AS adgangsadresseid,
    dar1_status_til_dawa_status(adr.status) as objekttype,

    LEAST((SELECT min(lower(virkning) at time zone 'Europe/Copenhagen')
           FROM dar1_adresse_history adr2
           WHERE adr.id = adr2.id), (
            SELECT oprettet
            FROM enhedsadresser
            WHERE enhedsadresser.id = adr.id
          )) AS oprettet,
    lower(adr.virkning) AT TIME ZONE 'Europe/Copenhagen' AS aendret,
    lower(adr.etagebetegnelse) AS etage,
    lower(adr.dørbetegnelse) AS doer
  FROM dar1_adresse_current adr
    JOIN dar1_husnummer_current hn on hn.id = adr.husnummer_id
    JOIN dar1_darkommuneinddeling_current k
      ON hn.darkommune_id = k.id
    JOIN dar1_navngivenvej_current nv
      ON hn.navngivenvej_id = nv.id
    JOIN dar1_navngivenvejkommunedel_current nvk
      ON nv.id = nvk.navngivenvej_id AND
         k.kommunekode = nvk.kommune
  WHERE dar1_status_til_dawa_status(adr.status) IN (1,3);

DROP VIEW IF EXISTS dar1_enhedsadresser_dirty_view CASCADE;
CREATE VIEW dar1_enhedsadresser_dirty_view AS
  SELECT
    adr.id as id,
    adr.id as adresse_id,
    hn.id  AS husnummer_id,
    k.id   AS darkommuneinddeling_id,
    nv.id  AS navngivenvej_id,
    nvk.id AS navngivenvejkommunedel_id

  FROM dar1_adresse_current adr
    JOIN dar1_husnummer_current hn on hn.id = adr.husnummer_id
    JOIN dar1_darkommuneinddeling_current k
      ON hn.darkommune_id = k.id
    JOIN dar1_navngivenvej_current nv
      ON hn.navngivenvej_id = nv.id
    JOIN dar1_navngivenvejkommunedel_current nvk
      ON nv.id = nvk.navngivenvej_id AND
         k.kommunekode = nvk.kommune
  WHERE  dar1_status_til_dawa_status(adr.status) IN (1,3);

