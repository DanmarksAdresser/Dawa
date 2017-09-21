DROP VIEW IF EXISTS dar1_navngivenvej_view CASCADE;
CREATE VIEW dar1_navngivenvej_view AS
  SELECT
    n.id,
    n.status as darstatus,
    (SELECT min(lower(virkning) at time zone 'Europe/Copenhagen')
     FROM dar1_navngivenvej_history nh
     WHERE nh.id = n.id) AS oprettet,
    lower(n.virkning) AT TIME ZONE 'Europe/Copenhagen' AS ændret,
    COALESCE(n.vejnavn, '') as navn,
    COALESCE(n.vejadresseringsnavn, '') as adresseringsnavn,
    administreresafkommune,
    beskrivelse,
    retskrivningskontrol,
    udtaltvejnavn
  FROM dar1_navngivenvej_current n
  WHERE n.status IN (2,3);

DROP VIEW IF EXISTS dar1_navngivenvej_dirty_view CASCADE;
CREATE VIEW dar1_navngivenvej_dirty_view AS
  SELECT
    n.id as id,
    n.id as navngivenvej_id
  FROM dar1_navngivenvej_current n
  WHERE  n.status IN (2,3);
