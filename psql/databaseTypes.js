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

Husnr.fromPostgres = function(val) {
  if(!val) {
    return null;
  }
  var match = husnrRegex.exec(val);
  var tal = parseInt(unescapeCompositePart(match[1]), 10);
  var bogstav = unescapeCompositePart(match[2]);
  return new Husnr(tal, bogstav);
};

Husnr.prototype.toPostgres = function() {
  return '(' + this.tal + ',' + (this.bogstav ? this.bogstav : '') + ')';
};

function Range(lower, upper, bounds) {
  this.empty = lower === upper;
  if(lower === 'infinity') {
    this.lowerInfinite = true;
  }
  else {
    this.lowerInfinite = false;
    this.lower = lower;
  }
  if(upper === 'infinity') {
    this.upperInfinite = true;
  }
  else {
    this.upperInfinite = false;
    this.upper = upper;
  }
  this.lowerOpen = bounds[0] === '(';
  this.upperOpen = bounds[1] === ')';
}

Range.prototype.toPostgres = function() {
  if(this.empty) {
    return 'empty';
  }
  var lower = this.lowerInfinite ? 'infinity' : this.lower;
  var upper = this.upperInfinite ? 'infinity' : this.upper;
  if(lower.toPostgres) {
    lower = lower.toPostgres();
  }
  if(upper.toPostgres) {
    upper = upper.toPostgres();
  }
  var lowerBound = this.lowerOpen ? '(' : '[';
  var upperBound = + this.upperOpen ? ')' : ']';
  return lowerBound + escapeCompositePart(lower) + ',' + escapeCompositePart(upper) + upperBound;
};

Range.fromPostgres = function(val, subtypeParser) {
  if(!val) {
    return null;
  }
  if(val === 'empty') {
    return { empty: true };
  }
  var match = rangeRegex.exec(val);
  var lower, upper;
  if(match[2] === 'infinity') {
    lower = match[2];
  }
  else {
    lower = subtypeParser(unescapeCompositePart(match[2]));
  }
  if(match[3] === 'infinity') {
    upper = match[3];
  }
  else {
    upper = subtypeParser(unescapeCompositePart(match[3]));
  }
  var bounds = match[1] + match[4];
  return new Range(lower, upper, bounds);
};

exports.Husnr = Husnr;
exports.Range = Range;