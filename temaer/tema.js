"use strict";

var gml = require('../temaer/gml');
var sqlCommon = require('../psql/common');
var async = require('async');
var _ = require('underscore');
var logger = require('../logger').forCategory('tema');
var dataUtil = require('../psql/dataUtil');
var jsonFieldMap = require('../apiSpecification/temaer/additionalFields');
var datamodels = require('../crud/datamodel');
var dbapi = require('../dbapi');
var divergensImpl = require('../psql/divergensImpl');
var Q = require('q');
var temaerApi = require('../apiSpecification/temaer/temaer');


var MAX_INT =  2147483647;

function makeUnionSql(count, firstAlias) {
  var items = [], i;
  for(i = 0; i < count; i += 1) {
    items.push('ST_GeomFromText($' + (firstAlias + i) +')' );
  }
  return 'ST_union(ARRAY[' + items.join(',') + '])';
}

function removeAll(aas, bs, keyProperty) {
  return _.filter(aas, function (a) {
    return _.every(bs, function (newTema) {
      return newTema.fields[keyProperty] !== a.fields[keyProperty];
    });
  });
}

function getTemaer(client, temaNavn, callback) {
  console.log('getTemaer');
  var sql = "SELECT tema, id, aendret, geo_version, geo_aendret, fields FROM temaer WHERE tema = $1";
  var params = [temaNavn];
  return Q.ninvoke(client, 'query', sql, params).then(function(result) {
    console.log('got result');
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
  return Q.ninvoke(client, 'query', sql, params).then(function(result) {
    return result.rows[0].id;
  }).nodeify(callback);
};

exports.deleteTema = function(client, temaDef, tema, callback) {
  var sql = "DELETE FROM temaer WHERE tema = $1 AND fields->>'" + temaDef.key + "' = $2::text";
  var params = [tema.tema, tema.fields[temaDef.key]];
  return Q.ninvoke(client, 'query', sql, params).nodeify(callback);
};

exports.putTemaer = function(temaDef, temaer, client, initializing, callback) {
  return getTemaer(client, temaDef.singular).then(function(existingTemaer) {
    console.log('got existing');
    var temaerToRemove = removeAll(existingTemaer, temaer, temaDef.key);
    var temaerToCreate = removeAll(temaer, existingTemaer, temaDef.key);
    var temaerToUpdate = removeAll(temaer, temaerToCreate, temaDef.key);
    return Q.nfcall(function(callback) {
      console.log('async.series');
      async.series([
        function(callback) {
          console.log('removing!');
          async.eachSeries(temaerToRemove, function(tema, callback) {
            logger.info('Removing DAGI tema', {tema: tema.tema, fields: tema.fields});
            exports.deleteTema(client, tema, callback);
          }, callback);
        },
        function(callback) {
          console.log('adding!');
          async.eachSeries(temaerToCreate, function(tema, callback) {
            logger.info('Adding DAGI tema', {tema: tema.tema, fields: tema.fields});
            exports.addTema(client, tema, callback);
          }, callback);
        },
        function(callback) {
          console.log('udpating!');
          console.log(JSON.stringify(temaerToUpdate));
          async.eachSeries(temaerToUpdate, function(tema, callback) {
            console.log('opdaterer DAGI tema');
            logger.debug('opdaterer DAGI tema', {tema: tema.tema, fields: tema.fields});
            exports.updateTema(client, temaDef, tema, function(err, result) {
              if (err) {
                return callback(err);
              }
              if (result.rowCount === 0) {
                logger.info('DAGI tema uændret');
              }
              else {
                logger.info('Opdaterede DAGI tema', {tema: tema.tema, kode: tema.kode, navn: tema.navn});
              }
              callback(err, result);
            });
          }, callback);
        },
        function(callback) {
          console.log('initializing');
          if (initializing) {
            exports.initAdresserTemaerView(client, temaDef.singular, callback);
          }
          else {
            exports.updateAdresserTemaerView(client, temaDef.singular).nodeify(callback);
          }
        },
      ], callback);
    });
  }).nodeify(callback);
};

exports.updateTema = function(client, temaDef, tema, callback) {
  var fieldsNotChangedClause = jsonFieldMap[temaDef.singular].map(function(field) {
    return "(fields->>'" + field.name + "') IS DISTINCT FROM ($2::json->>'" + field.name + "')";
  }).join(' OR ');
  var geoChangedClause = "geom IS NULL OR NOT ST_Equals(geom, ST_Multi(ST_SetSRID(" + makeUnionSql(tema.polygons.length, 3) + ", 25832)))";
  var changedSql = "SELECT " + geoChangedClause + " AS geo_changed, (" + fieldsNotChangedClause + ") as fields_changed, geo_version FROM temaer WHERE tema = '" + tema.tema + "' and fields->>'" + temaDef.key + "' = $1";
  var changedParams = [tema.fields[temaDef.key], JSON.stringify(tema.fields)].concat(tema.polygons);
  return Q.ninvoke(client, 'query', changedSql, changedParams).then(function(result) {
    if(!result.rows) {
      return Q.reject(new Error('Could not update DAGI tema, it was not found.'));
    }
    if(result.rows.length !== 1) {
      return Q.reject(new Error('Could not update DAGI tema, unexpected number of rows to update'));
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
    updateParams.push(tema.fields[temaDef.key]);
    var updateSql = "UPDATE temaer SET " + updates.join(', ') + " WHERE fields->>'" + temaDef.key + "' = $" + updateParams.length + "::text";
    return Q.ninvoke(client, 'query', updateSql, updateParams);
  }).nodeify(callback);
};

exports.wfsFeatureToTema = function(feature, mapping) {
  var featureCandidates = feature[mapping.wfsName];
  if (!featureCandidates) {
    logger.error("found no features, feature[" + mapping.wfsName + "], feature = ", JSON.stringify(feature));
  } else {
    logger.debug("found " + featureCandidates.length + " features, feature[" + mapping.wfsName + "], feature = ", JSON.stringify(feature));
  }
  var wfsFeature = featureCandidates[0];

  var result = {
    polygon: gml.gmlGeometryToWkt(wfsFeature[mapping.geometry][0])
  };
  result.fields = _.reduce(mapping.fields, function(memo, fieldMapping, fieldName) {
    memo[fieldName] = fieldMapping.parseFn(wfsFeature[fieldMapping.name][0]);
    return memo;
  }, {});

  return result;
};


exports.initAdresserTemaerView = function(client, temaName, cb) {
  async.series([
    sqlCommon.disableTriggers(client),
    function(cb) {
      client.query('INSERT INTO adgangsadresser_temaer_matview(adgangsadresse_id, tema_id, tema)'+
        ' (SELECT Adgangsadresser.id, gridded_temaer_matview.id, gridded_temaer_matview.tema ' +
        'FROM Adgangsadresser JOIN gridded_temaer_matview  ON  ST_Contains(gridded_temaer_matview.geom, Adgangsadresser.geom) AND tema = $1) ',
        [temaName],
        cb);
    },
    function (cb) {
      client.query(
        'INSERT INTO adgangsadresser_temaer_matview_history(adgangsadresse_id, tema_id, tema) ' +
        '(SELECT adgangsadresse_id, tema_id, tema FROM adgangsadresser_temaer_matview WHERE tema = $1)',
        [temaName],
        cb);
    },
    sqlCommon.enableTriggers(client)
  ], cb);
};

exports.updateAdresserTemaerView = function(client, temaName) {
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
}

