"use strict";

const expect = require('chai').expect;
const { into } = require('transducers-js');
const { separate } = require('../../util/transducer-util');

describe('separate', () => {
  it('Can Separate with a begin, separator and end', () => {
    const xf = separate({ open: 'myBegin', separator: 'mySep', close: 'myEnd'});
    const result = into([], xf, ['a', 'b', 'c']);
    expect(result).to.deep.equal(['myBegin', 'a', 'mySep', 'b', 'mySep', 'c', 'myEnd']);
  });
  it('Interposing a single item results in just that item', () => {
    const xf = separate({ open: 'myBegin', separator: 'mySep', close: 'myEnd'});
    const result = into([], xf, ['a']);
    expect(result).to.deep.equal(['myBegin', 'a', 'myEnd']);
  });
  it('Interposing zero items result in zero items', () => {
    const xf = separate({ open: 'myBegin', separator: 'mySep', close: 'myEnd'});
    const result = into([], xf, []);
    expect(result).to.deep.equal(['myBegin', 'myEnd']);
  });
});
