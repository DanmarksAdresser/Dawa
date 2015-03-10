"use strict";


var async = require('async');
var q = require('q');
var xml2js = require('xml2js');
var _ = require('underscore');

var datamodels = require('../crud/datamodel');
var dataUtil = require('../psql/dataUtil');
var dbapi = require('../dbapi');
var divergensImpl = require('../psql/divergensImpl');
var gml = require('../temaer/gml');
var jsonFieldMap = require('../apiSpecification/temaer/additionalFields');
var logger = require('../logger').forCategory('tema');
var sqlCommon = require('../psql/common');
var temaerApi = require('../apiSpecification/temaer/temaer');


var MAX_INT =  2147483647;

function makeUnionSql(count, firstAlias) {
  var items = [], i;
  for(i = 0; i < count; i += 1) {
    items.push('ST_GeomFromText($' + (firstAlias + i) +')' );
  }
  return 'ST_union(ARRAY[' + items.join(',') + '])';
}

function getKeyValue(tema, temaSpec) {
  return temaSpec.key.map(function(keySpec) {
    return tema.fields[keySpec.name];
  });
}

function hasSameKey(a, b, keySpecs) {
  return keySpecs.reduce(function(memo, keySpec) {
    return memo && (a.fields[keySpec.name] === b.fields[keySpec.name]);
  }, true);
}

function removeAll(aas, bs, keySpecs) {
  return _.filter(aas, function (a) {
    return _.every(bs, function (newTema) {
      return !hasSameKey(a, newTema, keySpecs);
    });
  });
}

function getTemaer(client, temaNavn, constraints, callback) {
  var sql = "SELECT tema, id, aendret, geo_version, geo_aendret, fields FROM temaer WHERE tema = $1";
  var params = [temaNavn];
  if(constraints) {
    _.forEach(constraints, function(value, key) {
      sql += " AND temaer.fields->>'" + key + "' = $" + (params.length + 1) + "::text";
      params.push(value);
    });
  }
  return q.ninvoke(client, 'query', sql, params).then(function(result) {
    if(result.rows) {
      return result.rows;
    }
    else {
      return [];
    }
  }).nodeify(callback);
}

exports.addTema = function(client, tema, callback) {
  var sql = 'INSERT INTO temaer(tema, aendret, geo_version, geo_aendret, fields, geom) ' +
    'VALUES ($1, NOW(), $2, NOW(), $3, ST_Multi(ST_SetSRID(' + makeUnionSql(tema.polygons.length, 4) +', 25832))) RETURNING id';
  var params = [tema.tema, 1, tema.fields].concat(tema.polygons);
  return client.queryp(sql, params).then(function(result) {
    return result.rows[0].id;
  }).nodeify(callback);
};

exports.deleteTema = function(client, temaDef, tema, callback) {
  var sql = "DELETE FROM temaer WHERE tema = $1";
  temaDef.key.forEach(function(keySpec, index) {
    sql += " AND fields->>'" + keySpec.name + "' = $" + (index + 2) + "::text";
  });
  var params = [tema.tema].concat(getKeyValue(tema, temaDef));
  return q.ninvoke(client, 'query', sql, params).nodeify(callback);
};

exports.putTemaer = function(temaDef, temaer, client, initializing, constraints, updateTilknytninger, callback) {
  return getTemaer(client, temaDef.singular, constraints).then(function(existingTemaer) {
    var temaerToRemove = removeAll(existingTemaer, temaer, temaDef.key);
    var temaerToCreate = removeAll(temaer, existingTemaer, temaDef.key);
    var temaerToUpdate = removeAll(temaer, temaerToCreate, temaDef.key);
    return q.nfcall(function(callback) {
      async.series([
        function(callback) {
          async.eachSeries(temaerToRemove, function(tema, callback) {
            logger.info('Removing DAGI tema', {tema: tema.tema, fields: tema.fields});
            exports.deleteTema(client, temaDef, tema, callback);
          }, callback);
        },
        function(callback) {
          async.eachSeries(temaerToCreate, function(tema, callback) {
            logger.info('Adding DAGI tema', {tema: tema.tema, fields: tema.fields});
            exports.addTema(client, tema, callback);
          }, callback);
        },
        function(callback) {
          async.eachSeries(temaerToUpdate, function(tema, callback) {
            exports.updateTema(client, temaDef, tema, function(err, result) {
              if (err) {
                return callback(err);
              }
              if (result.rowCount === 0) {
                logger.debug('DAGI tema uændret');
              }
              else {
                logger.info('Opdaterede DAGI tema', {tema: tema.tema, kode: tema.kode, navn: tema.navn});
              }
              callback(err, result);
            });
          }, callback);
        },
        function(callback) {
          if(!updateTilknytninger) {
            return callback();
          }
          exports.updateAdresserTemaerView(client, temaDef, initializing, callback);
        },
      ], callback);
    });
  }).nodeify(callback);
};

