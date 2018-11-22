  DROP VIEW IF EXISTS dar_enhedsadresser_view CASCADE;
  CREATE VIEW dar_enhedsadresser_view AS
    SELECT
      adr.bkid as id,
      (SELECT bkid FROM dar_husnummer_current WHERE id = adr.husnummerid) AS adgangsadresseid,
      adr.statuskode AS objekttype,
      LEAST((SELECT min(lower(virkning) at time zone 'Europe/Copenhagen')
       FROM dar_adresse adr2
       WHERE adr.id = adr2.id), (
       SELECT oprettet
        FROM enhedsadresser
         WHERE enhedsadresser.id = adr.bkid
       )) AS oprettet,
      adr.ikrafttraedelsesdato AT TIME ZONE 'Europe/Copenhagen' AS ikraftfra,
      lower(adr.virkning) AT TIME ZONE 'Europe/Copenhagen' AS aendret,
      adr.etagebetegnelse AS etage,
      adr.doerbetegnelse AS doer,
      adr.kildekode as kilde,
      adr.esdhreference,
      adr.journalnummer
    FROM dar_adresse_current adr
    WHERE adr.husnummerid IN (SELECT hn_id FROM dar_adgangsadresser_core_view)
    AND adr.statuskode <> 2 AND adr.statuskode <> 4;

