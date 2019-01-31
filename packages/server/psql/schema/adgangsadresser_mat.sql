DROP VIEW IF EXISTS adgangsadresser_mat_view CASCADE;

CREATE VIEW adgangsadresser_mat_view AS
  SELECT
    hn.id,
    k.kommunekode,
    nvk.vejkode,
    hn.husnummertekst                AS husnr,
    sb.navn                           AS supplerendebynavn,
    p.postnr,
    hn.status,
    (SELECT min(lower(virkning) AT TIME ZONE 'Europe/Copenhagen')
     FROM dar1_husnummer_history hn2
     WHERE hn.id = hn2.id)
                                     AS oprettet,
    (SELECT min(lower(virkning) AT TIME ZONE 'Europe/Copenhagen')
     FROM dar1_husnummer_history hn2
     WHERE hn.id = hn2.id and hn2.status = 3) as ikraftfra,
    (SELECT min(lower(virkning) AT TIME ZONE 'Europe/Copenhagen')
     FROM dar1_husnummer_history hn2
     WHERE hn.id = hn2.id and hn2.status  in (4,5)) as nedlagt,
    GREATEST((SELECT max(lower(ap2.virkning)) AT TIME ZONE 'Europe/Copenhagen'
              FROM dar1_adressepunkt_history ap2
              WHERE ap2.id = hn.adgangspunkt_id AND lower(ap2.virkning) <= (SELECT virkning
                                                                            FROM dar1_meta)),
             (SELECT max(lower(hn2.virkning)) AT TIME ZONE 'Europe/Copenhagen'
              FROM dar1_husnummer_history hn2
              WHERE hn.id = hn2.id AND lower(hn2.virkning) <= (SELECT virkning
                                                               FROM dar1_meta)))
                                     AS aendret,
    hn.adgangspunkt_id               AS adgangspunktid,
    hn.vejpunkt_id,
    ST_X(ap.position)                AS etrs89oest,
    ST_Y(ap.position)                AS etrs89nord,
    ap.oprindelse_nøjagtighedsklasse AS noejagtighed,
    CASE ap.oprindelse_kilde
    WHEN 'Grundkort'
      THEN 1
    WHEN 'Matrikelkort'
      THEN 2
    WHEN 'Ekstern'
      THEN 4
    WHEN 'Adressemyn'
      THEN 5 END                     AS adgangspunktkilde,
    ap.oprindelse_tekniskstandard    AS tekniskstandard,
    200 - (atan2(ST_Y(hn.husnummerretning), ST_X(hn.husnummerretning)) *
           400 / (2 * pi()))         AS tekstretning,
    ap.oprindelse_registrering AT TIME ZONE
    'Europe/Copenhagen'              AS adressepunktaendringsdato,
    nv.id                            AS navngivenvej_id,
    nvk.id                           AS navngivenvejkommunedel_id,

    sb.id                             AS supplerendebynavn_id,
    k.id                             AS darkommuneinddeling_id,
    ap.id                            AS adressepunkt_id,
    p.id                             AS postnummer_id,
    p.navn AS postnrnavn,
    nv.vejnavn,
    nv.vejadresseringsnavn as adresseringsvejnavn,
    S.nr AS stormodtagerpostnr,
    S.navn AS stormodtagerpostnrnavn,
    sb.supplerendebynavn1             AS supplerendebynavn_dagi_id,
    ap.position                      AS geom,
    vp.position AS vejpunkt_geom,
    vp.oprindelse_kilde AS vejpunkt_kilde,
    vp.oprindelse_nøjagtighedsklasse AS vejpunkt_noejagtighedsklasse,
    vp.oprindelse_tekniskstandard AS vejpunkt_tekniskstandard,
    vp.oprindelse_registrering AT TIME ZONE 'Europe/Copenhagen' as vejpunkt_ændret,
    H.hoejde

  FROM dar1_husnummer_current hn
    JOIN dar1_darkommuneinddeling_current k
      ON hn.darkommune_id = k.id
    JOIN dar1_navngivenvej_current nv
      ON hn.navngivenvej_id = nv.id
    JOIN dar1_navngivenvejkommunedel_current nvk
      ON nv.id = nvk.navngivenvej_id AND
         k.kommunekode = nvk.kommune
    JOIN dar1_postnummer_current p
      ON hn.postnummer_id = p.id
    LEFT JOIN dar1_supplerendebynavn_current sb
      ON hn.supplerendebynavn_id = sb.id
    LEFT JOIN dar1_adressepunkt_current ap
      ON hn.adgangspunkt_id = ap.id
    LEFT JOIN dar1_darsogneinddeling_current ds ON hn.darsogneinddeling_id = ds.id
    LEFT JOIN dar1_darafstemningsområde_current ao ON hn.darafstemningsområde_id = ao.id
    LEFT JOIN dar1_darmenighedsrådsafstemningsområde_current mr
      ON hn.darmenighedsrådsafstemningsområde_id = mr.id
    LEFT JOIN dar1_adressepunkt_current vp ON hn.vejpunkt_id = vp.id
    LEFT JOIN stormodtagere AS S ON hn.id = S.adgangsadresseid
    LEFT JOIN hoejder H ON hn.id = H.husnummerid;