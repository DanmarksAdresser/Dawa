"use strict";

var logger = require('../logger').forCategory('husnrUtil');
var Husnr = require('../psql/databaseTypes').Husnr;

var husnrRegex = /^(\d*)([A-ZÆØÅ]?)$/;

function parseHusnr(str) {
  if(!str) {
    return null;
  }
  str = str.trim();
  if(str === '') {
    return null;
  }
  var match = husnrRegex.exec(str);
  if(!match) {
    logger.error('Unable to parse husnr: ' + str);
    return null;
  }
  var tal;
  if(match[1] !== '') {
    tal = parseInt(match[1], 10);
  }
  else {
    tal = 0;
  }
  var bogstav = match[2] ? match[2] : null;
  return new Husnr(tal, bogstav);

}

function formatHusnr(husnr) {
  return ('' +( husnr.tal ? husnr.tal : '')) + (husnr.bogstav ? husnr.bogstav : '');
}

module.exports = {
  parseHusnr: parseHusnr,
  formatHusnr: formatHusnr
};
