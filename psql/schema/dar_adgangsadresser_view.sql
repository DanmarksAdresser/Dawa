
DROP VIEW IF EXISTS dar_adgangsadresser_view CASCADE;
CREATE VIEW dar_adgangsadresser_view AS
  SELECT
    hn.id,
    ap.kommunenummer AS kommunekode,
    hn.vejkode,
    (hn.husnummer).tal || COALESCE((hn.husnummer).bogstav, ''),
    sb.bynavn,
    pn.postdistriktnummer AS postnr,
    (js.fields->>'esrejendomsnr')::integer as esrejendomsnr,
    hn.statuskode as objekttype,
    (SELECT min(lower(virkning) at time zone 'Europe/Copenhagen')
     FROM dar_housenumber hn2
     WHERE upper_inf(hn2.registrering)
           AND hn.id = hn2.id
           AND upper_inf(hn2.virkning)) AS oprettet,
    hn.ikrafttraedelsesdato  at time zone 'Europe/Copenhagen' AS ikraftfra,
    lower(hn.virkning) at time zone 'Europe/Copenhagen' as aendret,
    ap.id as adgangspunktid,
    ap.noejagtighedsklasse as noejagtighed,
    ap.kildekode as kilde,
    ap.placering,
    ap.tekniskstandard,
    ap.retning as tekstretning,
    ap.revisionsdato AS adressepunktaendringsdato
  FROM dar_housenumber hn
    JOIN dar_accesspoint ap
      ON hn.adgangspunktid = ap.id
         AND upper_inf(ap.registrering)
         AND upper_inf(ap.virkning)
    LEFT JOIN dar_supplerendebynavn sb
      ON ap.kommunenummer = sb.kommunekode
         AND hn.vejkode = sb.vejkode
         AND sb.side = (CASE WHEN (hn.husnummer).tal % 2 = 0 THEN 'L'
                        ELSE 'U' END)
         AND hn.husnummer <@ sb.husnrinterval
         AND upper_inf(sb.registrering)
         AND sb.ophoerttimestamp IS NULL
    LEFT JOIN dar_postnr pn
      ON ap.kommunenummer = pn.kommunekode
         AND hn.vejkode = pn.vejkode
         AND pn.side = (CASE WHEN (hn.husnummer).tal % 2 = 0 THEN 'L'
                        ELSE 'U' END)
         AND hn.husnummer <@ pn.husnrinterval
         AND upper_inf(pn.registrering)
         AND pn.ophoerttimestamp IS NULL
    LEFT JOIN temaer as js
      ON js.tema = 'jordstykke'
         AND ST_Contains(js.geom, ap.geom)
  WHERE upper_inf(hn.registrering) and upper_inf(hn.virkning);
