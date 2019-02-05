DROP VIEW IF EXISTS adresser_mat_view CASCADE;

CREATE VIEW adresser_mat_view AS
  SELECT
    e.id,
    e.husnummer_id                                AS adgangsadresseid,
    e.status,
    (SELECT min(lower(virkning) AT TIME ZONE 'Europe/Copenhagen')
     FROM dar1_adresse_history adr2
     WHERE e.id = adr2.id)                        AS oprettet,
    (SELECT min(lower(virkning) AT TIME ZONE 'Europe/Copenhagen')
     FROM dar1_adresse_history adr2
     WHERE e.id = adr2.id AND e.status = 3)       AS ikraftfra,
    (SELECT min(lower(virkning) AT TIME ZONE 'Europe/Copenhagen')
     FROM dar1_adresse_history adr2
     WHERE e.id = adr2.id AND e.status IN (4, 5)) AS nedlagt,
    (SELECT MAX(lower(virkning)) AT TIME ZONE 'Europe/Copenhagen'
     FROM dar1_adresse_history h
     WHERE h.id = e.id AND lower(virkning) <= (SELECT virkning
                                               FROM dar1_meta))
                                                  AS aendret,
    lower(e.etagebetegnelse)                      AS etage,
    lower(e.dørbetegnelse)                        AS doer,
    a.status                                      AS a_status,
    a.oprettet                                    AS a_oprettet,
    a.aendret                                     AS a_aendret,
    a.ikraftfra                                   AS a_ikraftfra,
    a.nedlagt                                     AS a_nedlagt,
    a.kommunekode,
    a.vejkode,
    a.husnr                                          husnr,
    a.supplerendebynavn,
    a.supplerendebynavn_dagi_id,
    a.postnr,
    a.adgangspunktid,
    a.etrs89oest,
    a.etrs89nord,
    a.noejagtighed,
    a.adgangspunktkilde,
    a.tekniskstandard,
    a.tekstretning,
    a.adressepunktaendringsdato,
    a.geom,
    a.hoejde,
    a.navngivenvej_id,
    a.navngivenvejkommunedel_id,
    a.supplerendebynavn_id,
    a.darkommuneinddeling_id,
    a.postnummer_id,
    a.postnrnavn,
    a.vejnavn,
    a.adresseringsvejnavn,
    a.stormodtagerpostnr,
    a.stormodtagerpostnrnavn,
    a.vejpunkt_id,
    a.vejpunkt_kilde,
    a.vejpunkt_tekniskstandard,
    a.vejpunkt_noejagtighedsklasse,
    a.vejpunkt_ændret,
    a.vejpunkt_geom

  FROM dar1_adresse_current e
    JOIN adgangsadresser_mat a ON e.husnummer_id = a.id;
