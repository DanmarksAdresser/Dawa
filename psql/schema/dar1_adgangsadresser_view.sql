DROP VIEW IF EXISTS dar1_adgangsadresser_view CASCADE;

CREATE VIEW dar1_adgangsadresser_view AS
  SELECT
    hn.id,
    k.kommunekode,
    nvk.vejkode,
    hn.husnummertekst                                               AS husnr,
    s.navn                                                          AS supplerendebynavn,
    p.postnr,
    dar1_status_til_dawa_status(hn.status)
                                                                    AS objekttype,
    (SELECT min(lower(virkning) AT TIME ZONE 'Europe/Copenhagen')
     FROM dar1_husnummer_history hn2
     WHERE hn.id = hn2.id)
                                                                    AS oprettet,
    GREATEST((SELECT max(lower(ap2.virkning)) AT TIME ZONE 'Europe/Copenhagen'
              FROM dar1_adressepunkt_history ap2
              WHERE ap2.id = hn.adgangspunkt_id AND lower(ap2.virkning) <= (SELECT virkning
                                                                            FROM dar1_meta)),
             (SELECT max(lower(hn2.virkning)) AT TIME ZONE 'Europe/Copenhagen'
              FROM dar1_husnummer_history hn2
              WHERE hn.id = hn2.id AND lower(hn2.virkning) <= (SELECT virkning
                                                               FROM dar1_meta)))
                                                                    AS aendret,
    hn.adgangspunkt_id                                              AS adgangspunktid,
    coalesce(ST_X(ap.position),
             aa_old.etrs89oest)                                     AS etrs89oest,
    coalesce(ST_Y(ap.position),
             aa_old.etrs89nord)                                     AS etrs89nord,
    coalesce(ap.oprindelse_nøjagtighedsklasse,
             aa_old.noejagtighed)                                   AS noejagtighed,
    coalesce(CASE ap.oprindelse_kilde
             WHEN 'Grundkort'
               THEN 1
             WHEN 'Matrikelkort'
               THEN 2
             WHEN 'Ekstern'
               THEN 4
             WHEN 'Adressemyn'
               THEN 5 END,
             aa_old.adgangspunktkilde)                              AS adgangspunktkilde,
    coalesce(ap.oprindelse_tekniskstandard,
             aa_old.tekniskstandard)                                AS tekniskstandard,
    coalesce((round((atan2(ST_Y(hn.husnummerretning), ST_X(hn.husnummerretning)) *
                     400 / (2 * pi())) :: NUMERIC, 2) + 200) % 400,
             aa_old.tekstretning)                                   AS tekstretning,
    coalesce(ap.oprindelse_registrering AT TIME ZONE
             'Europe/Copenhagen', aa_old.adressepunktaendringsdato) AS adressepunktaendringsdato,
    nv.id                                                           AS navngivenvej_id,
    nvk.id                                                          AS navngivenvejkommunedel_id,
    s.id                                                            AS supplerendebynavn_id,
    k.id                                                            AS darkommuneinddeling_id,
    ap.id                                                           AS adressepunkt_id,
    p.id                                                            AS postnummer_id,
    ap.position                                                     AS geom
  FROM dar1_husnummer_current hn
    JOIN dar1_darkommuneinddeling_current k
      ON hn.darkommune_id = k.id
    JOIN dar1_navngivenvej_current nv
      ON hn.navngivenvej_id = nv.id
    JOIN dar1_navngivenvejkommunedel_current nvk
      ON nv.id = nvk.navngivenvej_id AND
         k.kommunekode = nvk.kommune
    LEFT JOIN dar1_supplerendebynavn_current s
      ON hn.supplerendebynavn_id = s.id
    JOIN dar1_postnummer_current p
      ON hn.postnummer_id = p.id
    LEFT JOIN dar1_adressepunkt_current ap
      ON hn.adgangspunkt_id = ap.id
    LEFT JOIN adgangsadresser aa_old ON hn.id = aa_old.id
  WHERE dar1_status_til_dawa_status(hn.status) IN (1, 3) AND hn.husnummertekst IS NOT NULL;