exports.updateTema = function(client, temaDef, tema, callback) {
  var fieldsNotChangedClause = jsonFieldMap[temaDef.singular].map(function(field) {
    return "(fields->>'" + field.name + "') IS DISTINCT FROM ($" + (temaDef.key.length + 1)+"::json->>'" + field.name + "')";
  }).join(' OR ');


  var geoChangedClause = "geom IS NULL OR NOT ST_Equals(geom, ST_Multi(ST_SetSRID(" + makeUnionSql(tema.polygons.length, (temaDef.key.length + 2)) + ", 25832)))";
  var changedSql = "SELECT " + geoChangedClause + " AS geo_changed, (" + fieldsNotChangedClause + ") as fields_changed, geo_version FROM temaer" +
    " WHERE tema = '" + tema.tema + "'";
  temaDef.key.forEach(function(keySpec, index) {
    changedSql += " and fields->>'" + keySpec.name+ "' = $" + (index + 1);
  });
  var changedParams = getKeyValue(tema, temaDef).concat([JSON.stringify(tema.fields)]).concat(tema.polygons);
  return q.ninvoke(client, 'query', changedSql, changedParams).then(function(result) {
    if(!result.rows) {
      return q.reject(new Error('Could not update DAGI tema, it was not found.'));
    }
    if(result.rows.length !== 1) {
      return q.reject(new Error('Could not update DAGI tema, unexpected number of rows to update'));
    }
    var geoChanged = result.rows[0].geo_changed;
    var fieldsChanged = result.rows[0].fields_changed;
    var geo_version = result.rows[0].geo_version;
    if(!geoChanged && !fieldsChanged) {
      return  {
        rowCount: 0
      };
    }
    var updates = [];
    var updateParams = [];
    if(fieldsChanged) {
      updates.push("aendret = NOW()");
      updateParams.push(tema.fields);
      updates.push("fields = $" + updateParams.length);
    }
    if(geoChanged) {
      updates.push("geo_aendret = NOW()");
      updateParams.push(geo_version + 1);
      updates.push("geo_version = $" + updateParams.length);
      updates.push("geom = ST_Multi(ST_SetSRID(" + makeUnionSql(tema.polygons.length, updateParams.length + 1) + ", 25832))");
      updateParams = updateParams.concat(tema.polygons);
    }
    var updateSql = "UPDATE temaer SET " + updates.join(', ') + " WHERE " +
      temaDef.key.map(function(keySpec, index) {
        return "(fields->>'" + keySpec.name + "') = $" + (updateParams.length + index + 1) + "::text";
      }).join(" AND ");
    updateParams = updateParams.concat(temaDef.key.map(function(keySpec) {
      return tema.fields[keySpec.name];
    }));
    return q.ninvoke(client, 'query', updateSql, updateParams);
  }).nodeify(callback);
};

exports.parseTemaer = function(gmlText, temaDef, mapping) {
  return q.nfcall(xml2js.parseString, gmlText, {
    tagNameProcessors: [xml2js.processors.stripPrefix],
    trim: true
  }).then(function(result) {
    if (!result.FeatureCollection) {
      return q.reject(new Error('Unexpected contents in tema file file: ' + JSON.stringify(result)));
    }

    var features = result.FeatureCollection.featureMember;

    return _.chain(features)
      .filter(function (feature) {
        // Some files may contain feature types we dont want (e.g. ejerlav).
        return feature[mapping.wfsName];
      })
      .filter(mapping.filterFn)
      .map(function (feature) {
        return exports.wfsFeatureToTema(feature, mapping);
      })
      .groupBy(function (fragment) {
        return exports.stringKey(fragment, temaDef);
      })
      .map(function (fragments) {
        return {
          tema: temaDef.singular,
          fields: fragments[0].fields,
          polygons: _.pluck(fragments, 'polygon')
        };
      })
      .value();
  });
};

