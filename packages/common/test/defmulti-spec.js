const { assert } = require('chai');
const defmulti = require('../src/defmulti');

describe('defmulti dispatches appropriately', () => {
  it('Dispatches to the right method', () => {
    const area = defmulti(obj => obj.type);
    const SQUARE = {};
    const RECTANGLE = {};

    area.method(SQUARE, square => square.side * square.side);
    area.method(RECTANGLE, rect => rect.width * rect.height);

    const twoByTwo = {
      type: SQUARE,
      side: 2
    };

    const twoByThree = {
      type: RECTANGLE,
      width: 2,
      height: 3
    };

    assert.strictEqual(area(twoByTwo), 4);
    assert.strictEqual(area(twoByThree), 6);
  });

  it('Dispatches default method', () => {
    const greet = defmulti(obj => obj.type);

    greet.method('friend', ({name}) => `Hello, ${name}!`);
    greet.defaultMethod(() => 'Do I know you?');

    const friend = {
      type: 'friend',
      name: 'John'
    };
    const stranger = {
      type: 'stranger'
    };
    assert.strictEqual(greet(friend), 'Hello, John!');
    assert.strictEqual(greet(stranger), 'Do I know you?');
  });
});