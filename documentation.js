"use strict";

var express = require('express');
var fs = require('fs');
var parameterDoc = require('./parameterDoc');
var paths = require('./apiSpecification/paths');
var docUtil = require('./docUtil');
var registry = require('./apiSpecification/registry');
var _ = require('underscore');
var schemaUtil = require('./apiSpecification/schemaUtil');

require('./apiSpecification/allSpecs');
const allPages = require('./apidoc/all-pages');

/*jslint stupid: true */
/*stupid:true makes JSLint allow use of .readFileSync */
var packageJson = JSON.parse(fs.readFileSync(__dirname + '/package.json'));
/*jslint stupid: false */

var app = express();
app.set('views', __dirname + '/views');
app.set('view engine', 'pug');

var jsonSchemas = _.reduce(registry.entriesWhere({
  type: 'representation',
  qualifier: 'json'
}), function (memo, entry) {
  if (entry.object.schema) {
    memo[entry.entityName] = schemaUtil.compileSchema(entry.object.schema);
  }
  return memo;
}, {});

var autocompleteSchemas = _.reduce(registry.entriesWhere({
  type: 'representation',
  qualifier: 'autocomplete'
}), function (memo, entry) {
  memo[entry.entityName] = schemaUtil.compileSchema(entry.object.schema);
  return memo;
}, {});

function pugDocumentationParams(req) {
  return {
    url: paths.baseUrl(req),
    path: req.path,
    jsonSchemas: jsonSchemas,
    autocompleteSchemas: autocompleteSchemas,
    parameterDoc: parameterDoc,
    docUtil: docUtil,
    packageJson: packageJson
  };
}

function setupPugPage(path, page) {
  app.get(path, function (req, res) {
    res.render(page, pugDocumentationParams(req));
  });
}

const setupApidocDetails = (page ) => {
  const path = `/dok/api/${page.entity}`;
  app.get(path, function (req, res) {
    res.render('apidoc-detaljer', Object.assign(pugDocumentationParams(req), {page}));
  });
};

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

for(let område of ['adresser', 'dagi', 'bbr', 'matrikelkortet', 'stednavne']) {
  setupPugPage(`/dok/${område}`, `områder/${område}.pug`);

}
setupPugPage('/', 'forside.pug');
setupPugPage('/dok/om', 'om.pug');
setupPugPage('/dok/api', 'apidoc-oversigt.pug');
setupPugPage('/dok/api/generelt', 'generelt.pug');
setupPugPage('/dok/guides', 'guides.pug');
setupPugPage('/dok/release-noter', 'release-noter.pug');
for(let guide of ['introduktion', 'autocomplete', 'datavask', 'replikering', 'autocomplete-old']) {
  setupPugPage(`/dok/guide/${guide}`, `guide/${guide}.pug`);
}
setupPugPage('/dok/faq', 'faq.pug');

for(let page of allPages) {
  setupApidocDetails(page);
}

setupSchemaPage('/replikeringdok/schema.json');

const redirects = [
  ['/autocompletedok', '/dok/guide/autocomplete'],
  ['/generelt', '/dok/api/generelt'],
  ['/adressedok', '/dok/api/adresse'],
  ['/adgangsadressedok', '/dok/api/adgangsadresse'],
  ['/vejedok', '/dok/api/vejstykke'],
  ['/postnummerdok', '/dok/api/postnummer'],
  ['/om', '/dok/om'],
  ['/listerdok', '/dok/api'],
  ['/bbrlightdok', '/dok/bbr'],
  ['/replikeringdok', '/dok/guide/replikering']
];

for(let [oldPath, newPath] of redirects) {
  app.get(oldPath, function (req, res) {
    res.redirect(newPath);
  });

}

module.exports = app;
