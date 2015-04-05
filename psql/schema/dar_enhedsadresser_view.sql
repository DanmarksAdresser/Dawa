  DROP VIEW IF EXISTS dar_enhedsadresser_view CASCADE;
  CREATE VIEW dar_enhedsadresser_view AS
    SELECT
      adr.bkid as id,
      (SELECT bkid FROM dar_husnummer_current WHERE id = adr.husnummerid) AS adgangsadresseid,
      adr.statuskode AS objekttype,
      (SELECT min(lower(virkning) at time zone 'Europe/Copenhagen')
       FROM dar_adresse_current adr2
       WHERE adr.id = adr2.id) AS oprettet,
      adr.ikrafttraedelsesdato AT TIME ZONE 'Europe/Copenhagen' AS ikraftfra,
      lower(adr.virkning) AT TIME ZONE 'Europe/Copenhagen' AS aendret,
      adr.etagebetegnelse AS etage,
      adr.doerbetegnelse AS doer,
      adr.kildekode as kilde,
      adr.esdhreference,
      adr.journalnummer
    FROM dar_adresse_current adr;

