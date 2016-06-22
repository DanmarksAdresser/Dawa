DROP VIEW IF EXISTS dar1_enhedsadresser_view CASCADE;
CREATE VIEW dar1_enhedsadresser_view AS
  SELECT
    adr.id,
    adr.husnummer_id AS adgangsadresseid,
    adr.status as objekttype,

    LEAST((SELECT min(lower(virkning) at time zone 'Europe/Copenhagen')
           FROM dar1_adresse_history adr2
           WHERE adr.id = adr2.id), (
            SELECT oprettet
            FROM enhedsadresser
            WHERE enhedsadresser.id = adr.id
          )) AS oprettet,
    lower(adr.virkning) AT TIME ZONE 'Europe/Copenhagen' AS aendret,
    adr.etagebetegnelse AS etage,
    adr.dørbetegnelse AS doer
  FROM dar1_adresse_current adr
  WHERE adr.husnummer_id IN (SELECT id FROM dar1_adgangsadresser_view)
  AND status IN (1,3);

