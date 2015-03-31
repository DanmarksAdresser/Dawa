  DROP VIEW IF EXISTS dar_enhedsadresser_view CASCADE;
  CREATE VIEW dar_enhedsadresser_view AS
    SELECT
      adr.bkid as id,
      (SELECT bkid FROM dar_husnummer WHERE upper_inf(registrering) AND upper_inf(virkning) AND id = adr.husnummerid) AS adgangsadresseid,
      adr.statuskode AS objekttype,
      (SELECT min(lower(virkning) at time zone 'Europe/Copenhagen')
       FROM dar_adresse adr2
       WHERE upper_inf(adr2.registrering)
             AND adr.id = adr2.id
             AND upper_inf(adr2.virkning)) AS oprettet,
      adr.ikrafttraedelsesdato AT TIME ZONE 'Europe/Copenhagen' AS ikraftfra,
      lower(adr.virkning) AT TIME ZONE 'Europe/Copenhagen' AS aendret,
      adr.etagebetegnelse AS etage,
      adr.doerbetegnelse AS doer
    FROM dar_adresse adr
    WHERE upper_inf(adr.registrering) AND upper_inf(adr.virkning);

