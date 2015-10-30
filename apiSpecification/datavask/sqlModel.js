"use strict";

var q = require('q');
var _ = require('underscore');

var adresseTextMatch = require('../adresseTextMatch');
var columnsMap = require('./columns');
var dbapi = require('../../dbapi');
var levenshtein = require('../levenshtein');
var parameters = require('./parameters');
var registry = require('../registry');
var sqlParameterImpl = require('../common/sql/sqlParameterImpl');
var sqlUtil = require('../common/sql/sqlUtil');
var util = require('../util');


var assembleSqlModel = sqlUtil.assembleSqlModel;
var kode4String = util.kode4String;


function adressebetegnelseSql(adgangsadresse, includeSuppBynavn) {
  return `adressebetegnelse(vejnavn, (husnr).tal || COALESCE((husnr).bogstav, ''), ${adgangsadresse ? 'NULL' : 'etage'}, ${adgangsadresse ? 'NULL' : 'doer'}, ${includeSuppBynavn ? 'supplerendebynavn' : 'NULL'}, to_char(vask_${adgangsadresse ? 'adgangsadresse' : 'adresse'}r.postnr, 'FM0000'), postnrnavn)`;
}

function formatAdresseFields(row, adgangOnly) {
  if(!row) {
    return null;
  }
  var result = {
    id: row.id,
    vejnavn: row.vejnavn,
    husnr: row.husnr,
    supplerendebynavn: row.supplerendebynavn ? row.supplerendebynavn : null,
    postnr: kode4String(row.postnr),
    postnrnavn: row.postnrnavn
  };
  if(!adgangOnly) {
    result.etage = row.etage;
    result.dør = row.dør;
  }
  return result;
}

function formatAdresse(row, adgangOnly) {
  var result = formatAdresseFields(row, adgangOnly);
  result.status = row.status;
  return result;
}

function udenSupplerendeBynavn(adresse) {
  var result = _.clone(adresse);
  result.supplerendebynavn = null;
  return result;
}

function computeDifferences(adr1, adr2, adgangOnly) {
  var addressFieldNames = ['vejnavn', 'husnr', 'supplerendebynavn', 'postnr', 'postnrnavn'];
  if(!adgangOnly) {
    addressFieldNames = addressFieldNames.concat(['etage', 'dør']);
  }
  var differences = addressFieldNames.reduce((memo, field) => {
    if(typeof adr1[field] === 'string' && typeof adr2[field] === 'string') {
      memo[field] = levenshtein(('' + adr1[field]).toLowerCase(), adr2[field].toLowerCase(), 1, 1, 1).distance;
    }
    else if (typeof adr1[field] === 'string') {
      memo[field] = adr1[field].length;
    }
    else if(typeof adr2[field] === 'string') {
      memo[field] = adr2[field].length;
    }
    return memo;
  }, {});
  return differences;
}

function computeMatchResult(address, unwashedAddressText, adgangsadresseOnly) {
  var addressWithoutSupBynavn = udenSupplerendeBynavn(address);
  addressWithoutSupBynavn.supplerendebynavn = null;
  var distanceWithSupBynavn = levenshtein(util.adressebetegnelse(address).toLowerCase(), unwashedAddressText.toLowerCase(), 1, 1, 1).distance;
  var distanceWithoutSupBynavn = levenshtein(util.adressebetegnelse(addressWithoutSupBynavn).toLowerCase(), unwashedAddressText.toLowerCase(), 1, 1, 1).distance;
  var usedAddress = distanceWithSupBynavn < distanceWithoutSupBynavn ? address : addressWithoutSupBynavn;
  var parsedAddress = adresseTextMatch(unwashedAddressText, usedAddress);
  var differences = computeDifferences(parsedAddress, usedAddress);
  var differencesSum = Object.keys(differences).reduce(function(memo, value) {
    memo += differences[value];
    return memo;
  }, 0);
  var matchCategory;
  if(differencesSum === 0) {
    matchCategory = 'A';
  }
  else if(differences.husnr === 0 && differences.postnr === 0 &&
    (adgangsadresseOnly || (differences.etage === 0 && differences.dør === 0)) &&
  differences.vejnavn <= 3 && differences.vejnavn <= address.vejnavn.length * 2 / 3) {
    matchCategory = 'B'
  }
  else {
    matchCategory = 'C'
  }
  let result = {
    afstand: Math.min(distanceWithSupBynavn, distanceWithoutSupBynavn),
    kategori: matchCategory,
    forskelle: differences,
    parsetadresse: parsedAddress
  };
  return result;
}

function transformResult(row, adgangsadresseOnly, betegnelseParam) {
  var result = {};
  result.adresse = formatAdresse(row, adgangsadresseOnly);
  result.adresse.virkningstart = row.virkningstart;
  result.adresse.virkningslut = row.virkningslut;
  result.aktueladresse = formatAdresse(row.current, adgangsadresseOnly);
  var addressFields = formatAdresse(row, adgangsadresseOnly);
  result.vaskeresultat = computeMatchResult(addressFields, betegnelseParam, adgangsadresseOnly);
  return result;
}


