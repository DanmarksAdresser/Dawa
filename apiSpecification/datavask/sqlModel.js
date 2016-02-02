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

function objectComparator(fields) {
  return function(a, b) {
    for(let field of fields) {
      if(a[field] === null && b[field] !== null) {
        return -1;
      }
      if(a[field] !== null && b[field]  === null ) {
        return 1;
      }
      if(a[field] < b[field]) {
        return -1;
      }
      else if(a[field] > b[field]) {
        return 1;
      }
    }
    return 0;
  }
}

//
function versionComparator(a, b) {
  if(a.virkningslut && !b.virkningslut) {
    return 1;
  }
  if(!a.virkningslut && b.virkningslut) {
    return -1;
  }
  if(moment(a.virkningstart).isBefore(moment(b.virkningstart))) {
    return -1;
  }
  else if(a.virkningstart === b.virkningstart) {
    return 0;
  }
  else {
    return 1;
  }
}

function formatVersion(version) {
  if(!version) {
    return null;
  }
  var result = {
    id: version.id,
    vejnavn: version.vejnavn,
    adresseringsvejnavn: version.adresseringsvejnavn,
    husnr: version.husnr,
    supplerendebynavn: version.supplerendebynavn ? version.supplerendebynavn : null,
    postnr: kode4String(version.postnr),
    postnrnavn: version.postnrnavn,
    status: version.status,
    virkning: version.virkning
  };

  if(!_.isUndefined(version.adgangsadresseid)) {
    result.adgangsadresseid = version.adgangsadresseid;
    result.etage = version.etage;
    result.dør = version.dør;
  }
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

var adgangsadresseFields = ['id', 'status', 'kommunekode', 'vejkode', 'vejnavn', 'adresseringsvejnavn', 'husnr', 'supplerendebynavn', 'postnr', 'postnrnavn', 'virkningstart', 'virkningslut'];

var adresseFields = adgangsadresseFields.concat(['etage', 'dør', 'adgangsadresseid']);

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

    let result = adresseTextMatch(unparsedAddressText, address);

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
    var aVal = a.forskelle[prop];
    var bVal = b.forskelle[prop];
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
    if(a.forskelle[prop] === b.forskelle[prop]) {
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

function uniquesForVersion(stormodtagere, version) {
  let uniques = [];

  // autoritativ adresse
  uniques.push({
    vejnavn: version.vejnavn,
    husnr: version.husnr,
    etage: version.etage,
    dør: version.dør,
    supplerendebynavn: version.supplerendebynavn,
    postnr: version.postnr,
    postnrnavn: version.postnrnavn
  });

  // uden supplerende bynavn
  if(version.supplerendebynavn) {
    uniques.push({
      vejnavn: version.adresseringsvejnavn,
      husnr: version.husnr,
      etage: version.etage,
      dør: version.dør,
      supplerendebynavn: null,
      postnr: version.postnr,
      postnrnavn: version.postnrnavn
    });
  }

  // adresseringsvejnavn i stedet for vejnavn
  if(version.vejnavn !== version.adresseringsvejnavn) {
    uniques = uniques.concat(uniques.map((unique) => {
      const result = _.clone(unique);
      result.vejnavn = version.adresseringsvejnavn;
      return result;
    }));
  }

  // evt stormodtagere
  const adgangsadresseid = version.adgangsadresseid || version.id;
  if (stormodtagere[adgangsadresseid]) {
    const stormodtager = stormodtagere[adgangsadresseid];
    uniques = uniques.concat(uniques.map((unique) => {
        const result = _.clone(unique);
        result.postnr = kode4String(stormodtager.nr);
        result.postnrnavn = stormodtager.navn;
        return result;
      }
    ));
  }
  return uniques;

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

        searchResult.forEach(result => {
          result.versions = result.versions.map(version =>formatVersion(version));
        });

        const stormodtagerRows = (yield client.queryp('SELECT nr, navn, adgangsadresseid FROM stormodtagere')).rows;
        const stormodtagere = _.indexBy(stormodtagerRows, 'adgangsadresseid');


        var allVersions = _.flatten(_.pluck(searchResult, 'versions'));



        // create a list of all unique addresses
        let uniques = allVersions.map(version => uniquesForVersion(stormodtagere, version)).reduce((memo, uniques) => {
          return memo.concat(uniques);
        }, []);

        const uniqueComparator = objectComparator(['vejnavn', 'husnr', 'etage', 'dør', 'supplerendebynavn', 'postnr', 'postnrnavn']);
        uniques.sort(uniqueComparator);
        uniques = _.uniq(uniques, true, (a) => util.adressebetegnelse(a, entityName === 'adgangsadresse'));


        // maps address text of found adresses to the structured version of the adress
        var addressTextToUniqueMap = _.indexBy(uniques, (unique) => util.adressebetegnelse(unique, entityName === 'adgangsadresse'));

        // a list of all the different address texts we found
        var allAddressTexts = Object.keys(addressTextToUniqueMap);

        var addressTextToParseResult = parseAddressTexts(addressTextToUniqueMap, params.betegnelse);

        var addressTextToDifferences = _.mapObject(addressTextToParseResult, (parseResult, usedAddress) => {
          let parsedAddress = parseResult.address;
          return computeDifferences(parsedAddress, addressTextToUniqueMap[usedAddress]);
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

        let addressTextToCategory = yield* qUtil.mapObjectAsync(addressTextToParseResult, function*(parseResult, addressText) {
          const address = addressTextToUniqueMap[addressText];
          let parsedAddress = parseResult.address;
          var differences = addressTextToDifferences[addressText];
          var differenceSum = addressTextToDifferenceSum[addressText];

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
              const closestVejstykkeSql = `
SELECT vejnavn
FROM vask_vejstykker_postnumre v
WHERE postnr = $1
ORDER BY
  levenshtein(lower($2), lower(vejnavn))
LIMIT 1`;
              const closestVejstykke =
                (yield client.queryp(
                  closestVejstykkeSql,
                  [parsedAddress.postnr, parsedVejnavn])).rows[0];
              vejnavnMatchesCloseEnough = (closestVejstykke.vejnavn === address.vejnavn);
            }
            if(vejnavnMatchesCloseEnough) {
              return 'B';
            }
          }
          return 'C';
        });

        var categoryCounts = _.countBy(_.values(addressTextToCategory), _.identity);

        var chosenCategory = categoryCounts.A >= 1 ? 'A' : (categoryCounts.B  >= 1 ? 'B' : 'C');

        // the set of results we want to return
        var filteredAddressTexts =
          allAddressTexts.filter((addressText) => addressTextToCategory[addressText] === chosenCategory);

        const addressTextToVaskeresultat = filteredAddressTexts.reduce((memo, addressText) => {
          const unique = addressTextToUniqueMap[addressText];
          memo[addressText] = {
            variant: unique,
            afstand: addressTextToDifferenceSum[addressText],
            forskelle: addressTextToDifferences[addressText],
            parsetadresse: addressTextToParseResult[addressText].address,
            ukendtetokens: addressTextToParseResult[addressText].unknownTokens
          };
          return memo;
        }, {});

        const orderedAddressTexts = _.clone(filteredAddressTexts);
        orderedAddressTexts.sort((a, b) => {
          return resultRelevanceCompareFn(addressTextToVaskeresultat[a], addressTextToVaskeresultat[b]);
        });

        const idToVersionsMap = _.groupBy(allVersions, version => version.id);
        const idToAddressTextsMap = _.mapObject(idToVersionsMap, versions => {
          let uniques = versions
            .map(version => uniquesForVersion(stormodtagere, version))
            .reduce((memo, uniques) => {
              return memo.concat(uniques);
            }, []);

          let addressTexts = uniques.map(unique =>
            util.adressebetegnelse(unique, entityName === 'adgangsadresse')
          );

          addressTexts.sort();
          return _.uniq(addressTexts);
        });

        let idToBestMatchingAddressTextMap = _.mapObject(idToAddressTextsMap, addressTexts => {
          return _.find(orderedAddressTexts, addressText => _.contains(addressTexts, addressText));
        });

        idToBestMatchingAddressTextMap = _.reduce(idToBestMatchingAddressTextMap, (memo, value, key) => {
          if(value) {
            memo[key] = value;
          }
          return memo;
        }, {});

        const idToRankMap = _.mapObject(idToBestMatchingAddressTextMap, addressText => {
          return orderedAddressTexts.indexOf(addressText);
        });

        const orderedIds = Object.keys(idToRankMap).sort((a, b) => {
          return idToRankMap[a] - idToRankMap[b];
        });

        var results = _.map(orderedIds, (id) => {
          const addressText = idToBestMatchingAddressTextMap[id];

          const orderdedVersions = idToVersionsMap[id].sort(versionComparator);

          const matchingVersion = _.find(orderdedVersions, version => {
            const texts = uniquesForVersion(stormodtagere, version).map(unique =>
              util.adressebetegnelse(unique, entityName === 'adgangsadresse'));
            return _.contains(texts, addressText);
          });


          return {
            adresse: matchingVersion,
            aktueladresse: idToCurrentVersion[id],
            vaskeresultat: addressTextToVaskeresultat[addressText]
          };
        });

        if((chosenCategory === 'A' || chosenCategory === 'B') && results.length > 1) {
          // multiple results for cat A or B is not good. We
          // If the is only a single current address, we assume the others are in fact the same address
          // which has been mistakenly deleted and created again.
          const activeResults = results.filter(result => {
            return result.aktueladresse && result.aktueladresse.status !== 2 && result.aktueladresse.status !== 4;
          });
          if(activeResults.length === 1) {
            results = activeResults;
          }
        }

        // degrade to category C if we found more than one
        if(results.length > 1) {
          chosenCategory = 'C';
        }

        // If the matched address is WITHOUT husbogstav, but the most recent address is WITH husbogstav,
        // we don't really know if the husbogstav is omitted or not (a common case). Therefore, we degrade
        // to category C
        const bestMatchingResult = results[0];
        if(bestMatchingResult.aktueladresse) {
          const matchedVersionHusnr = bestMatchingResult.adresse.husnr;
          const currentHusnr = bestMatchingResult.aktueladresse.husnr;
          if(currentHusnr && new RegExp(`^${matchedVersionHusnr}[A-Za-z]$`).test(currentHusnr)) {
            chosenCategory = 'C';
          }
        }
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
