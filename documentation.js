"use strict";

var express = require('express');
var parameterDoc   = require('./parameterDoc');
var docUtil        = require('./docUtil');
var registry = require('./apiSpecification/registry');
var _ = require('underscore');
var schemaUtil = require('./apiSpecification/schemaUtil');

function setupJadePage(path, page){
  app.get(path, function (req, res) {
    res.render(page, jadeDocumentationParams(req));
  });
}

function jadeDocumentationParams(req) {
  var jsonSchemas = _.reduce(registry.entriesWhere({
    type: 'representation',
    qualifier: 'json'
  }), function(memo, entry) {
    memo[entry.entityName] = schemaUtil.compileSchema(entry.object.schema);
    return memo;
  }, {});

  var autocompleteSchemas = _.reduce(registry.entriesWhere({
    type: 'representation',
    qualifier: 'autocomplete'
  }), function(memo, entry) {
    memo[entry.entityName] = schemaUtil.compileSchema(entry.object.schema);
    return memo;
  }, {});

  var protocol = req.connection.encrypted ? 'https' : 'http';
  return {url: protocol + '://' + req.headers.host,
    jsonSchemas: jsonSchemas,
    autocompleteSchemas: autocompleteSchemas,
    parameterDoc: parameterDoc,
    docUtil: docUtil};
}

var app = express();
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

module.exports = app;