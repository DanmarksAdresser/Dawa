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

if (process.argv.length < 6){
  console.log('Usage: node base.js <dbhost> <dbname> <dbuser> <data-dir> ["crlf"]');
  console.log(process.argv);
  process.exit(0);
}

var cfg =
  {dbhost:  process.argv[2],
   dbname:  process.argv[3],
   dbuser:  process.argv[4],
   dataDir: process.argv[5]+'/',
   loadBatchSize: 1000,
  };
cfg.connectiosnString = 'postgres://'+cfg.dbuser+'@'+cfg.dbhost+':5432/'+cfg.dbname;
cfg.newline = (process.argv[6] === 'crlf') ? '\r\n' : '\n';

winston.info("Configuration: %j", cfg, {});

var postnummerTranslation = {'PostCodeIdentifier': 'nr','VersionId': 'version' ,'DistrictName': 'navn'};


function main(cfg){
  async.series(
    [
      script(cfg, 'types.sql'),
      script(cfg, 'base.sql'),
      script(cfg, 'text-search.sql'),
      script(cfg, 'vejstykker-postnr-view.sql'),
      script(cfg, 'postnumre-mini-view.sql'),
      script(cfg, 'vejstykker-view.sql'),
      script(cfg, 'vejstykker-postnumre-view.sql'),
      script(cfg, 'postnumre-kommunekoder-view.sql'),
      script(cfg, 'supplerendebynavne-view.sql'),
      script(cfg, 'adgangsadresser-dagi-view.sql'),
      script(cfg, 'gridded-dagi-view.sql'),
      script(cfg, 'adgangsadresser-view.sql'),
      script(cfg, 'adresse-view.sql'),
      script(cfg, 'stormodtagere-triggers.sql'),
      script(cfg, 'disable-base-triggers.sql'),

      load  (cfg, 'PostCode.csv.gz',        'postnumre'),
      load  (cfg, 'RoadName.csv.gz',        'vejstykker'),
      load  (cfg, 'AddressSpecific.csv.gz', 'enhedsadresser'),
      load  (cfg, 'AddressAccess.csv.gz',   'adgangsadresser'),

      // TODO: these scripts should be trigger based instead!
      script(cfg, 'base-postload-updates.sql'),
      script(cfg, 'vejstykker-postnumre-load.sql'),
      script(cfg, 'postnumre-kommunekoder-load.sql'),
      script(cfg, 'supplerendebynavne-load.sql'),

      script(cfg, 'enable-base-triggers.sql'),
      script(cfg, 'load-data-into-dagitemaer.sql'),
     ],
    function(err){
      doExitOnErr(err);
    });
}

function doExitOnErr(err, cb){
  if (err){
    winston.error("Error: %j", err, {});
    process.exit(1);
  }
}

function load(cfg, f, tablename){
  var file = cfg.dataDir+f;
  return function(cb){
    var client = new pg.Client(cfg.connectiosnString);
    client.connect(function(err){
      doExitOnErr(err);

      var fsStream = fs.createReadStream(file);
      var gzipStream = zlib.createGunzip();
      var csvStream = csv({delimiter: ';',
                           newline: cfg.newline,
                           columns: true,
                           objectMode: true});
      var insertStream = new Inserter(tablename, client, cfg.loadBatchSize, {objectMode: true});

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
    if (this.count % 10000 === 0) {
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
    var fields = _.keys(rows[0]);
    var fieldNames = _.map(fields, function(name){
      if (postnummerTranslation[name]){
        return postnummerTranslation[name];
      } else {
        return name;
      }
    });
    var valueLines = _.map(rows, function(row){
      return valueLine(_.map(fields, function(field){
        return emptyToNull(row[field]);
      }));
    });
    var sql = "INSERT INTO "+tablename+"("+fieldNames.join(",")+") VALUES\n  "+valueLines.join(',\n  ');
    execSQL(sql, dbClient, false, cb);
  }
}

function valueLine(values){
  return "("+values.join(",")+")";
}

function emptyToNull(val){
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

function script(cfg, scriptfile){
  return function(cb){
    var ls = spawn('psql', ['-h', cfg.dbhost, '-f', scriptfile, cfg.dbname, cfg.dbuser]);
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



main(cfg);
