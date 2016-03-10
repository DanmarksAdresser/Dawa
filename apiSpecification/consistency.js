"use strict";

const csvStringify = require('csv-stringify');
const _ = require('underscore');

var logger = require('../logger').forCategory('consistency');
var proddb = require('../psql/proddb');
var registry = require('./registry');

var resourceImpl = require('./common/resourceImpl');

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
    key: 'AdresseStatistik',
    description: 'Adressebestandens ændring over tid',
    query: `
WITH changes as (
select to_char(date_trunc('day', lower(virkning)), 'YYYY-MM-DD') as day, statuskode, count(*) as change FROM dar_adresse where upper(registrering) is null group by date_trunc('day', lower(virkning)), statuskode
UNION ALL
  select to_char(date_trunc('day', upper(virkning)), 'YYYY-MM-DD') as day, statuskode, -count(*) as change FROM dar_adresse where upper(registrering) is null and upper(virkning) is not null group by date_trunc('day', upper(virkning)), statuskode)
select day,
  sum(CASE WHEN statuskode = 1 THEN change ELSE 0 END)  OVER w as status1,
  sum(CASE WHEN statuskode = 2 THEN change ELSE 0 END)  OVER w as status2,
  sum(CASE WHEN statuskode = 3 THEN change ELSE 0 END)  OVER w as status3,
  sum(CASE WHEN statuskode = 4 THEN change ELSE 0 END)  OVER w as status4
from changes WINDOW w as (order by day);`
  }
];

module.exports = consistencyChecks.reduce(function(memo, check) {
  var path ='/konsistens/' + check.key;
  memo[path] = {
    path: path,
    expressHandler: function (req, res) {
      proddb.withTransaction('READ_ONLY', function (client) {
        return client.queryp(check.query, [])
          .then(function (result) {
            const fieldNames = _.pluck(result.fields, 'name');
            csvStringify(result.rows || [], {header: true, columns: fieldNames, rowDelimiter: '\r\n'}, (err, result) => {
              if(err) {
                res.status(500).send(JSON.stringify(err));
                return;
              }
              res.set('Content-Type', 'text/csv');
              res.end(result);
            });


          })
          .catch(function (err) {
            logger.error("Fejl under udførelse af database query", err);
            resourceImpl.sendInternalServerError(res, "Fejl under udførelse af database query");
          });
      })
        .catch(function () {
          resourceImpl.sendInternalServerError(res, "Kunne ikke forbinde til databasen");
        });
    }
  };
  registry.add('konsistens', 'resourceImpl',check.key, memo[path]);
  return memo;
}, {});

module.exports['/konsistens'] = {
  path: '/konsistens',
  expressHandler: function(req, res) {
    res.json(consistencyChecks);
  }
};

registry.add('konsistens', 'resourceImpl','oversigt', module.exports['/konsistens']);
