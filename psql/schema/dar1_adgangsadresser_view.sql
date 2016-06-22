DROP VIEW IF EXISTS dar1_adgangsadresser_view;

CREATE VIEW dar1_adgangsadresser_view AS
  SELECT
    hn.id,
    k.kommunekode,
    nvk.vejkode,
    hn.husnummertekst as husnr,
    s.navn AS supplerendebynavn,
    p.postnr,
    hn.status as objekttype,
    LEAST((SELECT min(lower(virkning) at time zone 'Europe/Copenhagen')
           FROM dar1_husnummer hn2
           WHERE hn.id = hn2.id),
          (SELECT oprettet
           FROM adgangsadresser
           WHERE hn.id = adgangsadresser.id)) AS oprettet,
    GREATEST  (lower(hn.virkning) at time zone 'Europe/Copenhagen',
               (SELECT max(lower(ap2.virkning)) at time zone 'Europe/Copenhagen'
                FROM dar1_adressepunkt_current ap2
                WHERE ap2.id = hn.adgangspunkt_id)) as aendret,
    ap.id as adgangspunktid,
    ST_X(ap.position) as etrs89oest,
    ST_Y(ap.position) as etrs89nord,
    ap.oprindelse_nøjagtighedsklasse as noejagtighed,
    ap.oprindelse_kilde as adgangspunktkilde,
    ap.oprindelse_tekniskstandard as tekniskstandard,
    hn.husnummerretning as tekstretning,
    ap.oprindelse_registrering at time zone 'Europe/Copenhagen' as adressepunktaendringsdato,
    ap.position as geom
  FROM dar1_husnummer_current hn
    JOIN dar1_darkommuneinddeling_current k
      ON hn.darkommune_id = k.id
    JOIN dar1_navngivenvej_current nv
      ON hn.navngivenvej_id = nv.id
    JOIN dar1_navngivenvejkommunedel_current nvk
      ON nv.id = nvk.navngivenvej_id AND
         k.kommunekode = nvk.kommune
    JOIN dar1_supplerendebynavn_current s
    ON hn.supplerendebynavn_id = s.id
    JOIN dar1_postnummer_current p
    ON hn.postnummer_id = p.id
    JOIN dar1_adressepunkt_current ap
    ON hn.adgangspunkt_id = ap.id
  WHERE hn.status IN (1, 3);
