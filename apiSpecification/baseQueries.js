"use strict";

var dbapi = require('../dbapi');
var dagiTemaer = require('./dagiTemaer');

exports.adresse = function(parameters) {
  var baseQuery ={
    select: '',
    whereClauses: [],
    orderClauses: [],
    sqlParams: []
  };
  var sridAlias = dbapi.addSqlParameter(baseQuery, parameters.srid || 4326);
  baseQuery.select = 'SELECT *, ST_AsGeoJSON(ST_Transform(Adresser.geom,' + sridAlias + ')) AS geom_json from Adresser';
  return baseQuery;
};

exports.adgangsadresse = function(parameters) {
  var baseQuery ={
    select: '',
    whereClauses: [],
    orderClauses: [],
    sqlParams: []
  };
  var sridAlias = dbapi.addSqlParameter(baseQuery, parameters.srid || 4326);
  baseQuery.select = 'SELECT *, ST_AsGeoJSON(ST_Transform(AdgangsadresserView.geom,' + sridAlias + ')) AS geom_json from AdgangsadresserView';
  return baseQuery;
};

exports.supplerendebynavn = function() {
  return {
    select: 'SELECT supplerendebynavn, json_agg(DISTINCT CAST((p.nr, p.navn) AS PostnummerRef)) as postnumre, json_agg(DISTINCT CAST((k.kode, k.navn) AS KommuneRef)) as kommuner' +
      ' FROM supplerendebynavne' +
      " LEFT JOIN DagiTemaer k ON k.tema = 'kommune' AND supplerendebynavne.kommunekode = k.kode" +
      ' LEFT JOIN postnumre p ON supplerendebynavne.postnr = p.nr',
    whereClauses: [],
    groupBy: 'supplerendebynavne.supplerendebynavn',
    orderClauses: [],
    sqlParams: []
  };
};

exports.vejnavn = function() {
  return {
    select: 'SELECT vejstykker.vejnavn as navn, json_agg(DISTINCT CAST((p.nr, p.navn) AS PostnummerRef)) AS postnumre,' +
      ' json_agg(DISTINCT CAST((k.kode, k.navn) AS KommuneRef)) as kommuner' +
      ' FROM vejstykker' +
      " LEFT JOIN DagiTemaer k ON k.tema = 'kommune' AND vejstykker.kommunekode = k.kode" +
      ' LEFT JOIN vejstykkerPostnumreMat  vp1 ON (vp1.kommunekode = vejstykker.kommunekode AND vp1.vejkode = vejstykker.kode)' +
      ' LEFT JOIN Postnumre p ON (p.nr = vp1.postnr)' +
      ' LEFT JOIN vejstykkerPostnumreMat vp2 ON (vp2.kommunekode = vejstykker.kommunekode AND vp2.vejkode = vejstykker.kode)',
    whereClauses: [],
    groupBy: 'vejstykker.vejnavn',
    orderClauses: [],
    sqlParams: []
  };
};

exports.postnummer = function() {
  return {
    select:''+
      'SELECT  p.nr, p.navn, p.version, json_agg(DISTINCT CAST((k.kode, k.navn) AS KommuneRef)) as kommuner '+
      'FROM PostnumreKommunekoderMat m '+
      'LEFT JOIN PostnumreKommunekoderMat n ON m.postnr = n.postnr '+
      'LEFT JOIN postnumre p ON p.nr = m.postnr ' +
      " LEFT JOIN DagiTemaer k ON k.tema = 'kommune' AND m.kommunekode = k.kode",
    whereClauses: [],
    groupBy: 'p.nr, p.navn, p.version',
    orderClauses: [],
    sqlParams: []
  };
};

exports.vejstykke = function() {
  return {
    select: 'SELECT vejstykker.kode, vejstykker.kommunekode, vejstykker.version, vejnavn, vejstykker.tsv, max(kommuner.navn) AS kommunenavn, json_agg(DISTINCT CAST((p.nr, p.navn) AS PostnummerRef)) AS postnumre' +
      ' FROM vejstykker' +
      " LEFT JOIN DagiTemaer kommuner ON kommuner.tema = 'kommune' AND vejstykker.kommunekode = kommuner.kode" +

      ' LEFT JOIN vejstykkerPostnumreMat  vp1 ON (vp1.kommunekode = vejstykker.kommunekode AND vp1.vejkode = vejstykker.kode)' +
      ' LEFT JOIN Postnumre p ON (p.nr = vp1.postnr)' +
      ' LEFT JOIN vejstykkerPostnumreMat vp2 ON (vp2.kommunekode = vejstykker.kommunekode AND vp2.vejkode = vejstykker.kode)',
    whereClauses: [],
    groupBy: 'vejstykker.kode, vejstykker.kommunekode',
    orderClauses: [],
    sqlParams: []
  };
};

dagiTemaer.forEach(function(tema) {
  exports[tema.singular] = function(parameters) {
    return {
      select: 'SELECT kode, navn, ST_AsGeoJSON(ST_Transform(DagiTemaer.geom,$2)) as geom_json FROM DagiTemaer',
      whereClauses: ['tema = $1'],
      orderClauses: [],
      sqlParams: [tema.singular, parameters.srid || 4326]
    };
  };
});