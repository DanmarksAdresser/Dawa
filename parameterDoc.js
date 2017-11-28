"use strict";

const _ = require('underscore');
const registry = require('./apiSpecification/registry');
require('./apiSpecification/allSpecs');

const allDocs = [
  ...require('./apidoc/adgangsadresse'),
  ...require('./apidoc/adresse'),
  ...require('./apidoc/autocomplete'),
  ...require('./apidoc/bebyggelse'),
  ...require('./apidoc/ejerlav'),
  ...require('./apidoc/jordstykke'),
  ...require('./apidoc/kommune'),
  ...require('./apidoc/navngivenvej'),
  ...require('./apidoc/ois'),
  ...require('./apidoc/opstillingskreds'),
  ...require('./apidoc/politikreds'),
  ...require('./apidoc/postnummer'),
  ...require('./apidoc/region'),
  ...require('./apidoc/retskreds'),
  ...require('./apidoc/senesteSekvensnummer'),
  ...require('./apidoc/sogn'),
  ...require('./apidoc/stednavn'),
  ...require('./apidoc/stednavntype'),
  ...require('./apidoc/storkreds'),
  ...require('./apidoc/supplerendebynavn'),
  ...require('./apidoc/valglandsdel'),
  ...require('./apidoc/vejnavn'),
  ...require('./apidoc/vejstykke'),
  ...require('./apidoc/vejstykkepostnummerrelation'),
  ...require('./apidoc/zone')
];

module.exports = allDocs.reduce((memo, doc) => {
  memo[doc.path] = doc;
  return memo;
}, {});

const allResources = registry.where({
  type: 'resource'
});

function addMultiParameters() {
  _.each(module.exports, function (doc, path) {
    const resourcePath = path.replace(/\{([^\{\}]+)}/g, ':$1');
    const resource = _.findWhere(allResources, {
      path: resourcePath
    });
    if (!resource) {
      throw new Error("Could not find a resource for path " + resourcePath);
    }
    const queryParameters = resource.queryParameters;
    const parameterSpecs = _.indexBy(queryParameters, 'name');
    doc.parameters = JSON.parse(JSON.stringify(doc.parameters)); // Clone!
    if (doc.nomulti !== true) {
      const docs = doc.parameters;
      const newDocs = _.map(docs,
        function (doc) {
          const name = doc.name;
          if (parameterSpecs[name] && parameterSpecs[name].multi === true) {
            doc.multi = true;
          }
        });
      docs.parameters = newDocs;
    }
  });
}

addMultiParameters();
