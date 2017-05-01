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
    query: "SELECT a.id, vejkode, kommunekode, temaer.fields->>'kode' AS geografisk_kommunekode, a.oprettet, a.aendret" +
    " FROM adgangsadresser a" +
    " LEFT JOIN adgangsadresser_temaer_matview atm ON (a.id = atm.adgangsadresse_id AND tema = 'kommune')" +
    " LEFT JOIN temaer ON atm.tema_id = temaer.id" +
    " WHERE a.noejagtighed <> 'U' AND a.kommunekode IS DISTINCT FROM (temaer.fields->>'kode')::integer ORDER BY a.aendret DESC"
  },
  {
    key: 'AdresserUdenRegion',
    description: 'Find alle adresser med adgangspunkt der geografisk ikke ligger indenfor en region',
    query: "SELECT id, vejkode, kommunekode, oprettet, aendret FROM adgangsadresser LEFT JOIN adgangsadresser_temaer_matview rel  ON (rel.adgangsadresse_id = adgangsadresser.id AND rel.tema = 'region') where rel.adgangsadresse_id is null AND adgangsadresser.noejagtighed <> 'U'"
  },
  {
    key: 'AdresserUdenPostnr',
    description: 'Find alle gældende eller foreløbige adgangsadresser, som ikke har et postnr',
    query: "SELECT id, objekttype as status, a.vejkode, a.kommunekode, a.oprettet, a.aendret as ændret, vejnavn, formatHusnr(husnr) as husnr, supplerendebynavn, postnr FROM adgangsadresser a JOIN vejstykker v ON a.kommunekode = v.kommunekode and a.vejkode = v.kode WHERE postnr IS NULL AND (objekttype=1 OR objekttype=3)"
  },
  {
    key: 'AdresserInkonsistentPostnr',
    description: 'Find alle adresser hvor adressen har et adgangspunkt, men adgangspunktet er placeret i et andet postnummer',
    query: "SELECT a.id, vejkode, kommunekode, postnr, (temaer.fields->>'nr')::integer AS geografisk_postnr, oprettet, a.aendret" +
    " FROM adgangsadresser a" +
    " LEFT JOIN adgangsadresser_temaer_matview atm ON (a.id = atm.adgangsadresse_id AND tema = 'postnummer')" +
    " LEFT JOIN temaer ON atm.tema_id = temaer.id" +
    " WHERE a.noejagtighed <> 'U' AND postnr IS DISTINCT FROM (temaer.fields->>'nr')::integer ORDER BY a.aendret DESC"
  },
  {
    key: 'AdgangsadresserUdenEnhedsadresser',
    description: 'Find alle adgangsadresser uden mindst en tilknyttet enhedsadresse',
    query: 'SELECT id, vejkode, kommunekode, oprettet, aendret FROM adgangsadresser where not exists(select adgangsadresseid from enhedsadresser where adgangsadresseid = adgangsadresser.id) ORDER BY aendret DESC'
  },
  {
    key: 'AdgangsadresserMatrikelafgivelser',
    description: 'Find alle adgangsadresser hvor BBR matrikel og geografisk matrikel afviger',
    query: "SELECT a.id, ejerlavkode, matrikelnr, t.fields->>'ejerlavkode' as geo_ejerlavkode, t.fields->>'matrikelnr' as geo_matrikelnr" +
    " FROM adgangsadresser a" +
    " LEFT JOIN adgangsadresser_temaer_matview atm ON atm.tema = 'jordstykke' AND a.id = atm.adgangsadresse_id" +
    " LEFT JOIN temaer t ON t.tema = 'jordstykke' and T.id = atm.tema_id" +
    " WHERE a.noejagtighed <> 'U'" +
    " AND ((t.fields->>'ejerlavkode')::integer IS DISTINCT FROM a.ejerlavkode or (t.fields->>'matrikelnr') IS DISTINCT FROM a.matrikelnr)"
  },
  {
    key: 'AdgangsadresserFlereJordstykker',
    description: 'Find adgangsadresser, der ligger på mere end ét jordstykke',
    query: `with adrs AS (SELECT a.id, a.geom FROM adgangsadresser_mat a 
    JOIN jordstykker j ON ST_Covers(j.geom, a.geom)
     GROUP BY a.id, a.geom HAVING count(*) > 2)
SELECT a.id as adgangsadresse_id, ejerlavkode, matrikelnr FROM adrs a JOIN jordstykker j ON ST_Covers(j.geom, a.geom)`
  },
  {
    key: 'AdresseStatistik',
    description: 'Adressebestandens ændring over tid',
    query: `
WITH changes AS (
  SELECT
    to_char(date_trunc('day', lower(virkning)), 'YYYY-MM-DD') AS day,
    statuskode,
    count(*)                                                  AS change
  FROM dar_adresse
  WHERE upper(registrering) IS NULL
  GROUP BY date_trunc('day', lower(virkning)), statuskode
  UNION ALL
  SELECT
    to_char(date_trunc('day', upper(virkning)), 'YYYY-MM-DD') AS day,
    statuskode,
    -count(*)                                                 AS change
  FROM dar_adresse
  WHERE upper(registrering) IS NULL AND upper(virkning) IS NOT NULL
  GROUP BY date_trunc('day', upper(virkning)), statuskode),
  byDay AS (SELECT
  day,
  sum(CASE WHEN statuskode = 1
    THEN change
      ELSE 0 END) AS status1,
  sum(CASE WHEN statuskode = 2
    THEN change
      ELSE 0 END) AS status2,
  sum(CASE WHEN statuskode = 3
    THEN change
      ELSE 0 END) AS status3,
  sum(CASE WHEN statuskode = 4
    THEN change
      ELSE 0 END) AS status4
FROM changes group by day)
SELECT day, sum(status1) over w as status1, sum(status2) over w as status2, sum(status3) over w as status3, sum(status4) over w as status4
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
    statuskode,
    count(*)                                                  AS change
  FROM dar_husnummer
  WHERE upper(registrering) IS NULL
  GROUP BY date_trunc('day', lower(virkning)), statuskode
  UNION ALL
  SELECT
    to_char(date_trunc('day', upper(virkning)), 'YYYY-MM-DD') AS day,
    statuskode,
    -count(*)                                                 AS change
  FROM dar_husnummer
  WHERE upper(registrering) IS NULL AND upper(virkning) IS NOT NULL
  GROUP BY date_trunc('day', upper(virkning)), statuskode),
  byDay AS (SELECT
  day,
  sum(CASE WHEN statuskode = 1
    THEN change
      ELSE 0 END) AS status1,
  sum(CASE WHEN statuskode = 2
    THEN change
      ELSE 0 END) AS status2,
  sum(CASE WHEN statuskode = 3
    THEN change
      ELSE 0 END) AS status3,
  sum(CASE WHEN statuskode = 4
    THEN change
      ELSE 0 END) AS status4
FROM changes group by day)
SELECT day, sum(status1) over w as status1, sum(status2) over w as status2, sum(status3) over w as status3, sum(status4) over w as status4
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
  (t.fields ->> 'kode') :: SMALLINT AS adgangsadresse_kommunekode
FROM jordstykker j
  JOIN jordstykker_adgadr ja ON j.ejerlavkode = ja.ejerlavkode AND j.matrikelnr = ja.matrikelnr
  JOIN adgangsadresser_temaer_matview atm
    ON atm.adgangsadresse_id = ja.adgangsadresse_id AND atm.tema = 'kommune'
  JOIN temaer t ON atm.tema_id = t.id
WHERE j.kommunekode <> (t.fields ->> 'kode') :: SMALLINT`
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
