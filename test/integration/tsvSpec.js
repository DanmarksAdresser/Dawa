"use strict";

var expect = require('chai').expect;
var q = require('q');

var crud = require('../../crud/crud');
var Husnr = require('../../psql/databaseTypes').Husnr;
var datamodels = require('../../crud/datamodel');
var testdb = require('../helpers/testdb');
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
    husnr: new Husnr(32, 'A'),
    supplerendebynavn: 'Testby',
    kommunekode: 999,
    vejkode: 9999,
    postnr: 9998
  }],
  adresse: [{
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
      expect(updated.tsv).to.equal("'testvej':1");
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
      expect(updated.tsv).to.equal("'tastvej':1");
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
      expect(updated.tsv).to.equal("'9998':1 'testpostnummer':2");
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
      expect(updated.tsv).to.equal("'9998':1 'tastpostnummer':2");
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
      expect(updated.tsv).to.equal("'32a':2A '9998':4 'testby':3C 'testpostnummer':5 'testvej':1A");
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
      expect(updated.tsv).to.equal("'32a':2A '9998':4 'testby':3C 'testpostnummer':5 'vestvejen':1A");
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
      expect(updated.tsv).to.equal("'32a':2A '9998':4 'tastvej':1A 'testby':3C 'testpostnummer':5");
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
      expect(updated.tsv).to.equal("'32a':2A '9998':4 'tastpostnummer':5 'testby':3C 'testvej':1A");
    }
  }
}];

var adresseTests = [{
  description: 'Upon insertion, the TSV column should be set',
  verify: {
    model: 'adresse',
    query: {
      id: '11111111-1111-1111-1111-111111111112'
    },
    expect: function(updated) {
      expect(updated.tsv).to.equal("'32a':2A '9998':4 'testby':3C 'testpostnummer':5 'testvej':1A 'tv':6B");
    }
  }
}, {
  description: 'Upon update, the TSV column should be set',
  update: {
    model: 'adresse',
    update: {
      id: '11111111-1111-1111-1111-111111111112',
      etage: '3'
    }
  },
  verify: {
    model: 'adresse',
    query: {
      id: '11111111-1111-1111-1111-111111111112'
    },
    expect: function(updated) {
      expect(updated.tsv).to.equal("'3':6B '32a':2A '9998':4 'testby':3C 'testpostnummer':5 'testvej':1A 'tv':7B");
    }
  }
}, {
  description: 'Upon update of adgangsadresse, the TSV column should be set',
  update: {
    model: 'adgangsadresse',
    update: {
      id: '11111111-1111-1111-1111-111111111111',
      husnr: new Husnr(36, 'C')
    }
  },
  verify: {
    model: 'adresse',
    query: {
      id: '11111111-1111-1111-1111-111111111112'
    },
    expect: function(updated) {
      expect(updated.tsv).to.equal("'36c':2A '9998':4 'testby':3C 'testpostnummer':5 'testvej':1A 'tv':6B");
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
      expect(updated.tsv).to.equal("'testby':1");
    }
  }
}];

function verify(testSpec, client) {
  return q().then(function() {
    if(testSpec.update) {
      return crud.update(client, datamodels[testSpec.update.model], testSpec.update.update);
    }
  }).then(function() {
      return crud.query(client, datamodels[testSpec.verify.model], testSpec.verify.query);
    })
    .then(function (result) {
      var updated = result[0];
      expect(updated).to.exist;
      if(updated) {
        testSpec.verify.expect(updated);
      }
    });
}

function verifyAll(provideClient, testSpecs) {
  testSpecs.forEach(function(testSpec) {
    it(testSpec.description, function() {
      return verify(testSpec, provideClient());
    });
  });
}

describe('PostgreSQL tsv columns', function() {
  testdb.withTransactionEach('test', function(clientFn) {
    beforeEach(function() {
      return setupFixture(clientFn(), testFixture);
    });
    describe('update of tsv column for vejstykker', function() {
      verifyAll(clientFn , vejstykkeTests);
    });
    describe('update of tsv column for postnumre', function() {
      verifyAll(clientFn, postnummerTests);
    });
    describe('update of tsv column for adgangsadresser', function() {
      verifyAll(clientFn, adgangsadresseTests);
    });
    describe('update of tsv column for adresser', function() {
      verifyAll(clientFn , adresseTests);
    });
    describe('update of tsv column for supplerendebynavne', function() {
      verifyAll(clientFn , supplerendebynavneTests);
    });
  });
});
