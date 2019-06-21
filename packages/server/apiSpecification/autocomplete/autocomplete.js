"use strict";

const _ = require('underscore');

const commonSchemaDefinitionsUtil = require('../commonSchemaDefinitionsUtil');
const husnrUtil = require('../husnrUtil');
const registry = require('../registry');
const resourcesUtil = require('../common/resourcesUtil');
const schema = require('../parameterSchema');
const adresseTextMatch = require('../adresseTextMatch');
const levenshtein = require('../levenshtein');
const commonParameters = require('../common/commonParameters');
const config = require('@dawadk/common/src/config/holder').getConfig();

const { go } = require('ts-csp');

require('../vejnavn/resources');
require('../adgangsadresse/resources');
require('../adresse/resources');

const globalSchemaObject = commonSchemaDefinitionsUtil.globalSchemaObject;

const formatHusnr = husnrUtil.formatHusnr;

function insertString(str, index, insertion) {
  if(index >= 0 && index <= str.length) {
    return str.substring(0, index) + insertion + str.substring(index, str.length);
  }
  else {
    return str + insertion;
  }
}

const ADDRESS_ELEMENT_WEIGHTS = {
  vejnavn: 1,
  husnr: 3,
  etage: 3,
  dør: 3,
  supplerendebynavn: 1,
  postnr: 3,
  postnrnavn: 1
};

const MAX_WEIGHT = 3;

const formatAdresseMultiline = (data, medsupplerendebynavn) => {
  let adresse = data.vejnavn;
  if (data.husnr) {
    adresse += ' ' + data.husnr;
  }
  if (data.etage || data['dør']) {
    adresse += ',';
  }
  if (data.etage) {
    adresse += ' ' + data.etage + '.';
  }
  if (data['dør']) {
    adresse += ' ' + data['dør'];
  }
  if (medsupplerendebynavn && data.supplerendebynavn) {
    adresse += '\n' + data.supplerendebynavn;
  }
  adresse += '\n' + data.postnr + ' ' + data.postnrnavn;
  return adresse;
}

const formatAdresse = (data, stormodtager, multiline, medsupplerendebynavn) => {
  if(stormodtager) {
    data = Object.assign({}, data, {postnr: data.stormodtagerpostnr, postnrnavn: data.stormodtagerpostnrnavn});
  }
  const multilineAdr = formatAdresseMultiline(data, medsupplerendebynavn);
  if(!multiline) {
    return multilineAdr.replace(/\n/g, ', ');
  }
  else {
    return multilineAdr;
  }
};


const processResultsStormodtagere = (result, params) => {
  const q = params.q;
  const medsupplerendebynavn = params.supplerendebynavn;
  return result.reduce(function (memo, wrapped) {
    if(params.stormodtagerpostnumre && wrapped.data.stormodtagerpostnr) {
      // Vi har modtaget et stormodtagerpostnr. Her vil vi gerne vise stormodtagerpostnummeret
      const stormodtagerEntry = Object.assign({}, wrapped, {stormodtagerpostnr: true});
      const stormodtagerTekst = formatAdresse(wrapped.data, true, false, medsupplerendebynavn);
      const nonStormodtagerTekst = formatAdresse(wrapped.data, false, false, medsupplerendebynavn);
      let rows = [];
      // Hvis brugeren har indtastet den almindelige adresse eksakt, så er der ingen
      // grund til at vise stormodtagerudgaven
      if (q !== stormodtagerTekst) {
        rows.push(wrapped);
      }

      // Hvis brugeren har indtastet stormodtagerudgaven af adressen eksakt, så viser vi
      // ikke den almindelige udgave
      if (q !== nonStormodtagerTekst) {
        rows.push(stormodtagerEntry);
      }

      // brugeren har indtastet stormodtagerpostnummeret, såvi viser stormodtager udgaven først.
      if (rows.length > 1 && q.indexOf(wrapped.data.stormodtagerpostnr) !== -1) {
        rows = [rows[1], rows[0]];
      }
      memo = memo.concat(rows);

      return memo;
    }
    else {
      memo.push(wrapped);
      return memo;
    }
  }, []);
};

