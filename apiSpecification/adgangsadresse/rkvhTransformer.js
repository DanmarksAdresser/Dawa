"use strict";

var kode4String = require('../util').kode4String;

exports.format = function(rs) {
  return kode4String(rs.kommunekode);
};