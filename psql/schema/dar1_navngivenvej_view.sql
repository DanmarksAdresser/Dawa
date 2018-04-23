DROP VIEW IF EXISTS dar1_navngivenvej_view CASCADE;
CREATE VIEW dar1_navngivenvej_view AS
  SELECT
    n.id,
    n.status as darstatus,
    (SELECT min(lower(virkning) at time zone 'Europe/Copenhagen')
     FROM dar1_navngivenvej_history nh
     WHERE nh.id = n.id) AS oprettet,
    (SELECT MAX(lower(virkning) at time zone 'Europe/Copenhagen')
     FROM dar1_navngivenvej_history nh
     WHERE nh.id = n.id) AS ændret,
    COALESCE(n.vejnavn, '') as navn,
    COALESCE(n.vejadresseringsnavn, '') as adresseringsnavn,
    administreresafkommune,
    beskrivelse,
    retskrivningskontrol,
    udtaltvejnavn
  FROM dar1_navngivenvej_current n
  WHERE n.status IN (2,3);