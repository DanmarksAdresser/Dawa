DROP VIEW IF EXISTS dar_adgangsadresser_core_view;
CREATE VIEW dar_adgangsadresser_core_view AS
  SELECT
    hn.id as hn_id,
    hn.bkid as hn_bkid,
    ap.kommunenummer AS ap_kommunenummer,
    hn.vejkode AS hn_vejkode,
    hn.husnummer AS hn_husnummer,
    hn.statuskode as hn_statuskode,
    hn.ikrafttraedelsesdato  as hn_ikrafttraedelsesdato,
    hn.virkning as hn_virkning,
    ap.id as ap_id,
    ap.bkid as ap_bkid,
    ap.geom as ap_geom,
    ap.noejagtighedsklasse as ap_noejagtighedsklasse,
    ap.kildekode as ap_kildekode,
    hn.kildekode as hn_kildekode,
    ap.placering as ap_placering,
    ap.tekniskstandard as ap_tekniskstandard,
    ap.retning as ap_retning,
    ap.revisionsdato ap_revisionsdato,
    ap.esdhreference AS ap_esdhreference,
    ap.journalnummer AS ap_journalnummer
  FROM dar_husnummer_current hn
    JOIN dar_adgangspunkt_current ap
      ON hn.adgangspunktid = ap.id
  WHERE hn.statuskode <>2 AND hn.statuskode <> 4 AND hn.vejkode IS NOT NULL;

CREATE VIEW dar_adgangsadresser_view AS
  SELECT
    hn_bkid as id,
    ap_kommunenummer AS kommunekode,
    hn_vejkode AS vejkode,
    (hn_husnummer).tal || COALESCE((hn_husnummer).bogstav, '') as husnr,
    (SELECT bynavn FROM dar_supplerendebynavn_current sb WHERE
      ap_kommunenummer = sb.kommunekode
      AND hn_vejkode = sb.vejkode
      AND sb.side = (CASE WHEN (hn_husnummer).tal % 2 = 0 THEN 'L'
                     ELSE 'U' END)
      AND hn_husnummer <@ sb.husnrinterval limit 1) as supplerendebynavn,
    (SELECT postdistriktnummer FROM dar_postnr_current pn WHERE
      ap_kommunenummer = pn.kommunekode
      AND hn_vejkode = pn.vejkode
      AND pn.side = (CASE WHEN (hn_husnummer).tal % 2 = 0 THEN 'L'
                     ELSE 'U' END)
      AND hn_husnummer <@ pn.husnrinterval limit 1) as postnr,
    null::integer as ejerlavkode,
    null::text as matrikelnr,
    null::integer as esrejendomsnr,
    hn_statuskode as objekttype,
    LEAST((SELECT min(lower(virkning) at time zone 'Europe/Copenhagen')
           FROM dar_husnummer hn2
           WHERE hn_id = hn2.id),
          (SELECT oprettet
           FROM adgangsadresser
           WHERE hn_bkid = adgangsadresser.id)) AS oprettet,
    hn_ikrafttraedelsesdato  at time zone 'Europe/Copenhagen' AS ikraftfra,
    GREATEST  (lower(hn_virkning) at time zone 'Europe/Copenhagen',
               (SELECT max(lower(ap2.virkning)) at time zone 'Europe/Copenhagen'
                FROM dar_adgangspunkt_current ap2
                WHERE ap2.id = ap_id)) as aendret,
    ap_bkid as adgangspunktid,
    ST_X(ap_geom) as etrs89oest,
    ST_Y(ap_geom) as etrs89nord,
    ap_noejagtighedsklasse as noejagtighed,
    ap_kildekode as adgangspunktkilde,
    hn_kildekode as husnummerkilde,
    ap_placering as placering,
    ap_tekniskstandard as tekniskstandard,
    ap_retning as tekstretning,
    ap_revisionsdato at time zone 'Europe/Copenhagen' AS adressepunktaendringsdato,
    ap_esdhreference AS esdhreference,
    ap_journalnummer AS journalnummer,
    ap_geom as geom
FROM dar_adgangsadresser_core_view;
