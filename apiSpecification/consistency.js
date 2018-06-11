"use strict";

const csvStringify = require('csv-stringify');
const _ = require('underscore');

const { go } = require('ts-csp');
const databasePools = require('../psql/databasePools');
var registry = require('./registry');

var resourceImpl = require('./common/resourceImpl');
const logger = require('../logger').forCategory('consistency');

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
  }
];

module.exports = consistencyChecks.reduce(function (memo, check) {
  var path = '/konsistens/' + check.key;
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
