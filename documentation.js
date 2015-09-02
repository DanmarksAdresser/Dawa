"use strict";

var express = require('express');
var fs = require('fs');
var parameterDoc   = require('./parameterDoc');
var paths = require('./apiSpecification/paths');
var docUtil        = require('./docUtil');
var registry = require('./apiSpecification/registry');
var _ = require('underscore');
var schemaUtil = require('./apiSpecification/schemaUtil');

require('./apiSpecification/allSpecs');

/*jslint stupid: true */
/*stupid:true makes JSLint allow use of .readFileSync */
var packageJson = JSON.parse(fs.readFileSync(__dirname + '/package.json'));
/*jslint stupid: false */

var app = express();
app.set('views', __dirname + '/views');
app.set('view engine', 'jade');

app.get('/', function (req, res) {
  res.render('home.jade', {url: paths.baseUrl(req)});
});

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

function jadeDocumentationParams(req) {
  return {url: paths.baseUrl(req),
    jsonSchemas: jsonSchemas,
    autocompleteSchemas: autocompleteSchemas,
    parameterDoc: parameterDoc,
    docUtil: docUtil,
    packageJson: packageJson
  };
}

function setupJadePage(path, page){
  app.get(path, function (req, res) {
    res.render(page, jadeDocumentationParams(req));
  });
}

function setupSchemaPage(path) {
  var source2name = {
    postnumre: 'postnummer_hændelse',
    vejstykker: 'vejstykke_hændelse',
    adgangsadresser: 'adgangsadresse_hændelse',
    adresser: 'adresse_hændelse',
    ejerlav: 'ejerlav_hændelse',
    regionstilknytninger: 'regionstilknytning_hændelse',
    kommunetilknytninger: 'kommunetilknytning_hændelse',
    postnummertilknytninger: 'postnummertilknytning_hændelse',
    sognetilknytninger: 'sognetilknytning_hændelse',
    politikredstilknytninger: 'politikredstilknytning_hændelse',
    opstillingskredstilknytninger: 'opstillingskredstilknytning_hændelse',
    valglandsdelstilknytninger: 'valglandsdelstilknytning_hændelse',
    zonetilknytninger: 'zonetilknytning_hændelse',
    jordstykketilknytninger: 'jordstykketilknytning_hændelse'
  };

  var docSchemas = {};
  Object.keys(source2name).forEach(function (tableName) {
    docSchemas[tableName] = {
      source: 'http://dawa.aws.dk/replikering/' + tableName,
      schema: docUtil.extractDocumentationForObject(jsonSchemas[source2name[tableName]])
    };
  });

  var schemas = new Buffer(JSON.stringify(docSchemas, null, '\t'));

  app.get(path, function (req, res) {
    res.setHeader("Content-Type", "application/json; charset=utf-8");
    res.end(schemas);
  });
}

setupJadePage('/autocompletedok'             , 'autocompletedok.jade');
setupJadePage('/generelt'             , 'generelt.jade');
setupJadePage('/adressedok'           , 'adressedok.jade');
setupJadePage('/adgangsadressedok'    , 'adgangsadressedok.jade');
setupJadePage('/vejedok'              , 'vejedok.jade');
setupJadePage('/postnummerdok'        , 'postnummerdok.jade');
setupJadePage('/listerdok'            , 'listerdok.jade');
setupJadePage('/om'                   , 'om.jade');
setupJadePage('/replikeringdok', 'replikeringdok.jade');
setupSchemaPage('/replikeringdok/schema.json');

module.exports = app;
