"use strict";

var moment = require('moment');
var q = require('q');
var _ = require('underscore');

var adresseTextMatch = require('../adresseTextMatch');
var columnsMap = _.clone(require('../history/columns'));
var levenshtein = require('../levenshtein');
//var parameters = require('./parameters');
var registry = require('../registry');
var qUtil = require('../../q-util');
var sqlParameterImpl = require('../common/sql/sqlParameterImpl');
var sqlUtil = require('../common/sql/sqlUtil');
var util = require('../util');


var kode4String = util.kode4String;


// We just let the database format the husnr
columnsMap.adresse = _.clone(columnsMap.adresse);
columnsMap.adgangsadresse = _.clone(columnsMap.adgangsadresse);
columnsMap.adresse.husnr = columnsMap.adgangsadresse.husnr = {
  select: '(husnr).tal || (husnr).bogstav'
};

//function adressebetegnelseSql(adgangsadresse, includeSuppBynavn) {
//  return `adressebetegnelse(vejnavn, husnr, ${adgangsadresse ? 'NULL' : 'etage'}, ${adgangsadresse ? 'NULL' : 'doer'}, ${includeSuppBynavn ? 'supplerendebynavn' : 'NULL'}, to_char(vask_${adgangsadresse ? 'adgangsadresse' : 'adresse'}r.postnr, 'FM0000'), postnrnavn)`;
//}

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
  if(!row) {
    return null;
  }
  var result = formatAdresseFields(row, adgangOnly);
  result.status = row.status;
  return result;
}

function udenSupplerendeBynavn(adresse) {
  var result = _.clone(adresse);
  result.supplerendebynavn = null;
  return result;
}

function computeDifferences(uvasket, vasket, adgangOnly) {
  var addressFieldNames = ['vejnavn', 'husnr', 'supplerendebynavn', 'postnr', 'postnrnavn'];
  if(!adgangOnly) {
    addressFieldNames = addressFieldNames.concat(['etage', 'dør']);
  }
  var differences = addressFieldNames.reduce((memo, field) => {
    if(field === 'supplerendebynavn' && !uvasket.supplerendebynavn) {
      // hvis der ikke er et supplerende bynavn givet i den adresse vi har
      // modtaget, så skal det ikke tælles som en forskel at der er
      // et supplerende bynavn i den fundne adresse
      return memo;
    }
    if(typeof uvasket[field] === 'string' && typeof vasket[field] === 'string') {
      memo[field] = levenshtein(('' + uvasket[field]).toLowerCase(), vasket[field].toLowerCase(), 1, 1, 1).distance;
    }
    else if (typeof uvasket[field] === 'string') {
      memo[field] = uvasket[field].length;
    }
    else if(typeof vasket[field] === 'string') {
      memo[field] = vasket[field].length;
    }
    return memo;
  }, {});
  return differences;
}


//function levenshteinOrderClause(entityName, betegnelseAlias) {
//  return `min(least(levenshtein(lower(${adressebetegnelseSql(entityName === 'adgangsadresse', true)}), lower(${betegnelseAlias}), 2, 1, 3),` +
//  ` levenshtein(lower(${adressebetegnelseSql(entityName === 'adgangsadresse', false)}), lower(${betegnelseAlias}), 2, 1, 3)))`;
//}

var adgangsadresseFields = ['id', 'status', 'kommunekode', 'vejkode', 'vejnavn', 'husnr', 'supplerendebynavn', 'postnr', 'postnrnavn', 'virkningstart', 'virkningslut'];

var adresseFields = adgangsadresseFields.concat(['etage', 'dør']);

function makeSelectList(fieldNames, columns) {
  let buildObjectArgs = fieldNames.map((fieldName) => {
    let column = columns[fieldName];

    return `'${fieldName}', ${ column ? (column.column || column.select) : fieldName}`;
  }).join(', ');
  return ['id', `(json_agg(json_build_object(${buildObjectArgs}))) as versions`];
}

let selectList = {
  adgangsadresse: makeSelectList(adgangsadresseFields, columnsMap.adgangsadresse),
  adresse: makeSelectList(adresseFields, columnsMap.adresse)
};

