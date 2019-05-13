"use strict";

const csvStringify = require('csv-stringify');
const _ = require('underscore');

const { go } = require('ts-csp');
const databasePools = require('@dawadk/common/src/postgres/database-pools');
var registry = require('./registry');

var resourceImpl = require('./common/resourceImpl');
const logger = require('@dawadk/common/src/logger').forCategory('consistency');

const CONSISTENCY_TIMEOUT = 180000;

var consistencyChecks = [
  {
    key: 'AdresserUdenAdgangspunkt',
    description: 'Adgangsadresser, som ikke har angivet et geografisk adgangspunkt',
    query: "select id, kommunekode, vejkode, oprettet, aendret FROM adgangsadresser WHERE noejagtighed = 'U'"
  },
  {
    key: 'AdresserUdenVejstykke',
    description: 'Adresser uden vejstykke',
    query: 'SELECT id,adgangsadresser.kommunekode, vejkode, adgangsadresser.oprettet, adgangsadresser.aendret FROM adgangsadresser LEFT JOIN vejstykker ON (adgangsadresser.kommunekode = vejstykker.kommunekode AND adgangsadresser.vejkode = vejstykker.kode) WHERE vejstykker.vejnavn IS NULL ORDER BY aendret DESC'
  },
  {
    key: 'AdresserInkonsistentKommune',
    description: 'Find alle adresser hvor adressen har et adgangspunkt, men adgangspunktet er placeret i en anden kommune',
    query: `SELECT a.id, vejkode, a.kommunekode, kt.kommunekode AS geografisk_kommunekode, a.oprettet, a.aendret
    FROM adgangsadresser a
    LEFT JOIN kommunetilknytninger kt ON a.id = kt.adgangsadresseid
    WHERE a.noejagtighed <> 'U' AND a.kommunekode IS DISTINCT FROM kt.kommunekode ORDER BY a.aendret DESC`
  },
  {
    key: 'AdresserUdenRegion',
    description: 'Find alle adresser med adgangspunkt der geografisk ikke ligger indenfor en region',
    query: "SELECT id, vejkode, kommunekode, oprettet, aendret FROM adgangsadresser LEFT JOIN regionstilknytninger rt  ON (rt.adgangsadresseid = adgangsadresser.id) where rt.adgangsadresseid is null AND adgangsadresser.noejagtighed <> 'U'"
  },
  {
    key: 'AdresserUdenPostnr',
    description: 'Find alle gældende eller foreløbige adgangsadresser, som ikke har et postnr',
    query: "SELECT id, objekttype as status, a.vejkode, a.kommunekode, a.oprettet, a.aendret as ændret, vejnavn, formatHusnr(husnr) as husnr, supplerendebynavn, postnr FROM adgangsadresser a JOIN vejstykker v ON a.kommunekode = v.kommunekode and a.vejkode = v.kode WHERE postnr IS NULL AND (objekttype=1 OR objekttype=3)"
  },
  {
    key: 'AdresserInkonsistentPostnr',
    description: 'Find alle adresser hvor adressen har et adgangspunkt, men adgangspunktet er placeret i et andet postnummer',
    query: `SELECT a.id, vejkode, kommunekode, postnr, pt.postnummer AS geografisk_postnr, oprettet, a.aendret
    FROM adgangsadresser a
    LEFT JOIN postnummertilknytninger pt ON a.id = pt.adgangsadresseid
    WHERE a.noejagtighed <> 'U' AND a.postnr <> pt.postnummer ORDER BY a.aendret DESC`
  },
  {
    key: 'AdgangsadresserUdenEnhedsadresser',
    description: 'Find alle adgangsadresser uden mindst en tilknyttet enhedsadresse',
    query: 'SELECT id, vejkode, kommunekode, oprettet, aendret FROM adgangsadresser where not exists(select adgangsadresseid from enhedsadresser where adgangsadresseid = adgangsadresser.id) ORDER BY aendret DESC'
  },
  {
    key: 'AdgangsadresserFlereJordstykker',
    description: 'Find adgangsadresser, der ligger på mere end ét jordstykke',
    query: `with adrs AS (SELECT a.id, a.geom FROM adgangsadresser_mat a 
    JOIN jordstykker j ON ST_Covers(j.geom, a.geom)
     GROUP BY a.id, a.geom HAVING count(*) >= 2)
SELECT a.id as adgangsadresse_id, ejerlavkode, matrikelnr FROM adrs a JOIN jordstykker j ON ST_Covers(j.geom, a.geom)`
  },
  {
    key: 'AdresseStatistik',
    description: 'Adressebestandens ændring over tid',
    query: `
WITH changes AS (
  SELECT
    to_char(date_trunc('day', lower(virkning)), 'YYYY-MM-DD') AS day,
    status,
    count(*)                                                  AS change
  FROM dar1_adresse_history
  GROUP BY date_trunc('day', lower(virkning)), status
  UNION ALL
  SELECT
    to_char(date_trunc('day', upper(virkning)), 'YYYY-MM-DD') AS day,
    status,
    -count(*)                                                 AS change
  FROM dar1_adresse_history
  WHERE upper(virkning) IS NOT NULL
  GROUP BY date_trunc('day', upper(virkning)), status),
  byDay AS (SELECT
  day,
  sum(CASE WHEN status = 2
    THEN change
      ELSE 0 END) AS status2,
  sum(CASE WHEN status = 3
    THEN change
      ELSE 0 END) AS status3,
  sum(CASE WHEN status = 4
    THEN change
      ELSE 0 END) AS status4,
  sum(CASE WHEN status = 5
    THEN change
      ELSE 0 END) AS status5
FROM changes group by day)
SELECT day, sum(status2) over w as status2, sum(status3) over w as status3, sum(status4) over w as status4, sum(status5) over w as status5
FROM byDay
  WINDOW w AS (order by day)`
  },
  {
    key: 'AdgangsadresseStatistik',
    description: 'Adgangsadressebestandens ændring over tid',
    query: `
WITH changes AS (
  SELECT
    to_char(date_trunc('day', lower(virkning)), 'YYYY-MM-DD') AS day,
    status,
    count(*)                                                  AS change
  FROM dar1_husnummer_history
  GROUP BY date_trunc('day', lower(virkning)), status
  UNION ALL
  SELECT
    to_char(date_trunc('day', upper(virkning)), 'YYYY-MM-DD') AS day,
    status,
    -count(*)                                                 AS change
  FROM dar1_husnummer_history
  WHERE upper(virkning) IS NOT NULL
  GROUP BY date_trunc('day', upper(virkning)), status),
  byDay AS (SELECT
  day,
  sum(CASE WHEN status = 2
    THEN change
      ELSE 0 END) AS status2,
  sum(CASE WHEN status = 3
    THEN change
      ELSE 0 END) AS status3,
  sum(CASE WHEN status = 4
    THEN change
      ELSE 0 END) AS status4,
  sum(CASE WHEN status = 5
    THEN change
      ELSE 0 END) AS status5
FROM changes group by day)
SELECT day, sum(status2) over w as status2, sum(status3) over w as status3, sum(status4) over w as status4, sum(status5) over w as status5
FROM byDay
  WINDOW w AS (order by day)`
  },
  {
    key: 'AdresseAntal',
    description: 'Antallet af adresser, adgangsadresser og vejstykker',
    query: `SELECT (SELECT COUNT(*) FROM adresser_mat where vejnavn is not null and vejnavn <> '' and postnr is not null) as adresser,
    (select count(*) from adgangsadresser_mat where vejnavn is not null and vejnavn <> '' and postnr is not null) as adgangsadresser`
  },
  {
    key: 'AdresseInkonsistentJordstykkeKommune',
    description: 'Adreser hvor jordstykkets kommunekode ikke stemmer overens med DAGI-temaet, som adressen er placeret på',
    query: `SELECT
  j.kommunekode                     AS jordstykke_kommunekode,
  j.ejerlavkode,
  j.matrikelnr,
  ja.adgangsadresse_id              AS adgangsadresseid,
  kt.kommunekode AS adgangsadresse_kommunekode
FROM jordstykker j
  JOIN jordstykker_adgadr ja ON j.ejerlavkode = ja.ejerlavkode AND j.matrikelnr = ja.matrikelnr
  JOIN kommunetilknytninger  kt
    ON ja.adgangsadresse_id = kt.adgangsadresseid
WHERE j.kommunekode = kt.kommunekode`
  },
  {
    key: 'InkonsistentAfstemningsomraade',
    description: 'Husnumre, hvor DARs beregning af afstemningsområde afviger fra vores geografiske beregning',
    query: `
    SELECT
  hn.id,
  hn.status,
  ap.id as adgangspunkt_id,
  dar_ao.id as dar_afstemningsområde_id,
  st_astext(ap.position) as position,
  dar_ao.afstemningsområde as dar_dagi_id,
  dar_ao.navn as dar_navn,
  dawa_ao.dagi_id as dawa_dagi_id,
  dawa_ao.navn as dawa_navn,
  st_distance(ap.position, dawa_ao.geom) AS dagi_afstand,
  st_distance(ap.position, dar_ao_geo.geom) AS dar_afstand

FROM dar1_husnummer_current hn
  LEFT JOIN dar1_adressepunkt_current ap ON hn.adgangspunkt_id = ap.id
  LEFT JOIN afstemningsomraadetilknytninger at ON at.adgangsadresseid = hn.id
  LEFT JOIN dar1_darafstemningsområde_current dar_ao ON hn.darafstemningsområde_id = dar_ao.id
  LEFT JOIN afstemningsomraader dawa_ao
    ON at.kommunekode = dawa_ao.kommunekode AND at.afstemningsområdenummer = dawa_ao.nummer
  LEFT JOIN afstemningsomraader dar_ao_geo ON dar_ao.afstemningsområde = dar_ao_geo.dagi_id
WHERE hn.navngivenvej_id IS NOT NULL AND dar_ao.afstemningsområde IS DISTINCT FROM dawa_ao.dagi_id
  AND hn.status IN (2,3)
ORDER BY st_distance(ap.position, dar_ao_geo.geom) DESC;`
  },
  {
    key: 'InkonsistentMRAfstemningsområde',
    description: 'Husnumre, hvor DARs beregning af menighedsrådsafstemningsområde afviger',
    query: `SELECT
  hn.id,
  hn.status,
  ap.id as adgangspunkt_id,
  dar_ao.id as dar_mrafstemningsområde_id,
  st_astext(ap.position) as position,
  dar_ao.mrafstemningsområde as dar_dagi_id,
  dar_ao.navn as dar_navn,
  dawa_ao.dagi_id as dawa_dagi_id,
  dawa_ao.navn as dawa_navn,
  st_distance(ap.position, dawa_ao.geom) AS dagi_afstand,
  st_distance(ap.position, dar_ao_geo.geom) AS dar_afstand

FROM dar1_husnummer_current hn
  LEFT JOIN dar1_adressepunkt_current ap ON hn.adgangspunkt_id = ap.id
  LEFT JOIN menighedsraadsafstemningsomraadetilknytninger at ON at.adgangsadresseid = hn.id
  LEFT JOIN dar1_darmenighedsrådsafstemningsområde_current dar_ao ON hn.darmenighedsrådsafstemningsområde_id = dar_ao.id
  LEFT JOIN menighedsraadsafstemningsomraader dawa_ao
    ON at.kommunekode = dawa_ao.kommunekode AND at.menighedsrådsafstemningsområdenummer = dawa_ao.nummer
  LEFT JOIN menighedsraadsafstemningsomraader dar_ao_geo ON dar_ao.mrafstemningsområde = dar_ao_geo.dagi_id
WHERE hn.navngivenvej_id IS NOT NULL AND dar_ao.mrafstemningsområde IS DISTINCT FROM dawa_ao.dagi_id
  AND hn.status IN (2,3)
ORDER BY st_distance(ap.position, dar_ao_geo.geom) DESC`
  },
  {
    key: 'InkonsistentSogn',
    description: 'Husnumre, hvor DARs beregning af sognetilknytning afviger',
    query: `SELECT
  hn.id,
  hn.status,
  ap.id as adgangspunkt_id,
  dar_ao.id as dar_sogneinddeling_id,
  st_astext(ap.position) as position,
  dar_ao.sogneinddeling as dar_dagi_id,
  dar_ao.navn as dar_navn,
  dawa_ao.dagi_id as dawa_dagi_id,
  dawa_ao.navn as dawa_navn,
  st_distance(ap.position, dawa_ao.geom) AS dagi_afstand,
  st_distance(ap.position, dar_ao_geo.geom) AS dar_afstand

FROM dar1_husnummer_current hn
  LEFT JOIN dar1_adressepunkt_current ap ON hn.adgangspunkt_id = ap.id
  LEFT JOIN sognetilknytninger at ON at.adgangsadresseid = hn.id
  LEFT JOIN dar1_darsogneinddeling_current dar_ao ON hn.darsogneinddeling_id = dar_ao.id
  LEFT JOIN sogne dawa_ao
    ON at.sognekode = dawa_ao.kode
  LEFT JOIN sogne dar_ao_geo ON dar_ao.sogneinddeling = dar_ao_geo.dagi_id
WHERE hn.navngivenvej_id IS NOT NULL AND dar_ao.sogneinddeling IS DISTINCT FROM dawa_ao.dagi_id
  AND hn.status IN (2,3)
ORDER BY st_distance(ap.position, dar_ao_geo.geom) DESC`
  },
  {
    key: 'InkonsistentSupplerendeBynavn',
    description: 'Husnumre, hvor DARs beregning af supplerende bynavn afviger',
    query: `SELECT
      hn.id,
       hn.status,
       ap.id as adgangspunkt_id,
       dar_sb.id as dar_supplerendebynavn_id,
      st_astext(ap.position) as position,
       dar_sb.supplerendebynavn1 as dar_dagi_id,
       dar_sb.navn as dar_navn,
       dawa_sb.dagi_id as dawa_dagi_id,
       dawa_sb.navn as dawa_navn,
      st_distance(ap.position, dawa_sb.geom) AS dagi_afstand,
      st_distance(ap.position, dar_sb_geo.geom) AS dar_afstand
            FROM dar1_husnummer_current hn
                   LEFT JOIN dar1_adressepunkt_current ap ON hn.adgangspunkt_id = ap.id
                   LEFT JOIN supplerendebynavntilknytninger st ON st.adgangsadresseid = hn.id
                   LEFT JOIN dar1_supplerendebynavn_current dar_sb ON hn.supplerendebynavn_id = dar_sb.id
                   LEFT JOIN dagi_supplerendebynavne dawa_sb
                             ON st.dagi_id = dawa_sb.dagi_id
                   LEFT JOIN dagi_supplerendebynavne dar_sb_geo ON dar_sb.supplerendebynavn1 = dar_sb_geo.dagi_id
            WHERE hn.navngivenvej_id IS NOT NULL AND dar_sb.supplerendebynavn1 IS DISTINCT FROM dawa_sb.dagi_id
              AND hn.status IN (2,3)
            ORDER BY st_distance(ap.position, dar_sb_geo.geom) DESC`
  },
  {
    key: 'InkonsistentKommune',
    description: 'Husnumre, hvor DARs beregning af kommune afviger',
    query: `SELECT
  hn.id,
  hn.status,
  ap.id as adgangspunkt_id,
  dar_ao.id as dar_kommuneinddeling_id,
  st_astext(ap.position) as position,
  dar_ao.kommuneinddeling as dar_dagi_id,
  dar_ao.navn as dar_navn,
  dawa_ao.dagi_id as dawa_dagi_id,
  dawa_ao.navn as dawa_navn,
  st_distance(ap.position, dawa_ao.geom) AS dagi_afstand,
  st_distance(ap.position, dar_ao_geo.geom) AS dar_afstand

FROM dar1_husnummer_current hn
  LEFT JOIN dar1_adressepunkt_current ap ON hn.adgangspunkt_id = ap.id
  LEFT JOIN kommunetilknytninger at ON at.adgangsadresseid = hn.id
  LEFT JOIN dar1_darkommuneinddeling_current dar_ao ON hn.darkommune_id = dar_ao.id
  LEFT JOIN kommuner dawa_ao
    ON at.kommunekode = dawa_ao.kode
  LEFT JOIN kommuner dar_ao_geo ON dar_ao.kommuneinddeling = dar_ao_geo.dagi_id
WHERE hn.navngivenvej_id IS NOT NULL AND dar_ao.kommuneinddeling IS DISTINCT FROM dawa_ao.dagi_id
  AND hn.status IN (2,3)
ORDER BY st_distance(ap.position, dar_ao_geo.geom) DESC;`
  },
  {
    key: 'HusnummerManglendeAdgangspunkt',
    description: 'Husnumre, hvor vi ikke har modtaget et adgangspunkt fra DAR',
    query: `select hn.id, hn.status, hn.adgangspunkt_id 
    from dar1_husnummer_current hn 
    left join dar1_adressepunkt_current ap on hn.adgangspunkt_id = ap.id 
    where ap.id is null  and adgangspunkt_id is not null`
  }
];

