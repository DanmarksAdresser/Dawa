CREATE TEMP VIEW full_vejstykker AS SELECT * FROM dar_vejstykker_view;

-- Create a temp table based on a simple join with the simple adgangsadresse columns
CREATE TEMP TABLE dar_adgangsadresser_core AS SELECT * FROM dar_adgangsadresser_core_view;

CREATE TEMP TABLE  full_adgangsadresser AS
  SELECT
    hn_bkid as id,
    ap_kommunenummer AS kommunekode,
    hn_vejkode as vejkode,
    hn_husnummer as husnr,
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
               (SELECT lower(ap2.virkning) at time zone 'Europe/Copenhagen'
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
FROM dar_adgangsadresser_core;

CREATE TEMP TABLE full_enhedsadresser AS
    SELECT
      adr.bkid as id,
      adg_core.hn_bkid as adgangsadresseid,
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
    JOIN dar_adgangsadresser_core adg_core ON adg_core.hn_id = adr.husnummerid
    AND adr.statuskode <> 2 AND adr.statuskode <> 4;