function createSqlModel(entityName) {
  var columns = columnsMap[entityName]
  var baseQuery = function () {
    return {
      select: [],
      from: [`vask_${entityName}r`],
      whereClauses: [],
      groupBy: '',
      orderClauses: [],
      sqlParams: []
    };
  };
  function datavaskFuzzySearch(sqlParts, params) {
    var betegnelseAlias = dbapi.addSqlParameter(sqlParts, params.betegnelse);
    sqlParts.whereClauses.push("id IN " +
      "(SELECT id" +
      ` FROM vask_${entityName}r adg` +
      " JOIN (select kommunekode, vejkode, postnr" +
      " FROM vejstykkerpostnumremat vp" +
      ` ORDER BY tekst <-> ${betegnelseAlias} limit 15) as vp` +
      " ON adg.kommunekode = vp.kommunekode AND adg.vejkode = vp.vejkode AND adg.postnr = vp.postnr)");
    sqlParts.orderClauses.push(`least(levenshtein(lower(${adressebetegnelseSql(entityName === 'adgangsadresse', true)}), lower(${betegnelseAlias}), 2, 1, 3),` +
      ` levenshtein(lower(${adressebetegnelseSql(entityName === 'adgangsadresse', false)}), lower(${betegnelseAlias}), 2, 1, 3))`);
  }


  var commonParameterImpls = [
    sqlParameterImpl.simplePropertyFilter(parameters.propertyFilter, columns)];

  var searchParameterImpls =
    commonParameterImpls.concat([
      sqlParameterImpl.search(columns, ['id', 'virkningstart']),
      sqlParameterImpl.paging(columns, [])
    ]);

  var fuzzyParameterImpls = commonParameterImpls.concat([
    datavaskFuzzySearch,
    sqlParameterImpl.paging(columns, ['id', 'virkningstart'])
  ]);

  var searchSqlModel = assembleSqlModel(columns, searchParameterImpls, baseQuery);

  var fuzzySqlModel = assembleSqlModel(columns, fuzzyParameterImpls, baseQuery);

  function toResponse(category, transformedResults) {
    let results = transformedResults.filter((item) => item.vaskeresultat.kategori === category);
    results.forEach((item) => delete item.vaskeresultat.kategori);
    return [{
      kategori: category,
      resultater: results
    }]
  }

  return {
    allSelectableFieldNames: function (allFieldNames) {
      return sqlUtil.allSelectableFieldNames(allFieldNames, columns);
    },
    query: function (client, fieldNames, params, callback) {
      return q.async(function*() {
        // first we make a normal text search
        var searchParams = _.clone(params);
        delete searchParams.betegnelse;
        searchParams.search = params.betegnelse;
        searchParams.side = 1;
        searchParams.per_side=30;
        var searchResult = yield searchSqlModel.query(client, fieldNames, searchParams);

        if (searchResult.length === 0) {
          // we don't get any hits, use fuzzy search
          var fuzzyParams = _.clone(params);
          fuzzyParams.side = 1;
          fuzzyParams.per_side=30;
          searchResult = yield fuzzySqlModel.query(client, fieldNames, fuzzyParams);
        }

        var transformedResult = searchResult.map((row) => {
          return transformResult(row, entityName === 'adgangsadresse', params.betegnelse);
        });
        var categoryCounts = _.countBy(transformedResult, (result) => result.vaskeresultat.kategori);
        if(categoryCounts.A === 1) {
          return toResponse('A', transformedResult);
        }
        if(categoryCounts.B === 1) {
          var result = _.findWhere(transformedResult, (item) => item.vaskeresultat.kategori === 'B');
          // Hvis en adresse er skiftet, så den har fået tilknyttet et bogstav,
          // så kan vi ikke vide om den uvaskede adresse simpelthen mangler et bogstav - dette
          // er en almindelig fejl. Derfor nedgraderer vi til C.
          if(result.adresse.husnr != result.aktueladresse.husnr &&
            result.aktueladresse.husnr.match(`^${result.adresse.husnr}[A-Z]$`)) {
            result.vaskeresultat.kategori = 'C';
          }
          else {
            return toResponse('B', transformedResult);
          }
        }
        // if there are more than one B result, we cannot know for sure which one is right, so we
        // degrade them all to category C.
        transformedResult.forEach((item) => item.vaskeresultat.kategori = 'C');
        return toResponse('C', transformedResult);
      })().nodeify(callback);
    }
  };
}

['adgangsadresse', 'adresse'].forEach((entityName) => {
  var sqlModel = createSqlModel(entityName);
  registry.add(`${entityName}_historik`, 'sqlModel', 'query', module.exports);
  exports[entityName] = sqlModel;
});

