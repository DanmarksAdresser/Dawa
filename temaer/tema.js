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

function getTemaer(client, temaNavn, cb) {
  var sql = "SELECT tema, id, aendret, geo_version, geo_aendret, fields FROM temaer WHERE tema = $1";
  var params = [temaNavn];
  client.query(sql, params, function(err, result) {
    if(err) { cb(err); }
    if(result.rows) {
      return cb(null, result.rows);
    }
    return cb(null, []);
  });
}

exports.addTema = function(client, tema, cb) {
  var sql = 'INSERT INTO temaer(tema, aendret, geo_version, geo_aendret, fields, geom) ' +
    'VALUES ($1, NOW(), $2, NOW(), $3, ST_Multi(ST_SetSRID(' + makeUnionSql(tema.polygons.length, 4) +', 25832))) RETURNING id';
  var params = [tema.tema, 1, tema.fields].concat(tema.polygons);
  client.query(sql, params, function(err, result) {
    if(err) {
      return cb(err);
    }

    return cb(null, result.rows[0].id);
  });
};

exports.deleteTema = function(client, temaDef, tema, cb) {
  var sql = "DELETE FROM temaer WHERE tema = $1 AND fields->>'" + temaDef.key + "' = $2::text";
  var params = [tema.tema, tema.fields[temaDef.key]];
  client.query(sql, params, cb);
};

exports.putTemaer = function(temaDef, temaer, pgConnectionUrl, initializing, callback) {
  sqlCommon.withWriteTransaction(pgConnectionUrl, function(err, client, done) {
    if (err) {
      throw err;
    }
    getTemaer(client, temaDef.singular, function(err, existingTemaer) {
      if (err) {
        throw err;
      }
      var temaerToRemove = removeAll(existingTemaer, temaer, temaDef.key);
      var temaerToCreate = removeAll(temaer, existingTemaer, temaDef.key);
      var temaerToUpdate = removeAll(temaer, temaerToCreate, temaDef.key);
      async.series([
        function(callback) {
          async.eachSeries(temaerToRemove, function(tema, callback) {
            logger.info('Removing DAGI tema', {tema: tema.tema, fields: tema.fields});
            exports.deleteTema(client, tema, callback);
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
          if (initializing) {
            exports.initAdresserTemaerView(client, temaDef.singular, callback);
          }
          else {
            exports.updateAdresserTemaerView(client, temaDef.singular).nodeify(callback);
          }
        },
        function(callback) {
          done(null, callback);
        }
      ], callback);
    });
  });
};

exports.updateTema = function(client, temaDef, tema, cb) {
  var fieldsNotChangedClause = jsonFieldMap[temaDef.singular].map(function(field) {
    return "(fields->>'" + field.name + "') IS DISTINCT FROM ($2::json->>'" + field.name + "')";
  }).join(' OR ');
  var geoChangedClause = "geom IS NULL OR NOT ST_Equals(geom, ST_Multi(ST_SetSRID(" + makeUnionSql(tema.polygons.length, 3) + ", 25832)))";
  var changedSql = "SELECT " + geoChangedClause + " AS geo_changed, (" + fieldsNotChangedClause + ") as fields_changed, geo_version FROM temaer WHERE tema = '" + tema.tema + "' and fields->>'" + temaDef.key + "' = $1";
  var changedParams = [tema.fields[temaDef.key], JSON.stringify(tema.fields)].concat(tema.polygons);
  client.query(changedSql, changedParams, function(err, result) {
    if(err) {
      return cb(err);
    }
    if(!result.rows) {
      return cb('Could not update DAGI tema, it was not found.');
    }
    if(result.rows.length !== 1) {
      return cb(new Error('Could not update DAGI tema, unexpected number of rows to update'));
    }
    var geoChanged = result.rows[0].geo_changed;
    var fieldsChanged = result.rows[0].fields_changed;
    var geo_version = result.rows[0].geo_version;
    if(!geoChanged && !fieldsChanged) {
      return cb(null, {
        rowCount: 0
      });
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
    client.query(updateSql, updateParams, cb);
  });
};

exports.wfsFeatureToTema = function(feature, mapping) {
  var wfsFeature = feature[mapping.wfsName][0];

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

exports.addTemaQ =  Q.denodeify(exports.addTema);

exports.updateTemaQ = Q.denodeify(exports.updateTema);
