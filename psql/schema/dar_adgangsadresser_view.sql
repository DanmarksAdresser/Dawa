
DROP VIEW IF EXISTS dar_adgangsadresser_view CASCADE;
CREATE VIEW dar_adgangsadresser_view AS
  SELECT
    hn.bkid as id,
    ap.kommunenummer AS kommunekode,
    hn.vejkode,
    (hn.husnummer).tal || COALESCE((hn.husnummer).bogstav, '') as husnr,
    sb.bynavn as supplerendebynavn,
    pn.postdistriktnummer AS postnr,
    null::integer as ejerlavkode,
    null::text as matrikelnr,
    null::integer as esrejendomsnr,
    hn.statuskode as objekttype,
    (SELECT min(lower(virkning) at time zone 'Europe/Copenhagen')
     FROM dar_husnummer_current hn2
     WHERE hn.id = hn2.id) AS oprettet,
    hn.ikrafttraedelsesdato  at time zone 'Europe/Copenhagen' AS ikraftfra,
    lower(hn.virkning) at time zone 'Europe/Copenhagen' as aendret,
    ap.bkid as adgangspunktid,
    ST_X(ap.geom) as etrs89oest,
    ST_Y(ap.geom) as etrs89nord,
    ap.noejagtighedsklasse as noejagtighed,
    ap.kildekode as adgangspunktkilde,
    hn.kildekode as husnummerkilde,
    ap.placering,
    ap.tekniskstandard,
    ap.retning as tekstretning,
    ap.revisionsdato AS adressepunktaendringsdato,
    ap.esdhreference AS esdhreference,
    ap.journalnummer AS journalnummer,
    ap.geom as geom
  FROM dar_husnummer_current hn
    JOIN dar_adgangspunkt_current ap
      ON hn.adgangspunktid = ap.id
    LEFT JOIN dar_supplerendebynavn_current sb
      ON ap.kommunenummer = sb.kommunekode
         AND hn.vejkode = sb.vejkode
         AND sb.side = (CASE WHEN (hn.husnummer).tal % 2 = 0 THEN 'L'
                        ELSE 'U' END)
         AND hn.husnummer <@ sb.husnrinterval
         AND sb.ophoerttimestamp IS NULL
    LEFT JOIN dar_postnr_current pn
      ON ap.kommunenummer = pn.kommunekode
         AND hn.vejkode = pn.vejkode
         AND pn.side = (CASE WHEN (hn.husnummer).tal % 2 = 0 THEN 'L'
                        ELSE 'U' END)
         AND hn.husnummer <@ pn.husnrinterval
         AND pn.ophoerttimestamp IS NULL;