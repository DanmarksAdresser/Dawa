const { assert }  = require('chai');
const {flattenSchema, checkRequired} = require('../../src/config/holder');
const convict = require('convict');
describe('config holder', () => {
  it('Flattens schema correctly', () => {
    const schema = {
      foo: {
        bar: {
          baz: {
            format: 'string'
          },
          baz2: {
            format: 'string'
          }
        },
        bar2: {
          format: 'string'
        }
      }
    };
    const flattened = flattenSchema(schema);
    assert.deepStrictEqual(flattened, {
      'foo.bar.baz': {format: 'string'},
      'foo.bar.baz2': {format: 'string'},
      'foo.bar2': {format: 'string'}
    });
  });

  it('Checks that required options are present', () => {
    const schema = {
      foo: {
        format: 'string',
        required: true
      },
      bar: {
        format: 'string'
      }
    };
    const config = convict(schema);
    assert.throws(() => checkRequired(schema, config));
    config.set('foo', 'somevalue');
    assert.doesNotThrow(() => checkRequired(schema, config));
  });
});