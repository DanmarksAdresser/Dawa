"use strict";

var dbapi = require('../dbapi');
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
    query: "SELECT id, vejkode, kommunekode, temaer.kode AS geografisk_kommunekode, oprettet, aendret FROM adgangsadresser JOIN griddeddagitemaer temaer ON (st_contains(temaer.geom, adgangsadresser.geom) AND temaer.tema = 'kommune') WHERE adgangsadresser.kommunekode IS DISTINCT FROM temaer.kode ORDER BY aendret DESC"
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
  }
];

module.exports = consistencyChecks.reduce(function(memo, check) {
  var path ='/konsistens/' + check.key;
  memo[path] = {
    path: path,
      expressHandler: function(req, res){
        dbapi.withReadonlyTransaction(function(err, client, done){
          if(err) {
            return resourceImpl.sendInternalServerError(res, "Kunne ikke forbinde til databasen");
          }
          client.query(check.query, [], function(err, result) {
            done(err);
            if(err) {
              return resourceImpl.sendInternalServerError(res, "Fejl under udførelse af database query");
            }
            res.json(result.rows);
          });
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
