"use strict";

const expect = require('chai').expect;
const q = require('q');

const testdb = require('../helpers/testdb');
const cursorChannel = require('../../cursor-channel');
const { Signal, CLOSED } = require('../../csp');

describe('Cursor Channel', () => {
  testdb.withTransactionEach('test', clientFn => {
    it('Can successfully fetch a stream of rows from the database', q.async(function*() {
      const abortSignal = new Signal();
      const {channel, endSignal } = cursorChannel(clientFn(), 'SELECT id FROM adgangsadresser LIMIT 10', [], abortSignal, {
        fetchSize: 2, bufferSize: 4
      });
      let count = 0;
      /* eslint no-constant-condition: 0 */
      while(true) {
        const row = yield channel.take();
        if(row === CLOSED) {
          break;
        }
        expect(row.id).to.be.a.string;
        ++count;
      }
      expect(count).to.equal(10);
      const result = yield endSignal.take();
      expect(result).to.be.null;
    }));
  });
});
