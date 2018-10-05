"use strict";

const { go, Signal, Channel, parallel, Abort } = require('ts-csp');
const { takeWithTimeout, channelEvents } = require('../util/cspUtil');
const logger = require('../logger').forCategory('messaging-worker');


const setup = (process) => {
  const send = (type, message) => {
    process.send({
      '@@MESSAGE_TYPE': type,
      payload: message
    });
  };


  const receivers = [];

  const subscribe = (type, channel) => {
    receivers.push({
      type,
      dst: channel,
      predicate: () => true,
      once: false
    })
  };

  const receiveOnce = (type, predicate, timeout) => go(function*() {
    const dst = new Signal();
    const receiver = {
      type,
      dst,
      predicate,
      once: true
    };
    receivers.push(receiver);
    return yield this.delegateAbort(takeWithTimeout(timeout, dst, () => new Error('Timeout waiting for message from master')));
  });
  const proc = go(function*() {
    const channel = new Channel();
    const channellingProcess = channelEvents(process, 'message', channel);
    const dispatcherProcess = go(function*() {
      /* eslint no-constant-condition: 0 */
      while(true) {
        const message = yield this.takeOrAbort(channel);
        const messageType = message['@@MESSAGE_TYPE'];
        if(!messageType) {
          continue;
        }
        let foundReceiver = false;
        for(let receiver of receivers) {
          if(receiver.type === messageType && receiver.predicate(message.payload)) {
            foundReceiver = true;
            const dst = receiver.dst;
            if(dst instanceof Signal) {
              dst.raise(message.payload);
            }
            else {
              dst.putSync(message.payload);
            }
            if(receiver.once) {
              receivers.splice(receivers.indexOf(receiver), 1);
            }
            break;
          }
        }
        if(!foundReceiver) {
          logger.error('Lost message', message);
        }
      }
    });
    try {
      yield this.delegateAbort(parallel(channellingProcess, dispatcherProcess));
    }
    catch(err) {
      if(err instanceof Abort) {
        logger.info('Messaging-Worker aborted', err);
      }
      else {
        logger.error('Messaging-worker crashed', err);
      }
      throw err;
    }
  });

  return {
    process: proc,
    send,
    receiveOnce,
    subscribe
  };
};

module.exports = {
  setup
};
