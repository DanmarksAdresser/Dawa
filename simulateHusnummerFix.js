"use strict";

const split2 = require('split2');
const through2 = require('through2');
const fs = require('fs');
const moment = require('moment');

const cliParameterParsing = require('./bbr/common/cliParameterParsing');

const optionSpec = {
  in: [false, 'husnummer input', 'string'],
  out: [false, 'husnummer output', 'string']
};

const regex = /POINT \(([\-0-9E\.]+) ([\-0-9E\.]+)\)/;
let nextKey = 100000000;

cliParameterParsing.main(optionSpec, Object.keys(optionSpec), function (args, options) {
  const input = fs.createReadStream(options.in, {encoding: 'utf8'});
  const output = fs.createWriteStream(options.out, {encoding: 'utf8'});
  const time = moment().toISOString();
  input.pipe(split2())
    .pipe(through2(function (chunk, enc, callback) {
      const obj = JSON.parse(chunk);
      if(obj.registreringtil || !obj.husnummerretning) {
        this.push(chunk + '\n');
      }
      else {
        obj.registreringtil = time;
        this.push(JSON.stringify(obj) + '\n');
        const obj2 = JSON.parse(chunk);
        obj2.rowkey = nextKey++;
        const regexResult = regex.exec(obj2.husnummerretning);
        const [x,y] = [parseFloat(regexResult[1]), parseFloat(regexResult[2])];
        const [newx, newy] = x >= 0 ? [x, -y] : [-x, y];
        obj2.husnummerretning = `POINT (${newx} ${newy})`;
        obj2.registreringfra = time;
        this.push(JSON.stringify(obj2) + '\n');
      }
      callback()
    }))
    .pipe(output)
    .on('finish', function () {
    });
});