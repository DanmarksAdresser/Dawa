"use strict";

const assert = require('chai').assert;

const notificationsImpl = require('@dawadk/dar-notification-server/src/notificationsImpl');
const notificationClient = require('../src/notification-client');
const { go, Channel } = require('ts-csp');
const request = require('request-promise');

describe('DAR 1.0 Notifications client', () => {
  let notificationsServer;
  beforeEach(() => {
    notificationsServer = notificationsImpl.createNotificationApp({port: 4001});
    notificationsServer.listen(4001);
  });

  afterEach(() => {
    notificationsServer.close();
  });

  it('Should receive notifications', () => go(function*() {
    // create client
    const ch = new Channel();
    const closeClientFn = notificationClient('http://localhost:4001/prod/listen', ch);

    // simulate notification received from DAR
    const notification = [
      {
        "entitet": "Husnummer",
        "eventid": 1
      },
      {
        "entitet": "Adresse",
        "eventid": 32
      },
      {
        "entitet": "NavngivenVej",
        "eventid": 3
      },
      {
        "entitet": "NavngivenVejKommunedel",
        "eventid": 4
      }
    ];
    const response = yield request.post({
      uri: 'http://localhost:4001/prod/notify',
      json: true,
      body: notification
    });
    assert.deepStrictEqual(response, {});

    // receive the notification
    const [receivedNotification, err] = yield ch.take();
    assert.isNull(err);
    // verify content
    assert.deepStrictEqual(notification, receivedNotification);
    closeClientFn();
  }));
});
