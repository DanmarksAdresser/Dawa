"use strict";

exports.getDagiTemaer = function(client, temaNavn, cb) {
  var sql = "SELECT tema, kode, navn, ST_AsGeoJSON(geom) FROM DagiTemaer WHERE tema = $1";
  var params = [temaNavn];
  client.query(sql, params, function(err, result) {
    if(err) cb(err);
    if(result.rows) {
      return cb(null, result.rows);
    }
    return cb(null, []);
  });
};

function makeUnionSql(count) {
  var firstAlias = 4;
  var items = [];
  for(var i = 0; i < count; ++i) {
    items.push('st_geomfromtext($' + (firstAlias + i) +')' );
  }
  return 'ST_union(ARRAY[' + items.join(',') + '])';
}
exports.addDagiTema = function(client, tema, cb) {
  var sql, params;
  sql = 'INSERT INTO DagiTemaer(tema, kode, navn, geom) VALUES ($1, $2, $3, ST_Multi(ST_SetSRID(' + makeUnionSql(tema.polygons.length) +', 25832)))';
  params = [tema.tema, tema.kode, tema.navn].concat(tema.polygons);
  client.query(sql, params, cb);
};

exports.updateDagiTema = function(client, tema, cb) {
  var sql, params;
  sql = 'UPDATE DagiTemaer SET navn = $1, geom = ST_Multi(ST_SetSRID(' + makeUnionSql(tema.polygons.length) + ', 25832)) WHERE tema = $2 AND kode = $3 AND ((DagiTemaer.navn is distinct from $1::varchar) OR geom IS NULL OR NOT ST_Equals(geom, ST_Multi(ST_SetSRID(' + makeUnionSql(tema.polygons.length) + ', 25832))))';
  params = [tema.navn, tema.tema, tema.kode].concat(tema.polygons);
  client.query(sql, params, cb);
};

exports.deleteDagiTema = function(client, tema, cb) {
  var sql = 'DELETE FROM DagiTemaer WHERE tema = $1 AND kode = $2';
  var params = [tema.tema, tema.kode];
  client.query(sql, params, cb);
};