module.exports = consistencyChecks.reduce(function (memo, check) {
  var path = `/konsistens/${ encodeURIComponent(check.key)}`;
  memo[path] = {
    path: path,
    expressHandler: function (req, res) {
      databasePools.get('prod').withConnection({pooled: false, statementTimeout: CONSISTENCY_TIMEOUT}, (client) => go(function*() {
        res.connection.setTimeout(CONSISTENCY_TIMEOUT);
        const result = yield client.query(check.query);
        const fieldNames = _.pluck(result.fields, 'name');
        csvStringify(result.rows || [], {
          header: true,
          columns: fieldNames,
          rowDelimiter: '\r\n'
        }, (err, result) => {
          if (err) {
            res.status(500).send(JSON.stringify(err));
            return;
          }
          res.set('Content-Type', 'text/csv');
          res.end(result);
        });
      })).asPromise().catch(function (err) {
        logger.error('Fejl under consistency check', err);
        resourceImpl.sendInternalServerError(res, { message: "Kunne ikke forbinde til databasen"});
      });
    }
  };
  registry.add('konsistens', 'resourceImpl', check.key, memo[path]);
  return memo;
}, {});

module.exports['/konsistens'] = {
  path: '/konsistens',
  expressHandler: function(req, res) {
    res.json(consistencyChecks);
  }
};

registry.add('konsistens', 'resourceImpl','oversigt', module.exports['/konsistens']);