/*
 * Format text for displaying in input field. Caret position should be ready for entering etage/dør.
 */
const formatIncompleteAdr = (adgadr, medsupplerendebynavn) => {
  const textBeforeCaret = adgadr.vejnavn + ' ' + adgadr.husnr + ', ';
  let textAfterCaret = '';
  if (medsupplerendebynavn && adgadr.supplerendebynavn) {
    textAfterCaret += ', ' + adgadr.supplerendebynavn;
  }
  textAfterCaret += ', ' + adgadr.postnr + ' ' + adgadr.postnrnavn;
  const caretpos = textBeforeCaret.length;
  const tekst = textBeforeCaret + textAfterCaret;
  return {
    caretpos, tekst
  }
};

var autocompleteResources = ['vejnavn', 'adgangsadresse', 'adresse'].reduce(function(memo, entity ) {
  memo[entity] = registry.findWhere({
    entityName: entity,
    type: 'resource',
    qualifier: 'autocomplete'
  });
  return memo;
}, {});

var postProcessFns = {
  vejnavn: (vejnavne, params) =>
    vejnavne.map(vejnavn => {

      let tekst = vejnavn.tekst;
      if (params.type !== 'vejnavn') {
        tekst += ' ';
      }

      return {
        type: 'vejnavn',
        tekst: tekst,
        forslagstekst: vejnavn.tekst,
        caretpos: tekst.length,
        data: vejnavn.vejnavn
      }
    }),
  adgangsadresse: (autocompleteAdgadrs, params) => {
    const medsupplerendebynavn = params.supplerendebynavn;
    const wrapped = autocompleteAdgadrs.map(adgadr => (
      {
        data: adgadr.adgangsadresse,
        stormodtagerpostnr: false,
        type: 'adgangsadresse'
      }));
    const withStormodtagere = params.stormodtagerpostnumre ?
      processResultsStormodtagere( wrapped, params) :
      wrapped;
    return withStormodtagere.map(wrapped => {
      const forslagstekst = formatAdresse(
        wrapped.data,
        wrapped.stormodtagerpostnr,
        params.multilinje,
        medsupplerendebynavn);
      const completeTekst = formatAdresse(
        wrapped.data,
        wrapped.stormodtagerpostnr,
        false,
        medsupplerendebynavn);
      let { caretpos, tekst} = params.type !== 'adgangsadresse' ?
        formatIncompleteAdr(wrapped.data, medsupplerendebynavn) :
        { caretpos: completeTekst.length, tekst: completeTekst};
      return Object.assign({}, wrapped, {
        tekst,
        forslagstekst,
        caretpos
      });
    })
  },
  adresse: (adrs, params) => {
    const medsupplerendebynavn = params.supplerendebynavn;
    const wrapped = adrs.map(adr => (
      {
        data: adr.adresse,
        stormodtagerpostnr: false,
        type: 'adresse'
      }));
    const withStormodtagere = params.stormodtagerpostnumre ?
      processResultsStormodtagere(wrapped,params) :
      wrapped;
    return withStormodtagere.map(wrapped => {
      const forslagstekst = formatAdresse(
        wrapped.data,
        wrapped.stormodtagerpostnr,
        params.multilinje,
        medsupplerendebynavn);
      const completeTekst = formatAdresse(
        wrapped.data,
        wrapped.stormodtagerpostnr,
        false,
        medsupplerendebynavn);
      return Object.assign({}, wrapped, {
        tekst: completeTekst,
        forslagstekst,
        caretpos: completeTekst.length
      });
    });

  }
};

const delegatedParameters = [
  {
    name: 'id',
    type: 'string',
    schema: schema.uuid
  },
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
];

