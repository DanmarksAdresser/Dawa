"use strict";

const expect = require('chai').expect;

const testdb = require('../helpers/testdb2');
const cursorChannel = require('../../util/cursor-channel');
const { go, CLOSED, Channel } = require('ts-csp');

describe('Cursor Channel', () => {
  testdb.withTransactionEach('test', clientFn => {
    it('Can successfully fetch a stream of rows from the database', () =>
      go(function*() {
      const channel = new Channel();
      const cursorChannelProcess = cursorChannel(
        clientFn(), 'SELECT id FROM adgangsadresser LIMIT 10', [], channel, {
          fetchSize: 2
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
      yield cursorChannelProcess;
    }).asPromise());
  });
});
