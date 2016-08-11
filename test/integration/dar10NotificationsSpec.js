"use strict";

const expect = require('chai').expect;

const notificationsImpl = require('../../dar10/notificationsImpl');
const q = require('q');
const request = require('request-promise');
const WebSocket = require('ws');


describe('DAR 1.0 Notifications', () => {
  let notificationsServer;
  beforeEach(() => {
    notificationsServer = notificationsImpl.createNotificationApp({port: 4001});
    notificationsServer.listen(4001);
  });

  it('Should return a health status page', q.async(function*() {
    const result = yield request.get({uri: 'http://localhost:4001/health', json: true});
    expect(result.status).to.equal('up');
  }));

  it('Should initially return an empty list of notifications for default environment', q.async(function*() {
    const notifications = yield request.get({
      uri: 'http://localhost:4001/notifications',
      json: true
    });
    expect(notifications).to.deep.equal([]);
  }));

  it('Should initially return an empty list of notifications for prod environment', q.async(function*() {
    const notifications = yield request.get({
      uri: 'http://localhost:4001/prod/notifications',
      json: true
    });
    expect(notifications).to.deep.equal([]);
  }));

  it('Should accept a notification', q.async(function*() {
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
    expect(response).to.deep.equal({});
    const notifications =
      yield request.get({uri: 'http://localhost:4001/prod/notifications', json: true});
    expect(notifications).to.deep.equal([notification]);
  }));

  it('Should distribute notifications to websocket clients', q.async(function*() {
    const notification = [
      {
        "entitet": "Husnummer",
        "eventid": 1
      }];
    const ws = new WebSocket('ws://localhost:4001/prod/listen');

    // we set up a promise for checking that we receive a notification.
    // Note that the promise is yielded later.
    const receivedNotification = q.Promise((resolve, reject) => {
      ws.on('message', (data, flags) => {
        try{
          const receivedNotification = JSON.parse(data);
          expect(receivedNotification).to.deep.equal(notification);
        }
        catch(e) {
          reject(e);
        }
        resolve();
      });
    });

    yield q.delay(50);

    // check that we are connected
    {
      const healthPage = yield request.get({uri: 'http://localhost:4001/health', json: true});
      expect(healthPage.clients).to.deep.equal({prod: 1});
    }

    yield request.post({
      uri: 'http://localhost:4001/prod/notify',
      json: true,
      body: notification
    });
    yield receivedNotification;

    ws.close();

    yield q.delay(50);

    // check that the server registered the connecton has been closed
    {
      const healthPage = yield request.get({uri: 'http://localhost:4001/health', json: true});
      expect(healthPage.clients).to.deep.equal({prod: 0});
    }
  }));

  afterEach(() => {
    notificationsServer.close();
  });
});
