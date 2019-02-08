const {assert} = require('chai');

const {getExecutionOrder} = require('../../../components/execute');

describe('Component execution', () => {
  describe('Execution order', () => {
    it('Computes correct execution order', () => {
      const rootComponent = {
        id: 'rootComponent',
        produces: ['rootTable'],
        requires: []
      };
      const firstComponent = {
        id: 'firstComponent',
        produces: ['firstTable'],
        requires: ['rootTable']
      };
      const secondComponent = {
        id: 'secondComponent',
        requires: ['firstTable'],
        produces: ['secondTable', 'thirdTable']
      };
      const thirdComponent = {
        id: 'thirdComponent',
        requires: ['thirdTable'],
        produces: ['fourthTable']
      };
      const unmodifiedComponent = {
        id: 'unmodifiedComponent',
        requires: ['unmodifiedTable'],
        produces: ['anotherTable']
      };
      const executionOrder = getExecutionOrder([rootComponent], [thirdComponent, secondComponent, rootComponent, firstComponent, unmodifiedComponent]);
      assert.deepStrictEqual(executionOrder, [
        "rootComponent",
        "firstComponent",
        "secondComponent",
        "thirdComponent"
      ]);
    });
  });
});