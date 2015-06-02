"use strict";

var genericPool = require('generic-pool');
var pg = require('pg.js');
var q = require('q');
var util = require('util');
var _ = require('underscore');

var logger = require('../logger').forCategory('sql');
var statistics = require('../statistics');

var Client = pg.Client;
var defaults = pg.defaults;

var databases = {};
var databaseInitializerDeferreds = {};

function awaitInitialization(dbname) {
  if(!databaseInitializerDeferreds[dbname]) {
    databaseInitializerDeferreds[dbname] = q.defer();
  }
  return databaseInitializerDeferreds[dbname].promise;
}

exports.create = function(name, options) {
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
  return {
    options: options,
    pool: pool
  };
};

exports.register = function (name, options) {
  if (databases[name]) {
    throw new Error('Attempted to create a dabase with name ' + name + ' but it already exists');
  }
  databases[name] = exports.create(name, options);
  if(!databaseInitializerDeferreds[name]) {
    databaseInitializerDeferreds[name] = q.defer();
  }
  databaseInitializerDeferreds[name].resolve(databases[name]);
};

function denodeifyClient(client) {
  var result = {};
  result.query = function() {
    return client.query.apply(client, arguments);
  };
  result.queryp = function (query, params) {
    var before = Date.now();
    return q.ninvoke(result, 'query', query, params)
      .then(function (result) {
        statistics.emit('psql_query', Date.now() - before, null, {sql: query});
        return result;
      }).catch(function (err) {
        statistics.emit('psql_query', Date.now() - before, err, {sql: query});
        logger.error("Query failed: ", {
          query: query,
          params: params,
          error: err
        });
        return q.reject(err);
      });
  };
  result.querypLogged = function(query, params) {
    return result.queryp('EXPLAIN ' + query, params).then(function(plan) {
      console.log(JSON.stringify(plan.rows, null, 2));
      return result.queryp(query, params);
      });
  }
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

function acquirePooledConnection(pool, options, callback) {
  var before = Date.now();
  var maxWaitingClients = options.maxWaitingClients;
  if(maxWaitingClients === undefined) {
    maxWaitingClients = 20;
  }
  if(pool.availableObjectsCount() === 0 &&
    pool.getPoolSize() === pool.getMaxPoolSize() &&
    pool.waitingClientsCount() >= maxWaitingClients) {
    logger.error("Could not acquire database connection: Pool is full.", {
      poolSize: pool.getPoolSize(),
      maxPoolSize: pool.getMaxPoolSize(),
      waitingClientsCount: pool.waitingClientsCount()
    });
    return callback(new Error("Could not acquire database connection: Pool is full."));
  }
  logger.info('Acquiring connection', {
    poolSize: pool.getPoolSize(),
    maxPoolSize: pool.getMaxPoolSize(),
    waitingClientsCount: pool.waitingClientsCount()
  });
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

exports.connect = function(dbOrName, pooled, callback) {
  function doConnect(db, pooled, callback) {
    if(pooled) {
      acquirePooledConnection(db.pool, db.options, callback);
    }
    else {
      acquireNonpooledConnection(db.options, callback);
    }
  }
  if(_.isString(dbOrName)) {
    return awaitInitialization(dbOrName).then(function() {
      doConnect(databases[dbOrName], pooled, callback);
    }, function(err) {
      callback(err);
    });
  }
  else {
    return doConnect(dbOrName, pooled, callback);
  }
};

exports.withConnection = function(dbOrName, pooled, connectedFn) {
  return q.Promise(function (resolve, reject) {
    exports.connect(dbOrName, pooled, function (err, client, done) {
      if (err) {
        return reject(err);
      }
      return connectedFn(client).then(
        function (result) {
          done();
          return result;
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