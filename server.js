"use strict";

var express             = require("express");
var dawaPgApi           = require('./dawaPgApi');
var apiSpec             = require('./apiSpec');
var apiSpecUtil         = require('./apiSpecUtil');
var parameterDoc        = require('./parameterDoc');
var docUtil             = require('./docUtil');

var app = express();

var cluseringDisabled = process.env.clusteringDisabled === 'true';

app.use(express.logger('[:date - :response-time] :remote-addr -- ":method :url HTTP/:http-version" :status :res[content-length] ":referrer" ":user-agent"'));
app.use(express.compress());
app.use(express.static(__dirname + '/public', {maxAge: 86400000}));
app.set('views', __dirname + '/views');
app.set('view engine', 'jade');

function jadeDocumentationParams(req) {
  var protocol = req.connection.encrypted ? 'https' : 'http';
  return {url: protocol + '://' + req.headers.host, apiSpec: apiSpec, parameterDoc: parameterDoc, apiSpecUtil: apiSpecUtil, docUtil: docUtil};
}

app.get('/', function (req, res) {
  res.render('home.jade', {url: req.headers.host});
});

app.get('/generelt', function (req, res) {
  res.render('generelt.jade', jadeDocumentationParams(req));
});

app.get('/adressedok', function (req, res) {
  res.render('adressedok.jade', jadeDocumentationParams(req));
});

app.get('/adgangsadressedok', function (req, res) {
  res.render('adgangsadressedok.jade', jadeDocumentationParams(req));
});


app.get('/vejedok', function (req, res) {
  res.render('vejedok.jade', jadeDocumentationParams(req));
});

app.get('/supplerendebynavndok', function (req, res) {
  res.render('supplerendebynavndok.jade', jadeDocumentationParams(req));
});

app.get('/postnummerdok', function (req, res) {
  res.render('postnummerdok.jade', jadeDocumentationParams(req));
});

app.get('/listerdok', function (req, res) {
  res.render('listerdok.jade', jadeDocumentationParams(req));
});

app.get('/om', function (req, res) {
  res.render('om.jade');
});
//(\/[^\.])
app.get(/html$/i, function (req, res) {
  console.log('html url: '+req.originalUrl.replace('.html','.json') + ', ' + decodeURIComponent(req.originalUrl.replace('.html','.json')));
  res.render('kort.jade', {url: decodeURIComponent(req.originalUrl.replace('.html','.json'))});
});

var cluster = require('cluster');
var workers = {};
var count = require('os').cpus().length;

function spawn(){
  var worker = cluster.fork();
  workers[worker.pid] = worker;
  return worker;
}

if (cluster.isMaster && !cluseringDisabled) {
  for (var i = 0; i < count; i++) {
    spawn();
  }

  cluster.on('exit', function(worker, code, signal) {
    console.log('worker %d died (%s %s). restarting...', worker.process.pid, signal, code);
    delete workers[worker.pid];
    spawn();
  });

} else {

  var listenPort = process.env.PORT || 3000;

  app.use('', dawaPgApi.setupRoutes());

  app.listen(listenPort);
  console.log("Express server listening on port %d in %s mode", listenPort, app.settings.env);
}
