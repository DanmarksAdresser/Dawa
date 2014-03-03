"use strict";

exports.addDagiTema = function(client, tema, cb) {
  var sql = 'INSERT INTO DagiTemaer(tema, kode, navn, geom) VALUES ($1, $2, $3, ST_SetSRID(ST_GeomFromGeoJSON($4), 25832))';
  var params = [tema.tema, tema.kode, tema.navn, tema.geom];
  client.query(sql, params, cb);
};

exports.updateDagiTema = function(client, tema, cb) {
  var sql = 'UPDATE DagiTemaer SET navn = $1, geom = ST_SetSRID(ST_GeomFromGeoJSON($2), 25832) WHERE tema = $3 AND kode = $4';
  var params = [tema.navn, tema.geom, tema.tema, tema.kode];
  client.query(sql, params, cb);
};

exports.deleteDagiTema = function(client, tema, cb) {
  var sql = 'DELETE FROM DagiTemaer WHERE tema = $1 AND kode = $2';
  var params = [tema.tema, tema.kode];
  client.query(sql, params, cb);
};