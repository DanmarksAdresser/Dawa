"use strict";

var genericPool = require('generic-pool');
var pg = require('pg.js');
var q = require('q');

var statistics = require('../statistics');

var Client = pg.Client;
var defaults = pg.defaults;

var databases = {};

exports.create = function (name, options) {
  if (databases[name]) {
    throw new Error('Attempted to create a dabase with name ' + name + ' but it already exists');
  }

  var pool = genericPool.Pool({
    name: name,
    max: options.poolSize || defaults.poolSize,
    idleTimeoutMillis: options.poolIdleTimeout || defaults.poolIdleTimeout,
    reapIntervalMillis: options.reapIntervalMillis || defaults.reapIntervalMillis,
    log: options.poolLog || defaults.poolLog,
    create: function (cb) {
      var client = new Client(options);
      client.connect(function (err) {
        if (err) return cb(err, null);

        //handle connected client background errors by emitting event
        //via the pg object and then removing errored client from the pool
        client.on('error', function (e) {
          pool.emit('error', e, client);

          // If the client is already being destroyed, the error
          // occurred during stream ending. Do not attempt to destroy
          // the client again.
          if (!client._destroying) {
            pool.destroy(client);
          }
        });

        // Remove connection from pool on disconnect
        client.on('end', function (e) {
          // Do not enter infinite loop between pool.destroy
          // and client 'end' event...
          if (!client._destroying) {
            pool.destroy(client);
          }
        });
        client.poolCount = 0;
        return cb(null, client);
      });
    },
    destroy: function (client) {
      client._destroying = true;
      client.poolCount = undefined;
      client.end();
    }
  });
  databases[name] = {
    options: options,
    pool: pool
  };
};

function denodeifyClient(client) {
  var result = {};
  result.query = function() {
    return client.query.apply(client, arguments);
  };
  result.queryp = function(query, params) {
    return q.ninvoke(client, 'query', query, params).catch(function(err) {
      return q.reject(err);
    });
  };
  result.emit = function(type, event) {
    client.emit(type, event);
    return this;
  };
  result.on = function(type, handler) {
    client.on(type, handler);
    return this;
  };

  result.once = function(type, handler) {
    client.once(type, handler);
    return this;
  };
  result.removeListener = function(event, listener) {
    client.removeListener(event, listener);
    return this;
  };

  return result;
}

function acquireNonpooledConnection(options, callback) {
  var client = new pg.Client(options);
  client.connect(function (err) {
    if (err) return callback(err);
    callback(undefined, denodeifyClient(client), function () {
      client.end();
    });
  });
}

function acquirePooledConnection(pool, callback) {
  var before = Date.now();
  pool.acquire(function(err, client) {
    statistics.emit('psql_acquire_connection', Date.now() - before, err);
    if(err)  return callback(err);
    client.poolCount++;
    callback(null, denodeifyClient(client), function(err) {
      if(err) {
        pool.destroy(client);
      } else {
        pool.release(client);
      }
    });
  });
}

exports.connect = function(dbname, pooled, callback) {
  var db = databases[dbname];
  if(!db) {
    return callback(new Error('Attempted to connect to unregistered database: ' + dbname));
  }
  if(pooled) {
    acquirePooledConnection(db.pool, callback);
  }
  else {
    acquireNonpooledConnection(db.options, callback);
  }
};

exports.withConnection = function(dbname, pooled, connectedFn) {
  return q.Promise(function (resolve, reject) {
    exports.connect(dbname, pooled, function (err, client, done) {
      if (err) {
        return reject(err);
      }
      return connectedFn(client).then(
        function () {
          done();
        }, function (err) {
          done(err);
          return q.reject(err);
        }
      ).then(resolve, reject);
    });
  });
};

exports.exists = function(dbname) {
  return !!databases[dbname];
};

exports.getPoolStatus = function(dbname) {
  if(!exports.exists(dbname)) {
    return {
      size: 0,
      availableObjectsCount: 0,
      waitingClientsCount: 0
    };
  }
  var pool = databases[dbname].pool;
  return {
    size: pool.getPoolSize(),
    availableObjectsCount: pool.availableObjectsCount(),
    waitingClientsCount: pool.waitingClientsCount()
  };
}