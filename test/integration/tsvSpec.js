"use strict";

var async = require('async');
var crud = require('../../crud/crud');
var datamodels = require('../../crud/datamodel');
var dbapi = require('../../dbapi');
var _ = require('underscore');

var setupFixture = require('../util/testUtil').setupFixture;

var testFixture = {
  vejstykke: [{
    kommunekode: 999,
    kode: 9999,
    vejnavn: 'Testvej'
  }, {
    kommunekode: 999,
    kode: 9997,
    vejnavn: 'Vestvejen'
  }],
  postnummer: [{
    nr: 9998,
    navn: 'Testpostnummer'
  }],
  adgangsadresse: [{
    id: '11111111-1111-1111-1111-111111111111',
    husnr: '32A',
    supplerendebynavn: 'Testby',
    kommunekode: 999,
    vejkode: 9999,
    postnr: 9998
  }],
  enhedsadresse: [{
    id: '11111111-1111-1111-1111-111111111112',
    etage: null,
    doer: 'tv',
    adgangsadresseid: '11111111-1111-1111-1111-111111111111'
  }]
};


// all the tests in this file follows the following format:
// first, an updated is performed (or the test is verifying something
// in the initial fixture).
// Second, an object that is supposed to be modified is retrieved from the DB
// finally, som expectations are made about the object

var vejstykkeTests = [{
  description: 'Upon insertion, the TSV column should be set',
  verify: {
    model: 'vejstykke',
    query: {
      kommunekode: 999,
      kode: 9999
    },
    expect: function(updated) {
      expect(updated.tsv).toBe("'testvej':1");
    }
  }
  }, {
  description: 'Upon update of vejstykke, the TSV column should be updated',
  update: {
    model: 'vejstykke',
    update: {
      kommunekode: 999,
      kode: 9999,
      vejnavn: 'Tastvej'
    }
  },
  verify: {
    model: 'vejstykke',
    query: {
      kommunekode: 999,
      kode: 9999
    },
    expect: function(updated) {
      expect(updated.tsv).toBe("'tastvej':1");
    }
  }
}];

var postnummerTests = [{
  description: 'Upon insertion, the TSV column should be set',
  verify: {
    model: 'postnummer',
    query: {
      nr: 9998
    },
    expect: function(updated) {
      expect(updated.tsv).toBe("'9998':1 'testpostnummer':2");
    }
  }
}, {
  description: 'Upon update of postnummer, the TSV column should be updated',
  update: {
    model: 'postnummer',
    update: {
      nr: 9998,
      navn: 'Tastpostnummer'
    }
  },
  verify: {
    model: 'postnummer',
    query: {
      nr: 9998
    },
    expect: function(updated) {
      expect(updated.tsv).toBe("'9998':1 'tastpostnummer':2");
    }
  }
}];

var adgangsadresseTests = [{
  description: 'Upon insertion, the TSV column should be set',
  verify: {
    model: 'adgangsadresse',
    query: {
      id: '11111111-1111-1111-1111-111111111111'
    },
    expect: function(updated) {
      expect(updated.tsv).toBe("'32a':2A '9998':4 'testby':3C 'testpostnummer':5 'testvej':1A");
    }
  }
}, {
  description: 'Upon update, the TSV column should be set',
  update: {
    model: 'adgangsadresse',
    update: {
      id: '11111111-1111-1111-1111-111111111111',
      vejkode: 9997
    }
  },
  verify: {
    model: 'adgangsadresse',
    query: {
      id: '11111111-1111-1111-1111-111111111111'
    },
    expect: function(updated) {
      expect(updated.tsv).toBe("'32a':2A '9998':4 'testby':3C 'testpostnummer':5 'vestvejen':1A");
    }
  }
}, {
  description: 'Upon update of vejstykke, the tsv column should be set',
  update: {
    model: 'vejstykke',
    update: {
      kommunekode: 999,
      kode: 9999,
      vejnavn: 'Tastvej'
    }
  },
  verify: {
    model: 'adgangsadresse',
    query: {
      id: '11111111-1111-1111-1111-111111111111'
    },
    expect: function(updated) {
      expect(updated.tsv).toBe("'32a':2A '9998':4 'tastvej':1A 'testby':3C 'testpostnummer':5");
    }
  }
}, {
  description: 'Upon update of postnummer, the tsv column should be set',
  update: {
    model: 'postnummer',
    update: {
      nr: 9998,
      navn: 'Tastpostnummer'
    }
  },
  verify: {
    model: 'adgangsadresse',
    query: {
      id: '11111111-1111-1111-1111-111111111111'
    },
    expect: function(updated) {
      expect(updated.tsv).toBe("'32a':2A '9998':4 'tastpostnummer':5 'testby':3C 'testvej':1A");
    }
  }
}];

