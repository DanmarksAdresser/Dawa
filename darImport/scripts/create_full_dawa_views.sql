CREATE TEMP VIEW full_vejstykker_view AS SELECT * FROM dar_vejstykker_view;

-- Create a temp table based on a simple join with the simple adgangsadresse columns
CREATE TEMP TABLE dar_adgangsadresser_core AS SELECT * FROM dar_adgangsadresser_core_view;

CREATE TEMP VIEW  full_adgangsadresser_view AS
  SELECT
    hn_bkid as id,
    ap_kommunenummer AS kommunekode,
    hn_vejkode,
    (hn_husnummer).tal || COALESCE((hn_husnummer).bogstav, '') as husnr,
    (SELECT bynavn FROM dar_supplerendebynavn sb WHERE
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
               (SELECT lower(ap2.virkning) at time zone 'Europe/Copenhagen'
                FROM dar_adgangspunkt_current ap2
                WHERE ap2.id = ap_id)) as aendret,
    ap_bkid as adgangspunktid,
    ST_X(ap_geom) as etrs89oest,
    ST_Y(ap_geom) as etrs89nord,
    ap_noejagtighedsklasse as noejagtighed,
    ap_kildekode as adgangspunktkilde,
    hn_kildekode as husnummerkilde,
    ap_placering,
    ap_tekniskstandard,
    ap_retning as tekstretning,
    ap_revisionsdato at time zone 'Europe/Copenhagen' AS adressepunktaendringsdato,
    ap_esdhreference AS esdhreference,
    ap_journalnummer AS journalnummer,
    ap_geom as geom
FROM dar_adgangsadresser_core;

CREATE TEMP VIEW full_enhedsadresser_view AS
    SELECT
      adr.bkid as id,
      (SELECT bkid FROM dar_husnummer_current WHERE id = adr.husnummerid) AS adgangsadresseid,
      adr.statuskode AS objekttype,
      LEAST((SELECT min(lower(virkning) at time zone 'Europe/Copenhagen')
       FROM dar_adresse adr2
       WHERE adr.id = adr2.id), (
       SELECT oprettet
        FROM enhedsadresser
         WHERE enhedsadresser.id = adr.bkid
       )) AS oprettet,
      adr.ikrafttraedelsesdato AT TIME ZONE 'Europe/Copenhagen' AS ikraftfra,
      lower(adr.virkning) AT TIME ZONE 'Europe/Copenhagen' AS aendret,
      adr.etagebetegnelse AS etage,
      adr.doerbetegnelse AS doer,
      adr.kildekode as kilde,
      adr.esdhreference,
      adr.journalnummer
    FROM dar_adresse_current adr
    WHERE adr.husnummerid IN (SELECT hn_id FROM dar_adgangsadresser_core)
    AND adr.statuskode <> 2 AND adr.statuskode <> 4;
