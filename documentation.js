"use strict";

var express = require('express');
var fs = require('fs');
var parameterDoc   = require('./parameterDoc');
var paths = require('./apiSpecification/paths');
var docUtil        = require('./docUtil');
var registry = require('./apiSpecification/registry');
var _ = require('underscore');
var schemaUtil = require('./apiSpecification/schemaUtil');

var packageJson = JSON.parse(fs.readFileSync(__dirname + '/package.json'));

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
    if(entry.object.schema) {
      memo[entry.entityName] = schemaUtil.compileSchema(entry.object.schema);
    }
    return memo;
  }, {});

  var autocompleteSchemas = _.reduce(registry.entriesWhere({
    type: 'representation',
    qualifier: 'autocomplete'
  }), function(memo, entry) {
    memo[entry.entityName] = schemaUtil.compileSchema(entry.object.schema);
    return memo;
  }, {});

  return {url: paths.baseUrl(req),
    jsonSchemas: jsonSchemas,
    autocompleteSchemas: autocompleteSchemas,
    parameterDoc: parameterDoc,
    docUtil: docUtil,
    packageJson: packageJson
  };
}

var app = express();
app.set('views', __dirname + '/views');
app.set('view engine', 'jade');

app.get('/', function (req, res) {
  res.render('home.jade', {url: paths.baseUrl(req)});
});

setupJadePage('/generelt'             , 'generelt.jade');
setupJadePage('/adressedok'           , 'adressedok.jade');
setupJadePage('/adgangsadressedok'    , 'adgangsadressedok.jade');
setupJadePage('/vejedok'              , 'vejedok.jade');
setupJadePage('/supplerendebynavndok' , 'supplerendebynavndok.jade');
setupJadePage('/postnummerdok'        , 'postnummerdok.jade');
setupJadePage('/listerdok'            , 'listerdok.jade');
setupJadePage('/om'                   , 'om.jade');

module.exports = app;