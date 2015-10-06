DROP TABLE IF EXISTS vask_adgangsadresser;
CREATE TABLE vask_adgangsadresser (
  id            UUID,
  hn_id         INTEGER,
  ap_statuskode SMALLINT,
  hn_statuskode SMALLINT,
  kommunekode   SMALLINT,
  vejkode       SMALLINT,
  vejnavn       TEXT,
  husnr         husnr,
  supplerendebynavn TEXT,
  postnr        SMALLINT,
  postnrnavn    TEXT,
  virkning      TSTZRANGE,
  exclude using gist(hn_id with =, virkning with &&)
);

CREATE INDEX ON vask_adgangsadresser(id);
CREATE INDEX ON vask_adgangsadresser(postnr);

-- CREATE MATERIALIZED VIEW vask_adgangsadresser AS
--   SELECT DISTINCT
--     hn.bkid               AS id,
--     hn.statuskode,
--     ap.kommunenummer      AS kommunekode,
--     hn.vejkode,
--     vn.navn as vejnavn,
--     hn.husnummer,
--     sb.bynavn             AS supplerendebynavn,
--     pn.postdistriktnummer AS postnr,
--     p.navn                AS postnrnavn,
--     ap.virkning * hn.virkning AS virkning
--   FROM dar_husnummer hn
--     JOIN dar_adgangspunkt ap ON hn.adgangspunktid = ap.id AND hn.virkning && ap.virkning AND upper(ap.registrering) IS NULL
--     JOIN dar_vejnavn_current vn ON ap.kommunenummer = vn.kommunekode AND hn.vejkode = vn.vejkode
--     JOIN dar_postnr_current pn
--       ON ap.kommunenummer = pn.kommunekode
--          AND hn.vejkode = pn.vejkode
--          AND pn.side = (CASE WHEN (hn.husnummer).tal % 2 = 0
--       THEN 'L'
--                         ELSE 'U' END)
--          AND hn.husnummer <@ pn.husnrinterval
--     LEFT JOIN dar_supplerendebynavn_current sb
--       ON ap.kommunenummer = sb.kommunekode
--          AND hn.vejkode = sb.vejkode
--          AND sb.side = (CASE WHEN (hn.husnummer).tal % 2 = 0
--       THEN 'L'
--                         ELSE 'U' END)
--          AND hn.husnummer <@ sb.husnrinterval
--     JOIN postnumre p ON pn.postdistriktnummer = p.nr
--   WHERE upper(hn.registrering) IS NULL;
--
--
--
-- EXPLAIN ANALYZE SELECT DISTINCT
--                   ad.bkid               AS id,
--                   ap.kommunenummer      AS kommunekode,
--                   hn.vejkode,
--                   vn.navn,
--                   hn.husnummer,
--                   ad.etagebetegnelse    AS etage,
--                   ad.doerbetegnelse     AS doer,
--                   sb.bynavn             AS supplerendebynavn,
--                   pn.postdistriktnummer AS postnr,
--                   p.navn                AS postnrnavn
--                 FROM dar_adresse ad
--                   JOIN dar_husnummer hn ON ad.husnummerid = hn.id
--                   JOIN dar_adgangspunkt ap ON hn.adgangspunktid = ap.id
--                   JOIN dar_vejnavn_current vn ON ap.kommunenummer = vn.kommunekode AND hn.vejkode = vn.vejkode
--                   JOIN dar_postnr_current pn
--                     ON ap.kommunenummer = pn.kommunekode
--                        AND hn.vejkode = pn.vejkode
--                        AND pn.side = (CASE WHEN (hn.husnummer).tal % 2 = 0
--                     THEN 'L'
--                                       ELSE 'U' END)
--                        AND hn.husnummer <@ pn.husnrinterval
--                   LEFT JOIN dar_supplerendebynavn_current sb
--                     ON ap.kommunenummer = sb.kommunekode
--                        AND hn.vejkode = sb.vejkode
--                        AND sb.side = (CASE WHEN (hn.husnummer).tal % 2 = 0
--                     THEN 'L'
--                                       ELSE 'U' END)
--                        AND hn.husnummer <@ sb.husnrinterval
--                   JOIN postnumre p ON pn.postdistriktnummer = p.nr
--                 WHERE upper(ad.registrering) IS NULL
--                       AND upper(hn.registrering) IS NULL
--                       AND upper(ap.registrering) IS NULL
--                       AND ad.virkning && hn.virkning AND ad.virkning && ap.virkning AND hn.virkning && ap.virkning;
--
--
-- ap_kommunenummer = pn.kommunekode
-- AND hn_vejkode = pn.vejkode
-- AND pn.side = (CASE WHEN (hn_husnummer).tal % 2 = 0 THEN 'L'
-- ELSE 'U' END)
-- AND hn_husnummer <@ pn.husnrinterval LIMIT 1) AS postnr,
