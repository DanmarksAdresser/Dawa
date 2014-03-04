"use strict";

var express        = require("express");
var winston        = require('winston');
var expressWinston = require('express-winston');
var dawaPgApi      = require('./dawaPgApi');
var apiSpec        = require('./apiSpec');
var apiSpecUtil    = require('./apiSpecUtil');
var parameterDoc   = require('./parameterDoc');
var docUtil        = require('./docUtil');

var logglyOptions = {subdomain        : 'dawa',
                     inputToken       : process.env.DAWALOGGLY,
                     json             : true,
                     handleExceptions : true};

var app = express();

setupLogging(app);

app.use(express.compress());
app.use(express.static(__dirname + '/public', {maxAge: 86400000}));
app.set('views', __dirname + '/views');
app.set('view engine', 'jade');

app.get('/', function (req, res) {
  res.render('home.jade', {url: req.headers.host});
});

setupJadePage('/generelt'             , 'generelt.jade');
setupJadePage('/adressedok'           , 'adressedok.jade');
setupJadePage('/adgangsadressedok'    , 'adgangsadressedok.jade');
setupJadePage('/vejedok'              , 'vejedok.jade');
setupJadePage('/supplerendebynavndok' , 'supplerendebynavndok.jade');
setupJadePage('/postnummerdok'        , 'postnummerdok.jade');
setupJadePage('/listerdok'            , 'listerdok.jade');
setupJadePage('/om'                   , 'om.jade');

//(\/[^\.])
app.get(/html$/i, function (req, res) {
  res.render('kort.jade', {url: decodeURIComponent(req.originalUrl.replace('.html','.json'))});
});

var cluster = require('cluster');
var workers = {};
var count = require('os').cpus().length;

var cluseringDisabled = process.env.clusteringDisabled === 'true';

if (cluster.isMaster && !cluseringDisabled) {
  for (var i = 0; i < count; i++) {
    spawn();
  }

  cluster.on('exit', function(worker, code, signal) {
    winston.info('worker %d died (%s %s). restarting...', worker.process.pid, signal, code);
    delete workers[worker.pid];
    spawn();
  });

} else {

  var listenPort = process.env.PORT || 3000;

  app.use('', dawaPgApi.setupRoutes());

  app.use(expressWinston.errorLogger({transports: expressLogTransports()}));

  app.listen(listenPort);
  winston.info("Express server listening on port %d in %s mode", listenPort, app.settings.env);
}


////////////////////////////////////////////////////////////////////////////////
//// Helper functions //////////////////////////////////////////////////////////
////////////////////////////////////////////////////////////////////////////////

function spawn(){
  var worker = cluster.fork();
  workers[worker.pid] = worker;
  return worker;
}

function setupLogging(app){
  require('winston-loggly');
  if (process.env.DAWALOGGLY){
    winston.add(winston.transports.Loggly, logglyOptions);
    winston.info("Production mode. Setting up Loggly logging %s", process.env.DAWALOGGLY);
  }
  app.use(expressWinston.logger({transports: expressLogTransports()}));
  winston.handleExceptions(new winston.transports.Console());
}

function expressLogTransports(){
  var transports = [];
  if (process.env.DAWALOGGLY){
    transports.push(new winston.transports.Loggly(logglyOptions));
  }
  transports.push(new winston.transports.Console());
  return transports;
}

function setupJadePage(path, page, optionsFun){
  app.get(path, function (req, res) {
    res.render(page, jadeDocumentationParams(req));
  });
}

function jadeDocumentationParams(req) {
  var protocol = req.connection.encrypted ? 'https' : 'http';
  return {url: protocol + '://' + req.headers.host,
          apiSpec: apiSpec,
          parameterDoc: parameterDoc,
          apiSpecUtil: apiSpecUtil,
          docUtil: docUtil};
}
