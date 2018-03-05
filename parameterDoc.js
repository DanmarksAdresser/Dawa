"use strict";

const _ = require('underscore');
const registry = require('./apiSpecification/registry');
require('./apiSpecification/allSpecs');

const allDocs =  require('./apidoc/all');

module.exports = allDocs.reduce((memo, doc) => {
  memo[doc.path] = doc;
  return memo;
}, {});

const allResources = registry.where({
  type: 'resource'
});

const allHttpHandlers = registry.where({
  type: 'httpHandler'
});

function addMultiParameters() {
  _.each(module.exports, function (doc, path) {
    const resourcePath = path.replace(/\{([^\{\}]+)}/g, ':$1');
    const resource = _.findWhere(allResources, {
      path: resourcePath
    });
    const httpHandler = _.findWhere(allHttpHandlers, {
      path: resourcePath
    });
    if (!resource && !httpHandler) {
      throw new Error("Could not find a resource for path " + resourcePath);
    }
    const queryParameters = resource ? resource.queryParameters : httpHandler.queryParameters;
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
