"use strict";

var dagiTemaer = require('../apiSpecification/temaer/temaer');
var jsonFieldMap = require('../apiSpecification/temaer/additionalFields');
var _ = require('underscore');
var dataUtil = require('../psql/dataUtil');
var divergensImpl = require('../psql/divergensImpl');
var loadAdresseDataImpl = require('../psql/load-adresse-data-impl');
var datamodels = require('../crud/datamodel');
var async = require('async');
var sqlCommon = require('../psql/common');
var dbapi = require('../dbapi');

var MAX_INT =  2147483647;

exports.getDagiTemaer = function(client, temaNavn, cb) {
  var sql = "SELECT tema, id, aendret, geo_version, geo_aendret, fields FROM temaer WHERE tema = $1";
  var params = [temaNavn];
  client.query(sql, params, function(err, result) {
    if(err) cb(err);
    if(result.rows) {
      return cb(null, result.rows);
    }
    return cb(null, []);
  });
};

function findTema(temaNavn) {
  return _.findWhere(dagiTemaer, { singular: temaNavn });
}

function makeUnionSql(count, firstAlias) {
  var items = [];
  for(var i = 0; i < count; ++i) {
    items.push('ST_GeomFromText($' + (firstAlias + i) +')' );
  }
  return 'ST_union(ARRAY[' + items.join(',') + '])';
}

exports.addDagiTema = function(client, tema, cb) {
  var sql = 'INSERT INTO temaer(tema, aendret, geo_version, geo_aendret, fields, geom) ' +
    'VALUES ($1, NOW(), $2, NOW(), $3, ST_Multi(ST_SetSRID(' + makeUnionSql(tema.polygons.length, 4) +', 25832))) RETURNING id';
  var params = [tema.tema, 1, tema.fields].concat(tema.polygons);
  client.query(sql, params, function(err, result) {
    if(err) {
      return cb(err);
    }
    else {
      return cb(null, result.rows[0].id);
    }
  });
};

exports.updateDagiTema = function(client, tema, cb) {
  var key = findTema(tema.tema).key;
  var fieldsNotChangedClause = jsonFieldMap[tema.tema].map(function(field) {
    return "(fields->>'" + field.name + "') IS DISTINCT FROM ($2::json->>'" + field.name + "')";
  }).join(' OR ');
  var geoChangedClause = "geom IS NULL OR NOT ST_Equals(geom, ST_Multi(ST_SetSRID(" + makeUnionSql(tema.polygons.length, 3) + ", 25832)))";
  var changedSql = "SELECT " + geoChangedClause + " AS geo_changed, (" + fieldsNotChangedClause + ") as fields_changed, geo_version FROM temaer WHERE tema = '" + tema.tema + "' and fields->>'" + key + "' = $1";
  var changedParams = [tema.fields[key], JSON.stringify(tema.fields)].concat(tema.polygons);
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
    updateParams.push(tema.fields[key]);
    var updateSql = "UPDATE temaer SET " + updates.join(', ') + " WHERE fields->>'" + key + "' = $" + updateParams.length + "::text";
    client.query(updateSql, updateParams, cb);
  });
};

exports.deleteDagiTema = function(client, tema, cb) {
  var key = findTema(tema.tema).key;
  var sql = "DELETE FROM temaer WHERE tema = $1 AND fields->>'" + key + "' = $2::text";
  var params = [tema.tema, tema.fields[key]];
  client.query(sql, params, cb);
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
    function(cb) {
      loadAdresseDataImpl.initializeHistoryTable(client, 'adgangsadresse_tema', cb);
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