var nonDelegatedParameters = [
  {
    name: 'q',
    type: 'string'
  },
  {
    name: 'fuzzy',
    type: 'boolean'
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
  },
  {
    name: 'startfra',
    type: 'string',
    defaultValue: 'vejnavn',
    schema: {
      enum: ['vejnavn', 'adgangsadresse', 'adresse']
    }
  },
  {
    name: 'supplerendebynavn',
    type: 'boolean',
    defaultValue: "true"
  },
  {
    name: 'stormodtagerpostnumre',
    type: 'boolean',
    defaultValue: "false"
  },
  {
    name: 'multilinje',
    type: 'boolean',
    defaultValue: "false"
  },
  {
    name: 'gældende',
    type: 'boolean',
    defaultValue: "false"
  }
].concat(commonParameters.format).concat(commonParameters.paging);

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
    mapper: (baseurl, params) => result => {
      if(result.length === 0) {
        return [];
      }
      // We assume all responses are of same type
      const entityName = result[0].type;
      const autocompleteMapper = autocompleteResources[entityName].representations.autocomplete.mapper(baseurl, params);
      const mappedResult = result.map(row => {
        return autocompleteMapper(row);
      });
      return postProcessFns[entityName](mappedResult, params);
    }
  }
};

function queryModel(client, entityName, params) {
  return go(function*() {
    const resource = autocompleteResources[entityName];
    var sqlModel = resource.sqlModel;
    var autocompleteRepresentation = resource.representations.autocomplete;
    var fieldNames = _.pluck(autocompleteRepresentation.fields, 'name');
    const result = yield this.delegateAbort(
      sqlModel.processQuery(client, fieldNames, params));
    return result.map(function(row) {
      row.type = entityName;
      return row;
    });
  });
}

function scoreAddressElement(addressText, searchText, weight) {
  addressText = addressText || '';
  searchText = searchText || '';
  if((addressText || '') === (searchText || '')) {
    return 0;
  }
  if(searchText === '') {
    return 1;
  }
  if(addressText.startsWith(searchText)) {
    return 2;
  }

  const levenshteinResult = levenshtein(addressText.toLowerCase(), searchText.toLowerCase(), 1, 1, 1);
  const ops = levenshteinResult.ops;
  const isPrefix = ops[ops.length-1].op === 'I';
  while(ops.length > 0 && ops[ops.length-1].op === 'I') {
    ops.length = ops.length-1;
  }
  const edits = ops.filter(op => op.op !== 'K').length;
  return 2 + edits * weight + (isPrefix ? 1 : 0);
}

const fieldFormatters = {
  husnr: formatHusnr,
  postnr: nr => '' + nr
};

const ADRESSE_FIELD_NAMES = {
  adgangsadresse: ['vejnavn', 'husnr', 'supplerendebynavn', 'postnr', 'postnrnavn'],
  adresse: ['vejnavn', 'husnr', 'etage', 'dør', 'supplerendebynavn', 'postnr', 'postnrnavn']
};

function computeVariants(autocompleteResult, fields) {
  const fieldsWithoutChoices = _.intersection(fields, ['husnr', 'etage', 'dør']);
  const baseChoice = fieldsWithoutChoices.reduce((memo, field) => {
    memo[field] = autocompleteResult[field];
    return memo;
  }, {});
  const vejnavnChoices = [{
    vejnavn: autocompleteResult.vejnavn
  }];
  if (autocompleteResult.adresseringsvejnavn &&
    autocompleteResult.adresseringsvejnavn !== autocompleteResult.vejnavn) {
    vejnavnChoices.push({
      vejnavn: autocompleteResult.adresseringsvejnavn
    });
  }

  const supplerendeBynavnChoices = [{
    supplerendebynavn: ''
  }];
  if(autocompleteResult.supplerendebynavn) {
    supplerendeBynavnChoices.push({
      supplerendebynavn: autocompleteResult.supplerendebynavn
    });
  }
  const postnrChoices = [{
    postnr: autocompleteResult.postnr,
    postnrnavn: autocompleteResult.postnrnavn
  }];
  if(autocompleteResult.stormodtagerpostnr) {
    postnrChoices.push({
      postnr: autocompleteResult.stormodtagerpostnr,
      postnrnavn: autocompleteResult.stormodtagerpostnrnavn
    });
  }

  const choicesList = [vejnavnChoices, supplerendeBynavnChoices, postnrChoices];
  const applyChoices = (variants, choices) => _.flatten(choices.map(choice =>
    variants.map(variant => Object.assign({}, variant, choice))
  ), true);

  return choicesList.reduce(
    (variants, choices) => applyChoices(variants, choices),
    [baseChoice]);
}