exports.wfsFeatureToTema = function(feature, mapping) {
  var featureCandidates = feature[mapping.wfsName];
  if (!featureCandidates) {
    logger.error("found no features, feature[" + mapping.wfsName + "], feature = ", JSON.stringify(feature));
  } else {
  }
  var wfsFeature = featureCandidates[0];

  var result = {
    polygon: gml.gmlGeometryToWkt(wfsFeature[mapping.geometry][0])
  };
  result.fields = _.reduce(mapping.fields, function(memo, fieldMapping, fieldName) {
    var objWithProperty;
    if(fieldMapping.path) {
      objWithProperty = _.reduce(fieldMapping.path, function(memo, pathSegment) {
        if(!memo || !memo[pathSegment]) {
          return null;
        }
        return memo[pathSegment][0];
      }, wfsFeature);
    }
    else {
      objWithProperty = wfsFeature;
    }
    memo[fieldName] = fieldMapping.parseFn(objWithProperty[fieldMapping.name][0]);
    return memo;
  }, {});

  return result;
};


var initAdresserTemaerView = function(client, temaName) {
  return q.nfcall(async.series,[
    sqlCommon.disableTriggers(client),
    function(cb) {
      var sql = 'INSERT INTO adgangsadresser_temaer_matview(adgangsadresse_id, tema_id, tema)'+
        ' (SELECT Adgangsadresser.id, gridded_temaer_matview.id, gridded_temaer_matview.tema ' +
        'FROM Adgangsadresser JOIN gridded_temaer_matview  ON  ST_Contains(gridded_temaer_matview.geom, Adgangsadresser.geom) AND tema = $1 ' +
        ' JOIN temaer ON gridded_temaer_matview.id = temaer.id)';
      var params = [temaName];
      client.query(sql, params, cb);
    },
    function (cb) {
      var sql = 'INSERT INTO adgangsadresser_temaer_matview_history(adgangsadresse_id, tema_id, tema) ' +
          '(SELECT adgangsadresse_id, tema_id, adgangsadresser_temaer_matview.tema FROM adgangsadresser_temaer_matview ' +
        ' JOIN temaer ON (adgangsadresser_temaer_matview.tema_id = temaer.id AND adgangsadresser_temaer_matview.tema = temaer.tema) WHERE adgangsadresser_temaer_matview.tema = $1)';
      var params = [temaName];
      client.query(sql, params, cb);
    },
    sqlCommon.enableTriggers(client)
  ]);
};

 var updateAdresserTemaerViewNonInit = function(client, temaName) {
  var datamodel = datamodels.adgangsadresse_tema;
  return dataUtil.createTempTableQ(client, 'tema_mapping_temp', 'adgangsadresser_temaer_matview').then(function() {
    return dbapi.queryRawQ(client, 'INSERT INTO tema_mapping_temp(adgangsadresse_id, tema_id, tema) ' +
      '(SELECT Adgangsadresser.id, gridded_temaer_matview.id, gridded_temaer_matview.tema ' +
      'FROM Adgangsadresser JOIN gridded_temaer_matview  ON  ST_Contains(gridded_temaer_matview.geom, Adgangsadresser.geom) AND tema = $1) ',
      [temaName]);
  }).then(function() {
    return dbapi.queryRawQ(client, "CREATE TEMP VIEW tema_mapping_view_temp AS SELECT * FROM adgangsadresser_temaer_matview WHERE tema = '" + temaName + "'", []);
  }).then(function() {
    return divergensImpl.computeTableDifferences(client, datamodel, 'tema_mapping_view_temp', 'tema_mapping_temp');
  }).then(function(report) {
    return divergensImpl.rectifyDifferences(client, datamodel, report, MAX_INT);
  }).then(function() {
    return dataUtil.dropTableQ(client, 'tema_mapping_temp');
  }).then(function() {
    return dbapi.queryRawQ(client, 'DROP VIEW tema_mapping_view_temp', []);
  });
};

exports.findTema = function(temaNavn) {
  return _.findWhere(temaerApi, { singular: temaNavn });
};

exports.stringKey = function (tema, temaDef) {
  return temaDef.key.reduce(function(memo, keySpec) {
    return memo + tema.fields[keySpec.name];
  }, '');
};

exports.updateAdresserTemaerView = function(client, temaDef, initializing, callback) {
  if (initializing) {
    return initAdresserTemaerView(client, temaDef.singular).nodeify(callback);
  }
  else {
    return updateAdresserTemaerViewNonInit(client, temaDef.singular).nodeify(callback);
  }
};

