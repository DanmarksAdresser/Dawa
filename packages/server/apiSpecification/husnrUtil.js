"use strict";

var logger = require('@dawadk/common/src/logger').forCategory('husnrUtil');
var Husnr = require('@dawadk/common/src/postgres/types').Husnr;

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
  if(!husnr) {
    return null;
  }
  return ('' +( husnr.tal ? husnr.tal : '')) + (husnr.bogstav ? husnr.bogstav : '');
}

function compare(a, b) {
  if(a.tal < b.tal) {
    return -1;
  }
  if(a.tal > b.tal) {
    return 1;
  }
  if(a.bogstav === b.bogstav) {
    return 0;
  }
  if(!a.bogstav && b.bogstav) {
    return -1;
  }
  if(a.bogstav && !b.bogstav) {
    return 1;
  }
  if(a.bogstav < b.bogstav) {
    return -1;
  }
  if(a.bogstav > b.bogstav) {
    return 1;
  }
  throw new Error('This was not supposed to happen');
}

module.exports = {
  husnrRegex,
  parseHusnr: parseHusnr,
  formatHusnr: formatHusnr,
  compare: compare
};
