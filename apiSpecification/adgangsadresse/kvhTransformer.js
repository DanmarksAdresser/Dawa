"use strict";

var kode4String = require('../util').kode4String;

exports.format = function(rs) {
  return kode4String(rs.kommunekode || 0) +
         kode4String(rs.vejkode || 0) +
         kode4String(rs.husnr || 0);
};