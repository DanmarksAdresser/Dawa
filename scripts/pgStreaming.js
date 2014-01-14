var pg = require('pg');
var QueryStream = require('pg-query-stream')
var JSONStream = require('JSONStream')

var conString = "postgres://pmm:dawa1234@dkadrdevdb.co6lm7u4jeil.eu-west-1.rds.amazonaws.com:5432/dkadr";
var client = new pg.Client(conString);

pg.connect(conString, function(err, client, pgdone) {
  if(err) {
    return console.error('could not connect to postgres', err);
  }

  var done = function(){ pgdone(); pg.end(); };

  var SQL =
    "SELECT * FROM adgangsadresser " +
    "LEFT JOIN enhedsadresser ON (enhedsadresser.adgangsadresseid = adgangsadresser.id) " +
    "LEFT JOIN vejnavne ON (adgangsadresser.kommunekode = vejnavne.kommunekode and adgangsadresser.vejkode = vejnavne.kode) " +
    "LEFT JOIN postnumre ON (adgangsadresser.postnr = postnumre.nr) "+
    "WHERE adgangsadresser.postnr = 8000";a

  //  var query = new QueryStream("select * from adgangsadresser where postnr = 8000");
  var stream = client.query(new QueryStream(SQL));
  stream.pipe(JSONStream.stringify('[', ',\n', ']\n')).pipe(process.stdout)
  stream.on('end', done);
  stream.on('error', done);

});


