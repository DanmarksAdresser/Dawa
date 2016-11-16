"use strict";

var _ = require('underscore');

/**
 * Et register over  forskellige typer af objekter der definerer DAWA APIet.
 * Hvert  objekt har tilknyttede metadata
 *  - entityName: hvilken entitet relaterer objektet sig til (adresse, adgangsadresse, ejerlav m.v)
 *  - type: Hvilken slags objekt er det ('nameAndKey', 'resource', 'representation', 'sqlModel')
 *  - qualifier: Nærmere specifikation af objektet (f.eks. for representation: 'flat', 'json', 'autocomplete')
 */

var registry = [];

exports.add = function(entityName, type, qualifier, object) {
  registry.push({
    entityName: entityName,
    type: type,
    qualifier: qualifier,
    object: object
  });
};

exports.addMultiple = function (entityName, type, objectMap) {
  _.each(objectMap, function (object, qualifier) {
    const key = {
      entityName: entityName,
      type: type,
      qualifier: qualifier
    };
    if(exports.findWhere(key)) {
      throw new Error("Attempted to overwrite an entry in registry: " + JSON.stringify(key));
    }
    exports.add(entityName,
      type,
      qualifier,
      object
    );
  });
};

exports.entriesWhere = function(spec) {
  return _.where(registry, spec);
};

exports.where = function(spec) {
  return _.pluck(exports.entriesWhere(spec), 'object');
};

exports.findWhere = function(spec) {
  var entry = _.findWhere(registry, spec);
  if(entry) {
    return entry.object;
  }
  return undefined;
};

exports.get = function(spec) {
  var entry = _.findWhere(registry, spec);
  if(entry) {
    return entry.object;
  }
  else {
    throw new Error('Registry entry not found: ' + JSON.stringify(spec));
  }
};
