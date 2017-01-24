"use strict";

const expect = require('chai').expect;

const q = require('q');

const {Channel, CLOSED, TAKE, PUT, select} = require('../../csp');
describe('Channel', () => {
  it('I can immediately put a value to a channel with bufsize 1', () => {
    const ch = new Channel(1);
    expect(ch.canPutImmediate()).to.be.true;
    ch.putImmediate('foo');
    const result = ch.takeImmediate();
    expect(result).to.equal('foo');
  });

  it('I cannot put a value to a channel with bufsize 0 if I do not allow overflow', () => {
    const ch = new Channel();
    expect(() => ch.putImmediate('foo')).to.throw(Error);
    expect(() => ch.putImmediate('foo', true)).to.not.throw(Error);
  });

  it('If I create a channel of size 1 at put a value on it, there are no remaining buffer slots', () => {
    const ch = new Channel(1);
    ch.putImmediate('foo');
    expect(ch.bufferRemaining()).to.equal(0);
  });

  it('I can put async to a channel of size 0, and the put will resolve when the value is taken',
    () => {
      const ch = new Channel();
      const putPromise = ch.put('foo');
      expect(putPromise.isFulfilled()).to.be.false;
      const takePromise = ch.take();
      expect(putPromise.isFulfilled()).to.be.true;
      expect(takePromise.isFulfilled()).to.be.true;

    });

  it('If i put a value to a channel and close it, I can take the value and CLOSED from it', q.async(function*() {
    const ch = new Channel();
    ch.put('foo');
    ch.close();
    const result = yield ch.take();
    expect(result).to.equal('foo');
    const secondResult = yield ch.take();
    expect(secondResult).to.equal(CLOSED);
  }));

  it('If i take from a channel with no avaiable values, the promise will be resolved when a value is available', () => {
    const ch = new Channel();
    const p = ch.take();
    expect(p.isFulfilled()).to.be.false;
    const putPromise = ch.put('foo');
    expect(p.isFulfilled()).to.be.true;
    expect(putPromise.isFulfilled()).to.be.true;
  });

  it('If I select on two channels, and one has data available, I will get that value', () => {
    const chs = [new Channel(), new Channel()];
    chs[1].put('foo');
    const p = select([{ch: chs[0], op: TAKE}, {ch: chs[1], op: TAKE}]);
    expect(p.isFulfilled()).to.be.true;
    const result = p.inspect().value;
    expect(result.value).to.equal('foo');
    expect(result.ch).to.equal(chs[1]);
    expect(result.op).to.equal(TAKE);
  });

  it('If I select TAKEs on two channels, and and data becomes available on one channel, the select will succeed', () => {
    const chs = [new Channel(), new Channel()];
    const p = select([{ch: chs[0], op: TAKE}, {ch: chs[1], op: TAKE}]);
    expect(p.isFulfilled()).to.be.false;
    chs[1].put('foo');
    expect(p.isFulfilled()).to.be.true;
    const result = p.inspect().value;
    expect(result.value).to.equal('foo');
    expect(result.ch).to.equal(chs[1]);
    expect(result.op).to.equal(TAKE);
  });

  it('If I select a put on a channel without buffer, and a taker is available, the put select will fulfill immediately', () => {
    const ch = new Channel();
    const takePromise = ch.take();
    expect(takePromise.isFulfilled()).to.be.false;
    const selectPromise = select([{ch: ch, op: PUT, value: 'foo'}]);
    expect(selectPromise.isFulfilled()).to.be.true;
    expect(selectPromise.inspect().value.value).to.equal('foo');
    expect(takePromise.inspect().value).to.equal('foo');
  });

  it('If I select TAKE twice on a channel, and a value is put on the channel, exactly one select is fulfilled', () => {
    const ch = new Channel();
    const p1 = select([{ch: ch, op: TAKE}]);
    const p2 = select([{ch: ch, op: TAKE}]);
    expect(p1.isFulfilled()).to.be.false;
    expect(p2.isFulfilled()).to.be.false;
    ch.putImmediate('foo');
    expect(p1.isFulfilled()).to.be.true;
    expect(p1.inspect().value.value).to.equal('foo');
    const p3 = select([{ch: ch, op: TAKE}]);
    ch.putImmediate('bar');
    expect(p2.inspect().value.value).to.equal('bar');
    expect(p3.isFulfilled()).to.be.false;
  });

  it('If I select a take on a channel, and it is closed, the take will be fulfilled', () => {
    const ch = new Channel();
    const p1 = select([{ch: ch, op: TAKE}]);
    const p2 = select([{ch: ch, op: TAKE}]);
    ch.close();
    expect(p1.inspect().value.value).to.equal(CLOSED);
    expect(p2.inspect().value.value).to.equal(CLOSED);
  });

  it('If i select a PUT on a channel and closes it, the PUT will not be resolved', () => {
    const ch = new Channel();
    const p1 = select([{ch: ch, op: PUT, value: 'foo'}]);
    ch.close();
    const pTake = ch.take();
    expect(pTake.inspect().value).to.equal(CLOSED);
    expect(p1.isRejected()).to.be.true;
  });


});
