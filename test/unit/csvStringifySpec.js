"use strict";

const { assert } = require('chai');
const { into } = require('transducers-js');
const { csvStringify } = require('../../util/csvStringify');

describe('csvStringify transducer', () => {
  it('Can stringify some CSV', () => {
    const csvOptions = {header: true, columns: ['a', 'b'], rowDelimiter: '\r\n'};
    const values = [
      {a: 'aValue', b: 'bValue'},
      {a: '\'"', b: 'bValue'}];
    const xf = csvStringify(csvOptions);
    const result = into([], xf, values).join();
    assert.strictEqual(result, `a,b\r\n,aValue,bValue\r\n,"'""",bValue\r\n`);
  });

  it('Can stringify empty CSV', () => {
    const csvOptions = {header: true, columns: ['a', 'b'], rowDelimiter: '\r\n'};
    const values = [];
    const xf = csvStringify(csvOptions);
    const result = into([], xf, values).join();
    assert.strictEqual(result, `a,b\r\n`);
  });
});
