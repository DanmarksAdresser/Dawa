"use strict";

var expect = require('chai').expect;
var q = require('q');
var qUtil = require('../../q-util');

describe('qUtil', () => {
  describe('mapObjectAsync', () => {
    it('Should map every value', () => {

    });
    var obj = {a : 1, b: 2};
    return q.async(function*() {
      var result = yield qUtil.mapObjectAsync(obj, function*(value, key) {
        return yield q.delay(1).then((value) => value + 1);
      });

      expect(result).to.deep.equal({a: 2, b: 3});
    })();
  });
});