function formatVariant(variant, fields) {
  return  fields.reduce((memo, field) => {
    memo[field] = (fieldFormatters[field] || _.identity)(variant[field]);
    if(memo[field]) {
      memo[field] = memo[field].toLowerCase();
    }
    else {
      memo[field] = '';
    }
    return memo;
  }, {});
}

function computeProcessedResult(variant, searchText, fields) {
  const matchResult = adresseTextMatch(searchText, variant);
  const scores = fields.reduce((memo, field) => {
    memo[field] = scoreAddressElement(
      variant[field],
      matchResult.address[field],
      ADDRESS_ELEMENT_WEIGHTS[field]);
    return memo;
  }, {});

  const unknownTokenScore = matchResult.unknownTokens.reduce((memo, token) => {
    return memo + (2 + token.length * MAX_WEIGHT);
  }, 0);
  const totalScore = Object.keys(scores).reduce((memo, key) => memo + scores[key], 0) + unknownTokenScore;
  const processedResult = {
    variant: variant,
    matchResult: matchResult,
    scores: scores,
    unknownTokenScore: unknownTokenScore,
    totalScore: totalScore
  };
  return processedResult;
}

function process(autocompleteResult, searchText, fields) {
  const unformattedVariants = computeVariants(autocompleteResult, fields);

  const variants = unformattedVariants.map(variant => formatVariant(variant, fields));
  const processedResults = variants.map(variant => computeProcessedResult(variant, searchText, fields));
  let bestProcessedResult = processedResults[0];
  for(let processedResult of processedResults) {
    if(bestProcessedResult.totalScore > processedResult.totalScore) {
      bestProcessedResult = processedResult;
    }
  }
  return Object.assign(bestProcessedResult, {
    autocompleteResult: autocompleteResult
  });
}

function unprocess(processedResult) {
  return processedResult.autocompleteResult;
}

function compareStringsInsensitive(a, b) {
  return a < b ? -1 : a === b ? 0 : 1;
}


const nothingFirst = fn =>
  ((a, b) => {
    const aIsNothing = typeof(a) === 'undefined' || a === null || a === '';
    const bIsNothing = typeof(b) === 'undefined' || b === null || b === '';
    if(aIsNothing && bIsNothing) {
      return 0;
    }
    if(aIsNothing && !bIsNothing) {
      return -1;
    }
    if(!aIsNothing && bIsNothing) {
      return 1;
    }
    return fn(a, b);
  });


