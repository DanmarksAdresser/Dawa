"use strict";

var dagiTemaer = require('../apiSpecification/temaer/temaer');
var jsonFieldMap = require('../apiSpecification/temaer/additionalFields');
var _ = require('underscore');

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