function searchQuery(entityName, betegnelse, limit) {
  const table = `vask_${entityName}r`;
  const uniqueTable = `${table}_unikke`;
  const sql = `
WITH allids AS (SELECT id
                FROM ${uniqueTable}
                WHERE tsv @@ to_tsquery('adresser_query', $2)
                LIMIT 500),
    ids AS (SELECT u.id
            FROM ${uniqueTable} u NATURAL JOIN allids
            GROUP BY u.id
            ORDER BY
              max(round(1000000 *
                        ts_rank(tsv, to_tsquery('adresser_query', $3),
                                16))) DESC,
              min(levenshtein(lower(adressebetegnelse(vejnavn, husnr, ${entityName === 'adgangsadresse' ? 'NULL, NULL' : 'etage, doer'},
                                                      supplerendebynavn,
                                                      to_char(postnr,
                                                              'FM0000'), postnrnavn)),
                              lower($1), 2, 1, 3))
            LIMIT ${limit})
SELECT ${selectList[entityName].join(',')}
FROM ${table}
WHERE id IN (SELECT id
             FROM ids)
GROUP BY id;`
  var tsQuery = sqlParameterImpl.toPgSearchQuery(betegnelse);
  const tsQueryForRanking = sqlParameterImpl.queryForRanking(tsQuery);

  return {
    sql: sql,
    params: [betegnelse, tsQuery, tsQueryForRanking]
  };

}

function fuzzyQuery(entityName, betegnelse, limit) {
  const table = `vask_${entityName}r`;
  const uniqueTable = `${table}_unikke`;
  const sql = `
WITH vps AS (SELECT
               kommunekode,
               vejkode,
               postnr
             FROM vask_vejstykker_postnumre vp
             ORDER BY tekst <-> $1
             LIMIT 15),
    allids AS (SELECT DISTINCT id
               FROM ${table} adg NATURAL JOIN vps),
    ids AS (SELECT u.id
            FROM ${uniqueTable} u NATURAL JOIN allids
            GROUP BY u.id
            ORDER BY min(levenshtein(lower(adressebetegnelse(vejnavn, husnr, ${entityName === 'adgangsadresse' ? 'NULL, NULL' : 'etage, doer'},
                                                             supplerendebynavn,
                                                             to_char(postnr, 'FM0000'),
                                                             postnrnavn)),
                                     lower($1), 2, 1, 3))
            LIMIT ${limit})
SELECT ${selectList[entityName].join(',')}
FROM ${table}
  WHERE id IN (select id from ids)
GROUP BY id`;

  return {
    sql: sql,
    params: [betegnelse]
  };
}

function doSearchQuery(client, entityName, params) {
  const query = searchQuery(entityName, params.betegnelse, 30);
  return client.queryp(query.sql, query.params).then((result) => {
    return result.rows || [];
  });

}

function doFuzzyQuery(client, entityName, params) {
  const query = fuzzyQuery(entityName, params.betegnelse, 30);
  return client.queryp(query.sql, query.params).then((result) => {
    return result.rows || [];
  });
}

function removePrefixZeroes(str) {
  if(str) {
    return str.replace(/^0+([^0])+]/, '$1');
  }
  return str;
}

function parseAddressTexts(addressTextToFormattedAddressMap, unparsedAddressText) {
  return _.mapObject(addressTextToFormattedAddressMap, (address, parsedAddressText) => {
    let addressWithoutSupBynavn = udenSupplerendeBynavn(address);
    addressWithoutSupBynavn.supplerendebynavn = null;

    // supplerende bynavn is optional, so we take the variant which matches best
    let distanceWithSupBynavn = levenshtein(parsedAddressText.toLowerCase(), unparsedAddressText.toLowerCase(), 1, 1, 1).distance;
    let distanceWithoutSupBynavn = levenshtein(util.adressebetegnelse(addressWithoutSupBynavn).toLowerCase(), unparsedAddressText.toLowerCase(), 1, 1, 1).distance;
    let usedAddress = distanceWithSupBynavn < distanceWithoutSupBynavn ? address : addressWithoutSupBynavn;
    let result = adresseTextMatch(unparsedAddressText, usedAddress);

    // We consider leading zeroes in husnr and etage to be insignificant
    result.address.husnr = removePrefixZeroes(result.address.husnr);
    if(result.etage) {
      result.address.etage = removePrefixZeroes(result.address.etage);
    }
    return result;
  });

}

