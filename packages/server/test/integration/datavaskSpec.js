"use strict";

var expect = require('chai').expect;
const { go } = require('ts-csp');

require('../../apiSpecification/allSpecs');

var datavaskResources = require('../../apiSpecification/datavask/resources');
var helpers = require('./helpers');
var testdb = require('@dawadk/test-util/src/testdb');

var adresseTests = [
  {
    it: 'Kan finde en adresse, som matcher præcist',
    betegnelse: 'Margrethepladsen 4, 4. 8000 Aarhus C',
    result: {
      kategori: 'A',
      id: '91b21c97-fb07-4aac-98c5-61bcb4689f78'
    }
  },
  {
    it: 'Kan finde en adresse, som har stavefejl',
    betegnelse: 'Margreteplassen 4, 4. 8000 Aarhus C',
    result: {
      kategori: 'B',
      id: '91b21c97-fb07-4aac-98c5-61bcb4689f78'
    }
  },
  {
    it: 'Hvis en anden vej matcher bedre, så er resultatet kategori C',
    betegnelse: 'Mosede Kægvej 6, 2670 Greve',
    // korrekt adresse er Mosede Engvej,
    // men Kærvej er tettere på
    result: {
      kategori: 'C'
    }
  },
  {
    it: 'Hvis der er ukendte tokens, så er resultatet kategori C',
    betegnelse: 'Margrethepladsen 4, 4. th, 8000 Aarhus C',
    result: {
      kategori: 'C',
      id: '91b21c97-fb07-4aac-98c5-61bcb4689f78'
    }
  },
  {
    it: 'Foranstillet 0 i husnr ignoreres',
    betegnelse: 'Margreteplassen 04, 4. 8000 Aarhus C',
    result: {
      kategori: 'B',
      id: '91b21c97-fb07-4aac-98c5-61bcb4689f78'
    }
  },
  {
    it: 'Foranstillet 0 i etage ignoreres',
    betegnelse: 'Margreteplassen 4, 04. 8000 Aarhus C',
    result: {
      kategori: 'B',
      id: '91b21c97-fb07-4aac-98c5-61bcb4689f78'
    }
  },
  {
    it: 'Hvis adressen er nedlagt og erstattet af en ny adresse returneres den nye adresse',
    betegnelse: 'Eliasgade 10, 2300 København S',
    result: {
      kategori: 'A',
      id: 'f481e7d5-989e-4372-86a2-58e72cf64e44'
    }
  },
  {
    it: 'Kan matche på stormodtagerpostnummer',
    betegnelse: 'Girostrøget 1, 0800 Høje Taastrup',
    result: {
      kategori: 'A',
      id: '633c235a-4cd9-4309-b1ce-24ef3caeec6a'
    }
  },
  {
    it: 'Kan matche på adresseringsvejnavn i stedet for vejnavn',
    betegnelse: 'Borgm Christiansens 45, st. th, 2450 København SV',
    result: {
      kategori: 'B',
      id: '0a3f509d-747c-32b8-e044-0003ba298018'
    }
  },
  {
    it: 'Foranstillede 0 ignoreres i dørbetegnelse',
    betegnelse: 'Tofthøjvej 20, 0121, 4130 Viby Sjælland',
    result: {
      id: '0a3f50ab-bd7c-32b8-e044-0003ba298018',
      kategori: 'A'
    }
  },
  {
    it: 'Foranstillede - ignoreres i dørbetegnelse',
    betegnelse: 'Tofthøjvej 20, -0121, 4130 Viby Sjælland',
    result: {
      id: '0a3f50ab-bd7c-32b8-e044-0003ba298018',
      kategori: 'A'
    }
  }, {
    it: 'Kan håndtere etage og dør uden mellemrum',
    betegnelse: 'Østergade 43, 2tv, 5000 Odense C',
    result: {
      kategori: 'A',
      id: 'ccc160cf-668c-45e7-af22-f80d5b0f9e26'
    }
  }];

var adgangsadresseTests = [{
  it: 'Kan finde en adgangsadresse, som matcher præcist',
  betegnelse: 'Margrethepladsen 4, 8000 Aarhus C',
  result: {
    kategori: 'A',
    id: '0a3f5096-91d3-32b8-e044-0003ba298018'
  }
}, {
  it: 'Kan finde en adgangsadresse med stavefejl i vejnavn',
  betegnelse: 'Margretheplassen 4, 8000 Aarhus C',
  result: {
    kategori: 'B',
    id: '0a3f5096-91d3-32b8-e044-0003ba298018'
  }
}, {
  it: 'Kan finde en adgangsadresse med stavefejli postnrnavn',
  betegnelse: 'Margrethepladsen 4, 8000 Århus C',
  result: {
    kategori: 'B',
    id: '0a3f5096-91d3-32b8-e044-0003ba298018'
  }
}, {
  it: 'Kan matche på stormodtagerpostnummer',
  betegnelse: 'Girostrøget 1, 0800 Høje Taastrup',
  result: {
    kategori: 'A',
    id: '0a3f507c-f9a0-32b8-e044-0003ba298018'
  }
}, {
    it: 'Kan matche på adresseringsvejnavn i stedet for vejnavn',
    betegnelse: 'Borgm Christiansens 45, 2450 København SV',
    result: {
      kategori: 'B',
      id: '0a3f507a-4bd5-32b8-e044-0003ba298018'
    }
}];

describe('Adressevask', () => {
  testdb.withTransactionEach('test', function (clientFn) {
    adresseTests.forEach((test) => {
      it(test.it, ()=> {
        return go(function*() {
          var result = yield helpers.getJson(clientFn(), datavaskResources.adresse, {}, {betegnelse: test.betegnelse});
          expect(result.kategori).to.equal(test.result.kategori);
          if(test.result.id) {
            expect(result.resultater[0].adresse.id).to.equal(test.result.id);
          }
        }).asPromise();
      });
    });
    adgangsadresseTests.forEach((test) => {
      it(test.it, ()=> {
        return go(function*() {
          var result = yield helpers.getJson(clientFn(), datavaskResources.adgangsadresse, {}, {betegnelse: test.betegnelse})
          expect(result.kategori).to.equal(test.result.kategori);
          if(test.result.id) {
            expect(result.resultater[0].adresse.id).to.equal(test.result.id);
          }
        }).asPromise();
      });
    });
  });
});
