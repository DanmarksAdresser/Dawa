"use strict";

var Writable = require('stream').Writable;
var util     = require('util');
var winston  = require('winston');
var _        = require('underscore');
var fs       = require('fs');
var csv      = require('csv-streamify');
var async    = require('async');
var spawn    = require('child_process').spawn;
var zlib     = require('zlib');
var pg       = require('pg.js');

// Assert the correct arguments
if (process.argv.length < 6){
  console.log('Usage: node base.js <dbhost> <dbname> <dbuser> <data-dir> ["crlf"]');
  console.log(process.argv);
  process.exit(1);
}

// Setup the configuration
var CFG =
  {dbhost:  process.argv[2],
   dbname:  process.argv[3],
   dbuser:  process.argv[4],
   dataDir: process.argv[5]+'/',
   scriptDir: __dirname,
   loadBatchSize: 1000,
  };
CFG.connectiosnString = 'postgres://'+CFG.dbuser+'@'+CFG.dbhost+':5432/'+CFG.dbname;
CFG.newline = (process.argv[6] === 'crlf') ? '\r\n' : '\n';

winston.info("Configuration: %j", CFG, {});

// Note, the sequence of the tables matter!
var tableSpecs = normaliseTableSpec([
  {name: 'transaction_history'},
  {name: 'bbr_events'},
  {name: 'dagitemaer'},
  {name: 'vejstykker'},
  {name: 'postnumre'},
  {name: 'stormodtagere'},
  {name: 'adgangsadresser'},
  {name: 'enhedsadresser'},
  {name: 'vejstykkerpostnr',           scriptFile: 'vejstykker-postnr-view.sql', type: 'view'},
  {name: 'postnumremini',              scriptFile: 'postnumre-mini-view.sql',    type: 'view'},
  {name: 'vejstykkerview',             scriptFile: 'vejstykker-view.sql',        type: 'view'},
  {name: 'vejstykkerpostnumremat',     scriptFile: 'vejstykker-postnumre-view.sql'},
  {name: 'postnumre_kommunekoder_mat', scriptFile: 'postnumre-kommunekoder-mat.sql'},
  {name: 'supplerendebynavne',         scriptFile: 'supplerendebynavne-view.sql'},
  {name: 'adgangsadresserdagirel',     scriptFile: 'adgangsadresser-dagi-view.sql'},
  {name: 'griddeddagitemaer',          scriptFile: 'gridded-dagi-view.sql'},
  {name: 'adgangsadresserview',        scriptFile: 'adgangsadresser-view.sql',   type: 'view'},
  {name: 'adresser',                   scriptFile: 'adresse-view.sql',           type: 'view'},
]);

function main(){
  async.series(
    [
      psqlScript('misc.sql'),
      loadSchemas,
      disableTriggers,

      loadCsv('PostCode.csv.gz',        'postnumre'),
      loadCsv('RoadName.csv.gz',        'vejstykker'),
      loadCsv('AddressSpecific.csv.gz', 'enhedsadresser'),
      loadCsv('AddressAccess.csv.gz',   'adgangsadresser'),

      psqlScript('vejstykker-postnumre-load.sql'),
      psqlScript('supplerendebynavne-load.sql'),

      initializeTables,
      enableTriggers,
      psqlScript('load-data-into-dagitemaer.sql'),
      function(cb) {console.log('Main is done!'); cb(); },
     ],
    function(err){
      exitOnErr(err);
    });
}

function loadCsv(gzCsvFile, tablename){
  var file = CFG.dataDir+gzCsvFile;
  return function(cb){
    var client = new pg.Client(CFG.connectiosnString);
    client.connect(function(err){
      exitOnErr(err);

      var fsStream = fs.createReadStream(file);
      var gzipStream = zlib.createGunzip();
      var csvStream = csv({delimiter: ';',
                           newline: CFG.newline,
                           columns: true,
                           objectMode: true});
      var insertStream = new Inserter(tablename, client, CFG.loadBatchSize, {objectMode: true});
      insertStream.on('finish', function(){
        insertRows(insertStream.rowBuffer, insertStream.tablename, insertStream.dbClient,
                   function(){ client.end(); console.log("\nrows="+(csvStream.lineNo-1)); cb(); });
      });
      console.log('');
      winston.info('Loading %s', file);
      fsStream.pipe(gzipStream).pipe(csvStream).pipe(insertStream);
    });
  };
}

