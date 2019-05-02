"use strict";
const { assert } = require('chai');
const { removeZCoordinate } = require('../../apiSpecification/common/representationUtil');
describe('representationUtil', () => {
  it('Removes duplicate coordinates from GeoJSON polygons when converting to 2D', () => {
    const coordinates = [[0, 0, 0], [0, 1, 0], [0, 1, 1], [0, 1, 2], [1, 0, 0], [0, 0, 0]];
    const result = removeZCoordinate(coordinates);
    assert.deepStrictEqual(result, [[0,0], [0,1], [1,0], [0, 0]]);
  });

  it('Removes duplicate coordinates at beginning and end', () => {
    const coordinates = [[0, 0, 0], [0, 0, 1], [0, 1, 0], [1, 0, 0], [0, 0, 0], [0, 0, 1]];
    const result = removeZCoordinate(coordinates);
    assert.deepStrictEqual(result, [[0,0], [0,1], [1,0], [0, 0]]);
  });
});