const comparators = {
  vejnavn: nothingFirst(compareStringsInsensitive),
  husnr: nothingFirst((a, b) => {
    if(a.tal === b.tal) {
      if(a.bogstav === b.bogstav) {
        return 0;
      }
      if(!a.bogstav) {
        return -1;
      }
      if(!b.bogstav) {
        return 1;
      }
      return a.bogstav < b.bogstav ? -1 : a.bogstav === b.bogstav ? 0 : 1;
    }
    return a.tal - b.tal;
  }),
  etage: nothingFirst((a, b) => {
    if(a === b) {
      return 0;
    }
    if(!a) {
      return -1;
    }
    if (!b) {
      return 1;
    }
    if(a.startsWith('kl') && !b.startsWith('kl')) {
      return -1;
    }
    if(!a.startsWith('kl') && b.startsWith('kl')) {
      return 1;
    }
    if(a.startsWith('kl') && b.startsWith('kl')) {
      if(a === 'kl') {
        return 1;
      }
      else if(b === 'kl') {
        return -1;
      }
      const aLevel = parseInt(a.charAt(2));
      const bLevel = parseInt(b.charAt(2));
      return bLevel - aLevel;
    }
    if(a === 'st') {
      return -1;
    }
    if(b === 'st') {
      return 1;
    }
    if(!isNaN(a)  && !isNaN(b)){
      return parseInt(a, 10) - parseInt(b, 10);
    }
    return compareStringsInsensitive(a, b);
  }),
  dør: nothingFirst((a, b) => {
    if(a === b) {
      return 0;
    }
    for (let val of ['tv', 'mf', 'th']) {
      if(a === val) {
        return -1;
      }
      if(b === val) {
        return 1;
      }
    }
    if(!isNaN(a) && isNaN(b)){
      return -1;
    }
    if(isNaN(a) && !isNaN(b)) {
      return 1;
    }
    if(!isNaN(a) && !isNaN(b)) {
      return a - b;
    }
    return compareStringsInsensitive(a, b);
  }),
  supplerendebynavn: nothingFirst(compareStringsInsensitive),
  postnr: nothingFirst((a, b) => {
    if(a === b) {
      return 0;
    }
    if(isNaN(a)) {
      return -1;
    }
    if(isNaN(b)) {
      return 1;
    }
    return a - b;
  }),
  postnrnavn: nothingFirst(compareStringsInsensitive)
};

function compareProcessedResults(a, b) {
  if(a.totalScore !== b.totalScore) {
    return a.totalScore - b.totalScore;
  }
  for(let field of ['vejnavn', 'husnr', 'etage', 'dør', 'postnr', 'supplerendebynavn']) {
    const compareResult = comparators[field](a.autocompleteResult[field],
      b.autocompleteResult[field]);
    if(compareResult !== 0) {
      return compareResult;
    }
  }
  return 0;
}

function prepareQuery(params) {
  const delegatedParameterNames = _.pluck(delegatedParameters, 'name');
  const delegatedParameterValues = delegatedParameterNames.reduce(
    (memo, paramName) => {
      if(params.hasOwnProperty(paramName)) {
        memo[paramName] = params[paramName];
      }
      return memo;
    }, {});
  const q = params.q;
  const fuzzyEnabled = params.fuzzy;
  const caretpos = params.caretpos;
  let regularSearchQuery = q;
  if (caretpos > 0 && caretpos <= q.length) {
    if (caretpos === q.length || _.contains([' ', '.', ','], q.charAt(caretpos))) {
      regularSearchQuery = insertString(q, caretpos, '*');
    }
  }
  return Object.assign(
    {
      q: regularSearchQuery,
      fuzzy: fuzzyEnabled,
      per_side: 200,
      side: 1,
      autocomplete: true
    },
    params.gældende ? {status: 1} : {},
    delegatedParameterValues
  );
}

function processVejnavn(autocompleteResult, searchText) {
  const score = scoreAddressElement(autocompleteResult.navn, searchText, 1);
  return {
    score: score,
    autocompleteResult: autocompleteResult
  };
}

function unprocessVejnavn(processedVejnavn) {
  return processedVejnavn.autocompleteResult;
}

const queryVejnavn = (client, params) => {
  return go(function*() {
    if(!params.q) {
      return [];
    }
    var shouldDoFuzzySearch = params.fuzzy &&  !/\d/.test(params.q);
    params = Object.assign({}, params, {
      fuzzy: shouldDoFuzzySearch
    });
    const regularSearchParams = prepareQuery(params);

    const result = yield this.delegateAbort(
      queryModel(client, 'vejnavn', regularSearchParams)
    );
    const processedResult = result.map(result => processVejnavn(result, params.q));

    const vejnavnComparator = (a, b) => {
      if(a.score === b.score) {
        const whitespaceRegex = /[\. ,]/g;
        return a.autocompleteResult.navn.replace(whitespaceRegex, '').localeCompare(b.autocompleteResult.navn.replace(whitespaceRegex, ''));
      }
      return a.score - b.score;
    };

    processedResult.sort(vejnavnComparator);

    processedResult.length = Math.min(processedResult.length, params.per_side);
    return processedResult.map(unprocessVejnavn);
  });
};

