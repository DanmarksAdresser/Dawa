DROP VIEW IF EXISTS dar1_navngivenvej_view CASCADE;
CREATE VIEW dar1_navngivenvej_view AS
  SELECT
    n.id,
    n.status as darstatus,
    (SELECT min(lower(virkning))
     FROM dar1_navngivenvej_history nh
     WHERE nh.id = n.id) AS oprettet,
    (SELECT MAX(lower(virkning))
     FROM dar1_navngivenvej_history nh
     WHERE nh.id = n.id) AS ændret,
    COALESCE(n.vejnavn, '') as navn,
    COALESCE(n.vejadresseringsnavn, '') as adresseringsnavn,
    administreresafkommune as administrerendekommune,
    beskrivelse,
    retskrivningskontrol,
    udtaltvejnavn,
    vejnavnebeliggenhed_oprindelse_kilde as beliggenhed_oprindelse_kilde,
    vejnavnebeliggenhed_oprindelse_nøjagtighedsklasse as beliggenhed_oprindelse_nøjagtighedsklasse,
    vejnavnebeliggenhed_oprindelse_registrering as beliggenhed_oprindelse_registrering,
    vejnavnebeliggenhed_oprindelse_tekniskstandard as beliggenhed_oprindelse_tekniskstandard,
    vejnavnebeliggenhed_vejnavnelinje as beliggenhed_vejnavnelinje,
    vejnavnebeliggenhed_vejnavneområde as beliggenhed_vejnavneområde,
    vejnavnebeliggenhed_vejtilslutningspunkter as beliggenhed_vejtilslutningspunkter

  FROM dar1_navngivenvej_current n
  WHERE n.status IN (2,3);