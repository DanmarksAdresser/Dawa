"use strict";

var q = require('q');
var _ = require('underscore');

var commonSchemaDefinitionsUtil = require('../commonSchemaDefinitionsUtil');
var registry = require('../registry');
var resourcesUtil = require('../common/resourcesUtil');

var globalSchemaObject = commonSchemaDefinitionsUtil.globalSchemaObject;

function insertString(str, index, insertion) {
  if(index >= 0 && index <= str.length) {
    return str.substring(0, index) + insertion + str.substring(index, str.length);
  }
  else {
    return str + insertion;
  }
}

var autocompleteResources = ['vejnavn', 'adgangsadresse', 'adresse'].reduce(function(memo, entity ) {
  memo[entity] = registry.findWhere({
    entityName: entity,
    type: 'resource',
    qualifier: 'autocomplete'
  });
  return memo;
}, {});

// this nested map supplies functions for computing caret positions.
// First level is the target type, second level is the type of a choice in the autocomplete dropdown.
// No entry indicates caret should be positioned at the end of the text
var caretpositions = {
  adresse: {
    adgangsadresse: function(adgAdr) {
      // we position the caret, such that it is ready to enter etage and dør
      var textBeforeCaret =  adgAdr.vejnavn + ' ' + adgAdr.husnr + ', ';
      return textBeforeCaret.length;
    }
  }
};


var parameters = [
  {
    name: 'q',
    type: 'string',
    required: true
  },
  {
    name: 'caretpos',
    type: 'integer'
  },
  {
    name: 'type',
    type: 'string',
    defaultValue: 'adresse',
    schema: {
      enum: ['vejnavn', 'adgangsadresse', 'adresse']
    }
  }
];

var representations = {
  autocomplete: {
    fields: [],
    schema: globalSchemaObject({
      properties: {
        type: {
          description: 'Forslagets type: "vejnavn", "adgangsadresse" eller "adresse"',
          type: 'string'
        },
        tekst: {
          description: 'Den tekst, som input-feltet skal udfyldes med, hvis brugeren vælger forslaget',
          type: 'string'
        },
        caretpos: {
          description: 'Den position hvor careten (cursoren) skal placeres i inputfeltet, hvis brugeren vælger forslaget',
          type: 'integer'
        },
        forslagstekst: {
          description: 'Den tekst, der skal vises for dette forslag. Kan afvige fra den tekst der skal udfyldes i input-feltet.',
          type: 'integer'
        }
      },
      docOrder: ['type', 'tekst', 'caretpos', 'forslagstekst']
    }),
    mapper: function(baseurl, params) {
      return function(row) {
        var entityName = row.type;
        var autocompleteMapper = autocompleteResources[entityName].representations.autocomplete.mapper(baseurl, params);
        var mapped = autocompleteMapper(row);
        var caretpos;
        if(caretpositions[params.type] && caretpositions[params.type][entityName]) {
          caretpos = caretpositions[params.type][entityName](mapped[entityName]);
        }
        else {
          caretpos = mapped.tekst.length;
        }
        return {
          type: entityName,
          tekst: mapped.tekst,
          forslagstekst: mapped.tekst,
          caretpos: caretpos,
          data: mapped[entityName]
        };
      };
    }
  }
};

function queryModel(client, entityName, params) {
  var resource = autocompleteResources[entityName];
  var sqlModel = resource.sqlModel;
  var autocompleteRepresentation = resource.representations.autocomplete;
  var fieldNames = _.pluck(autocompleteRepresentation.fields, 'name');

  return q.ninvoke(sqlModel, 'query', client, fieldNames, params).then(function(result) {
    return result.map(function(row) {
      row.type = entityName;
      return row;
    });
  });
}

var sqlModel = {
  allSelectableFields: [],
  query: function(client, fieldNames, params, callback) {
    var caretpos = params.caretpos;
    var q = params.q;
    var type = params.type;
    if (caretpos > 0 && caretpos <= q.length) {
      if (caretpos === q.length || _.contains([' ', '.', ','], q.charAt(caretpos))) {
        q = insertString(q, caretpos, '*');
      }
    }
    var sqlParams = {
      search: q
    };
    return queryModel(client, 'vejnavn', sqlParams).then(function (result) {
      if (result.length > 1 || type === 'vejnavn') {
        return result;
      }
      else {
        return queryModel(client, 'adgangsadresse', sqlParams).then(function (result) {
          if (result.length > 1 || type === 'adgangsadresse') {
            return result;
          }
          else return queryModel(client, 'adresse', sqlParams);
        });
      }
    }).nodeify(callback);
  }
};

module.exports = {
  path: '/autocomplete',
  pathParameters: [],
  queryParameters: parameters,
  representations: representations,
  sqlModel: sqlModel,
  singleResult: false,
  chooseRepresentation: resourcesUtil.chooseRepresentationForAutocomplete,
  processParameters: resourcesUtil.applyDefaultPagingForAutocomplete,
  disableStreaming: true
};

registry.add('autocomplete', 'resource', 'autocomplete', module.exports);