util.inherits(Inserter, Writable);
function Inserter(tablename, dbClient, batchSize, opt) {
  Writable.call(this, opt);
  this.tablename = tablename;
  this.dbClient = dbClient;
  this.rowBuffer = [];
  this.batchSize = batchSize;
  this.count = 1;
  this.start = new Date().getTime();
  this.now = new Date().getTime();
}

Inserter.prototype._write = function(row, encoding, cb) {
  this.rowBuffer.push(row);
  if (this.rowBuffer.length === this.batchSize)
  {
    if (this.count % 10000 === 0)
    {
      // Print progress
      var now = new Date().getTime();
      console.log("rows: "+this.count/1000+'K, '+Math.round((10000/(now-this.now)*1000))+" rows/sec"+
                  ", total: "+Math.round((now-this.start)/1000)+" sec");
      this.now = now;
    }
    insertRows(this.rowBuffer, this.tablename, this.dbClient, cb);
    this.rowBuffer = [];
  }
  else
  {
    cb();
  }
  this.count += 1;
};

function insertRows(rows, tablename, dbClient, cb){
  if (rows.length > 0){
    var fieldNames = _.keys(rows[0]);
    var valueLines = _.map(rows, function(row){
      return valueLine(_.map(fieldNames, function(field){
        return emptyToNullAndEscapePing(row[field]);
      }));
    });
    var sql = "INSERT INTO "+tablename+"("+fieldNames.join(",")+") VALUES\n  "+valueLines.join(',\n  ');
    execSQL(sql, dbClient, false, cb);
  }
}

function valueLine(values){
  return "("+values.join(",")+")";
}

function emptyToNullAndEscapePing(val){
      if (val === ''){
        return 'null';
      } else {
        return "'"+(val.replace(/'/g,"''"))+"'";
      }
}

function execSQL(sql, client, echo, done){
  function doWork(cb){
    if (echo){ winston.info("Executing sql: %s", sql);}
    client.query(sql, function(err, data){
      if (err) {
        winston.error("Error: %j", err, {});
        winston.error("Executing sql: %s", sql);
        process.exit(1);
      }
      else {
        cb();
      }
    });
  }
  if (done) {
    doWork(done);
  }
  else {
    return doWork;
  }
}

function psqlScript(scriptfile){
  return function(cb){
    var ls = spawn('psql', ['-h', CFG.dbhost, '-f', CFG.scriptDir+"/"+scriptfile, CFG.dbname, CFG.dbuser]);
    ls.stdout.on('data', function (data) {
      console.log(""+data);
    });
    ls.stderr.on('data', function (data) {
      console.log("*** STDERR *******************");
      console.log('' + data);
    });
    ls.on('close', function (code) {
      if (code !== 0){
        winston.error('Error: script failed, script=%s code=code', scriptfile, code);
        process.exit(code);
      }
      cb();
    });
  };
}

function forAllTableSpecs(callback, done){
  var client = new pg.Client(CFG.connectiosnString);
  client.connect(function(err){
    exitOnErr(err);
    async.eachSeries(
      tableSpecs,
      function(spec, cb){
        callback(client, spec, cb);
      },
      function(err){
        exitOnErr(err);
        client.end();
        done();
      });
  });
}

function loadSchemas(done){
  forAllTableSpecs(
    function (client, spec, cb){
      return (psqlScript(spec.scriptFile))(cb);
    },
    done);
}

function disableTriggers(done){
  forAllTableSpecs(
    function (client, spec, cb){
      if (spec.type !== 'view'){
        execSQL("ALTER TABLE "+spec.name+" DISABLE TRIGGER ALL", client, true, cb);
      } else {
        cb();
      }
    },
    done);
}

function enableTriggers(done){
  forAllTableSpecs(
    function (client, spec, cb){
      if (spec.type !== 'view'){
        execSQL("ALTER TABLE "+spec.name+" ENABLE TRIGGER ALL", client, true, cb);
      } else {
        cb();
      }
    },
    done);
}

function initializeTables(done){
  forAllTableSpecs(
    function (client, spec, cb){
      if (spec.type !== 'view'){
        execSQL("select "+spec.name+"_init()", client, true, cb);
      } else {
        cb();
      }
    },
    done);
}


function normaliseTableSpec(specs){
  return _.map(
    specs,
    function(spec){
      if (!spec.scriptFile){
        spec.scriptFile = spec.name+".sql";
      }
      if (!spec.type){
        spec.type = 'table';
      }
      return spec;
    });
}

function exitOnErr(err, cb){
  if (err){
    winston.error("Error: %j", err, {});
    process.exit(1);
  }
}

main();