const sortAdresse = (entityName, q, per_side, unsortedResults) => {
  const processedResult = unsortedResults.map(result => process(result, q, ADRESSE_FIELD_NAMES[entityName]));
  processedResult.sort(compareProcessedResults);
  processedResult.length = Math.min(processedResult.length, per_side);
  return processedResult.map(unprocess);
};

const queryAdresse = (entityName, client, params, lastEntity) => {
  return go(function*() {
    if(!params.q && !params.id) {
      return [];
    }

    // disable fuzzy in adgangsadresse search unless it is the last searched entity
    if(!lastEntity) {
      params = Object.assign({}, params);
      delete params.fuzzy;
    }

    const regularSearchParams = prepareQuery(params);
    const queryResult = yield this.delegateAbort(queryModel(client, entityName, regularSearchParams));
    if(params.q) {
      return sortAdresse(entityName, params.q, params.per_side, queryResult);
    }
    else {
      return queryResult;
    }
  });
};

const shouldProceed = {
  vejnavn: (result, params) =>
    result.length === 1 && params.q.toLowerCase().startsWith(result[0].navn.toLowerCase()),
  adgangsadresse: (result, params) => result.length <= 1
};

const entityTypes = ['vejnavn', 'adgangsadresse', 'adresse'];

const queryFns = {
  vejnavn: (client, params) => queryVejnavn(client, params),
  adgangsadresse: (client, params, lastEntity) => queryAdresse('adgangsadresse', client, params, lastEntity),
  adresse: (client, params, lastEntity) => queryAdresse('adresse', client, params, lastEntity)
};

const sqlModel = {
  allSelectableFields: [],
  processQuery: function(client, fieldNames, params) {
    return client.withReservedSlot(() => go(function*() {
      const startfra = params.id ? params.type : params.adgangsadresseid ? 'adresse' : (params.startfra || 'vejnavn');

      // If adgangsadresseid parameter is supplied, we ignore type parameter
      // this is not quite correct, but some client depends on it.
      const slutmed = params.adgangsadresseid ? 'adresse' : (params.type || 'adresse');
      if(entityTypes.indexOf(startfra) > entityTypes.indexOf(slutmed)) {
        return [[]];
      }
      const searchedEntities = entityTypes.slice(entityTypes.indexOf(startfra), entityTypes.indexOf(slutmed)+1);
      for(let entityName of searchedEntities) {
        const lastEntity = entityName === searchedEntities[searchedEntities.length - 1];
        const result = yield this.delegateAbort(queryFns[entityName](client, params, lastEntity));
        if( lastEntity ||
          (result.length > 0 && !shouldProceed[entityName](result, params))) {
          return [result];
        }
      }
    }), config.get('autocomplete.query_slot_timeout'));
  }
};

const autocompleteResource = {
  path: '/autocomplete',
  pathParameters: [],
  queryParameters: allParameters,
  representations: representations,
  sqlModel: sqlModel,
  singleResult: true,
  chooseRepresentation: resourcesUtil.chooseRepresentationForAutocomplete,
  processParameters: resourcesUtil.applyDefaultPagingForAutocomplete,
  disableStreaming: true
};

module.exports = {
  autocompleteResource: autocompleteResource,
  scoreAddressElement: scoreAddressElement,
  sortAdresse: sortAdresse
};

registry.add('autocomplete', 'representation', 'autocomplete', representations.autocomplete);
registry.add('autocomplete', 'resource', 'autocomplete', autocompleteResource);
