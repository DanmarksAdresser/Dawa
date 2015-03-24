"use strict";

var tupleValueRegex = '("(?:[^"]|"")*"|[^",]*)';

function repeat(val, count) {
  var result = [];
  for(var i = 0; i < count; ++i) {
    result.push(val);
  }
  return result;
}

function compositeTypeRegex(valueCount) {
  return new RegExp("^\\(" + repeat(tupleValueRegex, valueCount).join(',') + "\\)$");
}

var husnrRegex = compositeTypeRegex(2);


var rangeRegex = new RegExp('^([\\(\\[])' + tupleValueRegex + ',' + tupleValueRegex + '([\\)\\]])$');

function unescapeCompositePart(val) {
  val = val.trim();
  if(val === '') {
    return null;
  }
  // If the value is quoted, remove the quote
  if(val[0] === '"' && val[val.length - 1] === '"') {
    val = val.substring(1, val.length-1);
  }
  // handle escaped double-quotes
  val = val.replace(/""/g, '"');
  return val;
}

function escapeCompositePart(val) {
  val = val.replace(/"/g, '""');
  val = '"' + val + '"';
  return val;
}

function Husnr(tal, bogstav) {
  this.tal = tal;
  this.bogstav = bogstav;
}

Husnr.lessThan = function(a, b) {
  if(!a || !b) {
    return undefined;
  }
  if(a.tal < b.tal) {
    return true;
  }
  if(a.tal === b.tal) {
    if(!a.bogstav && b.bogstav) {
      return true;
    }
    return a.bogstav < b.bogstav;
  }
  return false;
};

Husnr.fromPostgres = function(val) {
  if(!val) {
    return null;
  }
  var match = husnrRegex.exec(val);
  var tal = parseInt(unescapeCompositePart(match[1]), 10);
  var bogstav = unescapeCompositePart(match[2]);
  if(bogstav === '') {
    bogstav = null;
  }
  return new Husnr(tal, bogstav);
};

Husnr.prototype.toPostgres = function() {
  return '(' + this.tal + ',' + (this.bogstav ? this.bogstav : escapeCompositePart('')) + ')';
};


function Range(lower, upper, bounds) {
  this.empty = bounds === 'empty';
  if(this.empty) {
    return;
  }
  if(lower === null) {
    this.lowerInfinite = true;
  }
  else {
    this.lowerInfinite = false;
    this.lower = lower;
  }
  if(upper === null) {
    this.upperInfinite = true;
  }
  else {
    this.upperInfinite = false;
    this.upper = upper;
  }
  this.lowerOpen = bounds[0] === '(' || this.lowerInfinite;
  this.upperOpen = bounds[1] === ')' || this.upperInfinite;
}

Range.prototype.toPostgres = function() {
  if(this.empty) {
    return 'empty';
  }
  var lower = this.lowerInfinite ? '' : this.lower;
  var upper = this.upperInfinite ? '' : this.upper;
  if(lower.toPostgres) {
    lower = lower.toPostgres();
  }
  if(upper.toPostgres) {
    upper = upper.toPostgres();
  }
  var lowerBound = this.lowerOpen ? '(' : '[';
  var upperBound = + this.upperOpen ? ')' : ']';
  var escapedLower = lower === '' ? '' : escapeCompositePart(lower);
  var escapedUpper = upper === '' ? '' : escapeCompositePart(upper);
  return  lowerBound + escapedLower + ',' + escapedUpper + upperBound;
};

Range.fromPostgres = function(val, subtypeParser) {
  if(!val) {
    return null;
  }
  if(val === 'empty') {
    return new Range(null, null, 'empty');
  }
  var match = rangeRegex.exec(val);
  var lower, upper;
  if(match[2] === '') {
    lower = null;
  }
  else {
    lower = subtypeParser(unescapeCompositePart(match[2]));
  }
  if(match[3] === '') {
    upper = null;
  }
  else {
    upper = subtypeParser(unescapeCompositePart(match[3]));
  }
  var bounds = match[1] + match[4];
  return new Range(lower, upper, bounds);
};

/*
  Note that we do not add a parser for Geometry.
 */
function GeometryPoint2d(x, y, srid) {
  this.x = x;
  this.y = y;
  this.srid = srid;
}

GeometryPoint2d.prototype.toPostgres = function() {
  return 'SRID=' + this.srid + ';POINT(' + this.x + ' ' + this.y + ')';
};

exports.Husnr = Husnr;
exports.Range = Range;
exports.GeometryPoint2d = GeometryPoint2d;