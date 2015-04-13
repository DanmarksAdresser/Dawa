
DROP VIEW IF EXISTS dar_adgangsadresser_view CASCADE;
CREATE VIEW dar_adgangsadresser_view AS
  SELECT distinct on(id)
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
    LEAST((SELECT min(lower(virkning) at time zone 'Europe/Copenhagen')
     FROM dar_husnummer hn2
     WHERE hn.id = hn2.id),
     (SELECT oprettet
      FROM adgangsadresser
      WHERE hn.bkid = adgangsadresser.id)) AS oprettet,
    hn.ikrafttraedelsesdato  at time zone 'Europe/Copenhagen' AS ikraftfra,
    GREATEST  (lower(hn.virkning) at time zone 'Europe/Copenhagen',
    (SELECT lower(ap2.virkning) at time zone 'Europe/Copenhagen'
     FROM dar_adgangspunkt_current ap2
      WHERE ap2.id = hn.adgangspunktid)) as aendret,
    ap.bkid as adgangspunktid,
    ST_X(ap.geom) as etrs89oest,
    ST_Y(ap.geom) as etrs89nord,
    ap.noejagtighedsklasse as noejagtighed,
    ap.kildekode as adgangspunktkilde,
    hn.kildekode as husnummerkilde,
    ap.placering,
    ap.tekniskstandard,
    ap.retning as tekstretning,
    ap.revisionsdato at time zone 'Europe/Copenhagen' AS adressepunktaendringsdato,
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
    LEFT JOIN dar_postnr_current pn
      ON ap.kommunenummer = pn.kommunekode
         AND hn.vejkode = pn.vejkode
         AND pn.side = (CASE WHEN (hn.husnummer).tal % 2 = 0 THEN 'L'
                        ELSE 'U' END)
         AND hn.husnummer <@ pn.husnrinterval
  WHERE hn.statuskode <>2 AND hn.statuskode <> 4;