var enhedsadresseTests = [{
  description: 'Upon insertion, the TSV column should be set',
  verify: {
    model: 'enhedsadresse',
    query: {
      id: '11111111-1111-1111-1111-111111111112'
    },
    expect: function(updated) {
      expect(updated.tsv).toBe("'32a':2A '9998':4 'testby':3C 'testpostnummer':5 'testvej':1A 'tv':6B");
    }
  }
}, {
  description: 'Upon update, the TSV column should be set',
  update: {
    model: 'enhedsadresse',
    update: {
      id: '11111111-1111-1111-1111-111111111112',
      etage: '3'
    }
  },
  verify: {
    model: 'enhedsadresse',
    query: {
      id: '11111111-1111-1111-1111-111111111112'
    },
    expect: function(updated) {
      expect(updated.tsv).toBe("'3':6B '32a':2A '9998':4 'testby':3C 'testpostnummer':5 'testvej':1A 'tv':7B");
    }
  }
}, {
  description: 'Upon update of adgangsadresse, the TSV column should be set',
  update: {
    model: 'adgangsadresse',
    update: {
      id: '11111111-1111-1111-1111-111111111111',
      husnr: '36C'
    }
  },
  verify: {
    model: 'enhedsadresse',
    query: {
      id: '11111111-1111-1111-1111-111111111112'
    },
    expect: function(updated) {
      expect(updated.tsv).toBe("'36c':2A '9998':4 'testby':3C 'testpostnummer':5 'testvej':1A 'tv':6B");
    }
  }
}];

var supplerendebynavneTests = [{
  description: 'Upon insertion, the TSV column should be set',
  verify: {
    model: 'supplerendebynavn',
    query: {
      supplerendebynavn: 'Testby',
      kommunekode: 999,
      postnr: 9998

    },
    expect: function(updated) {
      expect(updated.tsv).toBe("'testby':1");
    }
  }
}];

function verify(testSpec, client, callback) {
  var updated;
  async.series([
    function(callback) {
      if(testSpec.update) {
        crud.update(client, datamodels[testSpec.update.model], testSpec.update.update, callback);
      }
      else {
        callback(null);
      }
    },
    function(callback) {
      crud.query(client, datamodels[testSpec.verify.model], testSpec.verify.query, function(err, result) {
        if(err) {
          return callback(err);
        }
        updated = result[0];
        callback();
      });
    },
    function(callback) {
      expect(updated).toBeDefined();
      if(updated) {
        testSpec.verify.expect(updated);
      }
      callback(null);
    }
  ], callback);
}

function verifyAll(provideClient, testSpecs) {
  testSpecs.forEach(function(testSpec) {
    it(testSpec.description, function(done) {
      verify(testSpec, provideClient(), done);
    });
  });
}

describe('PostgreSQL tsv columns', function() {
  var client;
  var transactionDone;
  beforeEach(function(callback) {
    async.series([
      function(callback) {
        dbapi.withRollbackTransaction(function(err, _client, _transactionDone) {
          if(err) {
            return callback(err);
          }
          client = _client;
          transactionDone = _transactionDone;
          callback(null);
        });
      },
      function(callback) {
        setupFixture(client, testFixture, callback);
      }],
      callback);
  });
  afterEach(function(callback) {
    transactionDone(callback);
  });
  describe('update of tsv column for vejstykker', function() {
    verifyAll(function() { return client; } , vejstykkeTests);
  });
  describe('update of tsv column for postnumre', function() {
    verifyAll(function() { return client; }, postnummerTests);
  });
  describe('update of tsv column for adgangsadresser', function() {
    verifyAll(function() { return client; }, adgangsadresseTests);
  });
  describe('update of tsv column for enhedsadresser', function() {
    verifyAll(function() { return client; } , enhedsadresseTests);
  });
  describe('update of tsv column for supplerendebynavne', function() {
    verifyAll(function() { return client; } , supplerendebynavneTests);
  });
});