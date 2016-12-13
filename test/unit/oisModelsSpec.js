"use strict";

const expect = require('chai').expect;
const _ = require('underscore');

const oisModels = require('../../ois/oisModels');

describe('OIS models', () => {
  for(let modelName of Object.keys(oisModels)) {
    describe(`The OIS model ${modelName} is valid`, () => {
      const model = oisModels[modelName];
      it('Has a table', () => {
        expect(model.oisTable).to.be.a.string;
      });
      it('Has a key consisting of one column', () => {
        expect(model.key).to.be.an.array;
        expect(model.key.length).to.equal(1);
      });

      it('Has fields', () => {
        expect(model.fields).to.be.an.array;
      });
      for(let field of model.fields) {
        it(`The field ${field.name} is valid`, () => {
          expect(field.name).to.be.a.string;
          const validOisTypes = ['tinyint', 'smallint', 'int', 'bigint', 'char', 'varchar', 'uniqueidentifier', 'decimal'];
          expect(_.contains(validOisTypes, field.oisType)).to.be.true;
          if(_.contains(['char', 'varchar', 'decimal'], field.oisType)) {
            expect(field.oisLength).to.be.a.number;
          }
          else {
            expect(field.oisLength).to.be.undefined;
          }
        });
      }
    });
  }
});