function resultRelevanceCompareFn(a, b) {
  var requiredFields = ['vejnavn', 'husnr', 'postnr', 'postnrnavn'];
  for(let prop of ['postnr', 'vejnavn', 'husnr', 'etage', 'dør', 'ponstnrnavn', 'supplerendebynavn']) {
    var aVal = a.vaskeresultat.forskelle[prop];
    var bVal = b.vaskeresultat.forskelle[prop];
    if(_.contains(requiredFields, prop)) {
      // adresses missing required fields should be last
      var aExists = !_.isUndefined(aVal) && aVal !== null;
      var bExists = !_.isUndefined(bVal) && bVal !== null;
      if(aExists && !bExists) {
        return -1;
      }
      else if (!aExists && bExists) {
        return 1;
      }
    }
    aVal = aVal || 0;
    bVal = bVal || 0;
    if(a.vaskeresultat.forskelle[prop] === b.vaskeresultat.forskelle[prop]) {
      continue;
    }
    if(aVal < bVal) {
      return -1;
    }
    else {
      return 1;
    }
  }
}


function createSqlModel(entityName) {
  var columns = columnsMap[entityName]

  return {
    allSelectableFieldNames: function (allFieldNames) {
      return sqlUtil.allSelectableFieldNames(allFieldNames, columns);
    },
    query: function (client, fieldNames, params, callback) {
      return q.async(function*() {
        params = _.clone(params);
        params.side = 1;
        params.per_side=100;

        let searchResult = yield doSearchQuery(client, entityName, params);

        if(searchResult.length === 0) {
          searchResult = yield doFuzzyQuery(client, entityName, params);
        }

        var allVersions = _.flatten(_.pluck(searchResult, 'versions'));

        // maps address text of found adresses to the list of versions with that address text
        var addressTextToVersionsMap = _.groupBy(allVersions, (version) => util.adressebetegnelse(formatAdresse(version, entityName === 'adgangsadresse')));

        // a list of all the different address texts we found
        var allAddressTexts = Object.keys(addressTextToVersionsMap);

        // map of address text to the formatted address fields
        var addressTextToFormattedAddressMap = _.mapObject(addressTextToVersionsMap, (versions) => formatAdresse(versions[0], entityName === 'adgangsadresse'));
        var addressTextToParseResult = parseAddressTexts(addressTextToFormattedAddressMap, params.betegnelse);
        var addressTextToDifferences = _.mapObject(addressTextToParseResult, (parseResult, usedAddress) => {
          let parsedAddress = parseResult.address;
          return computeDifferences(parsedAddress, addressTextToFormattedAddressMap[usedAddress]);
        });
        var addressTextToDifferenceSum = _.mapObject(addressTextToDifferences, (differences) => {
          return Object.keys(differences).reduce(function(memo, value) {
            memo += differences[value];
            return memo;
          }, 0);
        });

        // compute list of all current versions
        var allCurrentVersions = allVersions.filter((version) => !version.virkningslut);

        // compute map of address id -> current address version
        var idToCurrentVersion = _.indexBy(allCurrentVersions, (version) => version.id);

        // for each match result, find the most recent, preferably active address version
        var addressTextToSelectedVersion =
          _.mapObject(addressTextToParseResult, (parseResult, addressText) => {
            var versions = addressTextToVersionsMap[addressText];
            var currentVersions = versions.filter((version) => !version.virkningslut);
            var currentActiveVersions = currentVersions.filter((version) => {
              return version.status === 1 || version.status === 3
            });
            var candidateVersions = currentActiveVersions.length > 0 ? currentActiveVersions : (currentVersions.length > 0 ? currentVersions : versions);
            var selectedVersion = candidateVersions.reduce((selected, candidate)  => {
              if(moment(selected.virkningstart).isBefore(moment(candidate.virkningstart))) {
                return selected;
              }
              else {
                return candidate;
              }
            });
            return selectedVersion;
          });


        let addressTextToCategory = yield* qUtil.mapObjectAsync(addressTextToParseResult, function*(parseResult, addressText) {
          let address = addressTextToFormattedAddressMap[addressText];
          let parsedAddress = parseResult.address;
          var differences = addressTextToDifferences[addressText];
          var differenceSum = addressTextToDifferenceSum[addressText];
          // If the matched address is WITHOUT husbogstav, but the most recent address is WITH husbogstav,
          // we don't really know if the husbogstav is omitted or not (a common case). Therefore, we degrade
          // to category C
          var selectedVersion = addressTextToSelectedVersion[addressText];
          var matchedVersionHusnr = selectedVersion.husnr;
          var currentHusnr = idToCurrentVersion[selectedVersion.id];
          if(currentHusnr && new RegExp(`^${matchedVersionHusnr}[A-Za-z]$`).test(currentHusnr)) {
            return 'C';
          }

          if(differenceSum === 0 && parseResult.unknownTokens.length === 0) {
            return 'A';
          }
          if(parseResult.unknownTokens.length === 0 &&
            differences.husnr === 0 &&
            differences.postnr === 0 &&
            (differences.etage || 0) === 0 && (differences.dør || 0) === 0) {
            var vejnavnMatchesCloseEnough;
            if(differences.vejnavn === 0) {
              vejnavnMatchesCloseEnough = true;
            }
            else if (differences.vejnavn > 3) {
              vejnavnMatchesCloseEnough = false;
            }
            else {
              var parsedVejnavn = parsedAddress.vejnavn;
              var closestVejnavn = (yield client.queryp('select vejnavn FROM vejstykker v JOIN vejstykkerpostnumremat vs ON v.kommunekode = vs.kommunekode and v.kode = vs.vejkode and postnr = $1 ORDER BY levenshtein(lower($2), lower(vejnavn)) limit 1', [parsedAddress.postnr, parsedVejnavn])).rows[0].vejnavn;
              vejnavnMatchesCloseEnough = (closestVejnavn === address.vejnavn);

            }
            if(vejnavnMatchesCloseEnough) {
              return 'B';
            }
          }
          return 'C';
        });

        var categoryCounts = _.countBy(_.values(addressTextToCategory), _.identity);

        var chosenCategory = categoryCounts.A === 1 ? 'A' : (categoryCounts.B  === 1 ? 'B' : 'C');

        // the set of results we want to return
        var filteredAddressTexts =
          allAddressTexts.filter((addressText) => addressTextToCategory[addressText] === chosenCategory);

        if(categoryCounts.A > 1 || (categoryCounts.A === 0 && categoryCounts.B > 1)) {
          // degrade to category C because we found more than one
          _.mapObject(addressTextToCategory, (value) => 'C');
          chosenCategory = 'C';
        }

        var results = _.map(filteredAddressTexts, (addressText) => {
          return {
            adresse: addressTextToSelectedVersion[addressText],
            aktueladresse: idToCurrentVersion[addressTextToSelectedVersion[addressText].id],
            vaskeresultat: {
              afstand: addressTextToDifferenceSum[addressText],
              forskelle: addressTextToDifferences[addressText],
              parsetadresse: addressTextToParseResult[addressText].address,
              ukendtetokens: addressTextToParseResult[addressText].unknownTokens
            }
          }
        });
        results.sort(resultRelevanceCompareFn);
        results.length = Math.min(results.length, 30);
        return [{
          kategori: chosenCategory,
          resultater: results
        }];


      })().nodeify(callback);
    }
  };
}

['adgangsadresse', 'adresse'].forEach((entityName) => {
  var sqlModel = createSqlModel(entityName);
  registry.add(`${entityName}_datavask`, 'sqlModel', 'query', module.exports);
  exports[entityName] = sqlModel;
});
