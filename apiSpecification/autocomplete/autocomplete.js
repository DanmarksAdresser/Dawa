"use strict";

var q = require('q');
var _ = require('underscore');

var commonSchemaDefinitionsUtil = require('../commonSchemaDefinitionsUtil');
var commonParameters = require('../common/commonParameters');
var logger = require('../../logger').forCategory('autocomplete');
var registry = require('../registry');
var resourcesUtil = require('../common/resourcesUtil');
var schema = require('../parameterSchema');

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

var mappers = {
  vejnavn: function(vejnavn, targetType) {
    var tekst = vejnavn.tekst;
    if(targetType !== 'vejnavn') {
      tekst += ' ';
    }

    return {
      type: 'vejnavn',
      tekst: tekst,
      forslagstekst: vejnavn.tekst,
      caretpos: tekst.length,
      data: vejnavn.vejnavn
    };
  },
  adgangsadresse: function(autocompleteAdgadr, targetType) {
    var adgadr = autocompleteAdgadr.adgangsadresse;
    var caretpos, tekst;
    if(targetType !== 'adgangsadresse') {
      var textBeforeCaret =  adgadr.vejnavn + ' ' + adgadr.husnr + ', ';
      var textAfterCaret = '';
      if(adgadr.supplerendebynavn) {
        textAfterCaret += ', ' + adgadr.supplerendebynavn;
      }
      textAfterCaret += ', ' + adgadr.postnr + ' ' + adgadr.postnrnavn;
      caretpos = textBeforeCaret.length;
      tekst = textBeforeCaret + textAfterCaret;
    }
    else {
      tekst = autocompleteAdgadr.tekst;
      caretpos = tekst.length;
    }
    return {
      type: 'adgangsadresse',
      tekst: tekst,
      forslagstekst: autocompleteAdgadr.tekst,
      caretpos: caretpos,
      data: adgadr
    };
  },
  adresse: function(adr) {
    return {
      type: 'adresse',
      tekst: adr.tekst,
      forslagstekst: adr.tekst,
      caretpos: adr.tekst.length,
      data: adr.adresse
    };
  }
};

var delegatedParameters = [
  {
    name: 'adgangsadresseid',
    type: 'string',
    schema: schema.uuid
  },
  {
    name: 'kommunekode',
    type: 'integer',
    schema: schema.kode4,
    multi: true
  },
  {
    name: 'postnr',
    type: 'integer',
    schema: schema.postnr,
    multi: true
  }
].concat(commonParameters.format).concat(commonParameters.paging);

var nonDelegatedParameters = [
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

var allParameters = delegatedParameters.concat(nonDelegatedParameters);

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
        },
        data: {
          description: 'Udvalgte datafelter for vejnavnet, adgangsadressen eller adressen der returneres.',
          type: 'object'
        }
      },
      docOrder: ['type', 'tekst', 'caretpos', 'forslagstekst', 'data']
    }),
    mapper: function(baseurl, params) {
      return function(row) {
        var entityName = row.type;
        var autocompleteMapper = autocompleteResources[entityName].representations.autocomplete.mapper(baseurl, params);
        var mapped = autocompleteMapper(row);
        return mappers[row.type](mapped,params.type);
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

function queryFromAdresse(client, sqlParams) {
  return queryModel(client, 'adresse', sqlParams);
}

function queryFromAdgangsadresse(client, type, sqlParams) {
  return queryModel(client, 'adgangsadresse', sqlParams).then(function (result) {
    if (result.length > 1 || type === 'adgangsadresse') {
      return result;
    }
    else {
      return queryFromAdresse(client, sqlParams);
    }
  });
}

function queryFromVejnavn(client, type, sqlParams) {
  return queryModel(client, 'vejnavn', sqlParams).then(function (result) {
    if (result.length > 1 || type === 'vejnavn') {
      return result;
    }
    else {
      return queryFromAdgangsadresse(client, type, sqlParams);
    }
  });
}

var sqlModel = {
  allSelectableFields: [],
  query: function(client, fieldNames, params, callback) {
    var caretpos = params.caretpos;
    var queryParam = params.q;
    if (caretpos > 0 && caretpos <= queryParam.length) {
      if (caretpos === queryParam.length || _.contains([' ', '.', ','], queryParam.charAt(caretpos))) {
        queryParam = insertString(queryParam, caretpos, '*');
      }
    }
    var sqlParams = _.reduce(delegatedParameters, function(memo, param) {
      memo[param.name] = params[param.name];
      return memo;
    }, {search: queryParam});

    return q()
      .then(function () {
        if (params.adgangsadresseid) {
          return queryFromAdresse(client, sqlParams);
        }
        else {
          return queryFromVejnavn(client, params.type, sqlParams);
        }
      })
      .then(function (result) {
        if (result.length === 0) {
          logger.info('EmptyResult', params);
        }
        return result;
      }).nodeify(callback);
  }
};

module.exports = {
  path: '/autocomplete',
  pathParameters: [],
  queryParameters: allParameters,
  representations: representations,
  sqlModel: sqlModel,
  singleResult: false,
  chooseRepresentation: resourcesUtil.chooseRepresentationForAutocomplete,
  processParameters: resourcesUtil.applyDefaultPagingForAutocomplete,
  disableStreaming: true
};

registry.add('autocomplete', 'representation', 'autocomplete', representations.autocomplete);
registry.add('autocomplete', 'resource', 'autocomplete', module.exports);