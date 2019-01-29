DROP VIEW IF EXISTS navngivenvej_mat_view CASCADE;
CREATE VIEW navngivenvej_mat_view AS
  SELECT
    n.id,
    n.status                                                                        AS darstatus,
    (SELECT min(lower(virkning))
     FROM dar1_navngivenvej_history nh
     WHERE nh.id = n.id)                                                            AS oprettet,
    (SELECT min(lower(virkning))
     FROM dar1_navngivenvej_history nh
     WHERE nh.id = n.id AND status =
                            3)                                                      AS ikrafttrædelse,
    (SELECT min(lower(virkning))
     FROM dar1_navngivenvej_history nh
     WHERE nh.id = n.id AND status IN (4, 5))                                       AS nedlagt,
    (SELECT MAX(lower(virkning))
     FROM dar1_navngivenvej_history nh
     WHERE nh.id = n.id AND lower(virkning) <= (SELECT virkning
                                                FROM dar1_meta))                    AS ændret,
    COALESCE(n.vejnavn, '')                                                         AS navn,
    COALESCE(n.vejadresseringsnavn,
             '')                                                                    AS adresseringsnavn,
    administreresafkommune                                                          AS administrerendekommune,
    beskrivelse,
    retskrivningskontrol,
    udtaltvejnavn,
    vejnavnebeliggenhed_oprindelse_kilde                                            AS beliggenhed_oprindelse_kilde,
    vejnavnebeliggenhed_oprindelse_nøjagtighedsklasse                               AS beliggenhed_oprindelse_nøjagtighedsklasse,
    vejnavnebeliggenhed_oprindelse_registrering                                     AS beliggenhed_oprindelse_registrering,
    vejnavnebeliggenhed_oprindelse_tekniskstandard                                  AS beliggenhed_oprindelse_tekniskstandard,
    vejnavnebeliggenhed_vejnavnelinje                                               AS beliggenhed_vejnavnelinje,
    vejnavnebeliggenhed_vejnavneområde                                              AS beliggenhed_vejnavneområde,
    vejnavnebeliggenhed_vejtilslutningspunkter                                      AS beliggenhed_vejtilslutningspunkter,
    COALESCE(vejnavnebeliggenhed_vejnavnelinje, vejnavnebeliggenhed_vejnavneområde) AS geom
  FROM dar1_navngivenvej_current n;