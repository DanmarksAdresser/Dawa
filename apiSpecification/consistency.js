"use strict";

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
    " LEFT JOIN adgangsadresser_temaer_matview atm ON (a.id = atm.adgangsadresse_id)" +
    " LEFT JOIN temaer ON atm.tema_id = temaer.id" +
    " WHERE a.noejagtighed <> 'U' AND a.kommunekode IS DISTINCT FROM (temaer.fields->>'kode')::integer ORDER BY a.aendret DESC"
  },
  {
    key: 'AdresserUdenRegion',
    description: 'Find alle adresser med adgangspunkt der ikke har en tilknyttet region',
    query: "SELECT id, vejkode, kommunekode, oprettet, aendret FROM adgangsadresser LEFT JOIN adgangsadresser_temaer_matview rel  ON (rel.adgangsadresse_id = adgangsadresser.id AND rel.tema = 'region') where rel.adgangsadresse_id is null AND adgangsadresser.noejagtighed <> 'U'"
  },
  {
    key: 'AdresserInkonsistentPostnr',
    description: 'Find alle adresser hvor adressen har et adgangspunkt, men adgangspunktet er placeret i et andet postnummer',
    query: "SELECT adgangsadresser.id, vejkode, kommunekode, postnr, (temaer.fields->>'nr')::integer AS geografisk_postnr, oprettet, adgangsadresser.aendret FROM adgangsadresser JOIN gridded_temaer_matview gridded ON (st_contains(gridded.geom, adgangsadresser.geom) AND gridded.tema = 'postnummer') JOIN temaer ON temaer.id = gridded.id WHERE adgangsadresser.postnr IS DISTINCT FROM (temaer.fields->>'nr')::integer ORDER BY postnr, id DESC"
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
            res.json(result.rows);
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
