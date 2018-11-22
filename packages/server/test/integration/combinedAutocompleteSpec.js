"use strict";

var expect = require('chai').expect;
var request = require('request-promise');
const {go} = require('ts-csp');

require('../../apiSpecification/allSpecs');

var autocomplete = require('../../apiSpecification/autocomplete/autocomplete').autocompleteResource;
var helpers = require('./helpers');
var testdb = require('@dawadk/test-util/src/testdb');


describe('Combined Autocomplete', function () {
  it('Skal kunne autocomplete en adresse', function () {
    return request.get({
      uri: 'http://localhost:3002/autocomplete?q=' + encodeURIComponent('Magtenbøllevej 102'),
      json: true
    }).then(function (result) {
      expect(result).to.have.length(1);
      expect(result[0].data.vejnavn).to.equal('Magtenbøllevej');
    });
  });

  testdb.withTransactionEach('test', function (clientFn) {
    it('Skal returnere vejnavne hvis mere end et vejnavn matcher', function () {
      return go(function*() {
        const result = yield helpers.getJson(clientFn(), autocomplete, {}, {
          caretpos: "2",
          q: "ma",
          type: "adresse"
        });
        expect(result.length).to.be.above(1);
        expect(result[0].type).to.equal('vejnavn');
      }).asPromise();
    });
    it('Skal returnere vejnavne, hvis "vejnavn" er angivet som type', function () {
      return go(function*() {
        const result = yield helpers.getJson(clientFn(), autocomplete, {}, {
          caretpos: "12",
          q: "Magtenbøllev",
          type: "vejnavn"
        });
        expect(result.length).to.equal(1);
        expect(result[0].type).to.equal('vejnavn');
      }).asPromise();
    });
    it('Skal returnere adgangsadresser, hvis "adgangsadresse er angivet som type', function () {
      return go(function*() {
        const result = yield helpers.getJson(clientFn(), autocomplete, {}, {
          caretpos: "18",
          q: "Magtenbøllevej 102",
          type: "adgangsadresse"
        });
        expect(result.length).to.equal(1);
        expect(result[0].type).to.equal('adgangsadresse');
      }).asPromise();
    });
    it('* i søgning skal placeres ved careten', function () {
      return go(function*() {
        const result = yield helpers.getJson(clientFn(), autocomplete, {}, {
          caretpos: "12",
          q: "Magtenbøllev 102"
        });
        expect(result.length).to.equal(1);
        expect(result[0].type).to.equal('adresse');
      }).asPromise();
    });
    it('Ved angivelse af adgangsadresseid skal søgningen begrænses til denne ID', function () {
      return go(function*() {
        const result = yield helpers.getJson(clientFn(), autocomplete, {}, {
          caretpos: "11",
          q: "Mannerupvej",
          adgangsadresseid: "0a3f5081-c65d-32b8-e044-0003ba298018"
        });
        expect(result.length).to.equal(1);
        expect(result[0].type).to.equal('adresse');
        expect(result[0].data.id).to.equal("0a3f50ab-ab5c-32b8-e044-0003ba298018");
      }).asPromise();
    });
    it('Hvis der søges efter adresser men returneres vejnavne,' +
      ' så skal vejnavnet tilføjes et mellemrum og careten placeres efter mellemrummet', function () {
      return go(function*() {
        const result = yield helpers.getJson(clientFn(), autocomplete, {}, {
          caretpos: "2",
          q: "ma"
        });
        expect(result.length).to.be.above(1);
        expect(result[0].type).to.equal('vejnavn');
        expect(result[0].tekst.charAt(result[0].tekst.length - 1)).to.equal(' ');
        expect(result[0].caretpos).to.equal(result[0].tekst.length);
      }).asPromise();
    });
    it('Hvis der søges efter adresser, men returneres adgangsadresser,' +
      ' så skal careten placeres såd den er klar til indtastning af etage og dør', function () {
      return go(function*() {
        const result = yield helpers.getJson(clientFn(), autocomplete, {}, {q: "Østre Stationsvej"});
        expect(result.length).to.be.above(1);
        const sugg = result[0];
        expect(sugg.type).to.equal('adgangsadresse');
        expect(sugg.tekst).to.equal('Østre Stationsvej 4B, , 5000 Odense C');
        expect(sugg.caretpos).to.equal('Østre Stationsvej 4B, '.length);
      }).asPromise();
    });
    it('Ved angivelse af startfrom=adgangsadresse returneres altid adgangsadresser,' +
      ' selvom mere end et vejnavn matcher søgningen ', function () {
      return go(function*() {
        const result = yield helpers.getJson(clientFn(), autocomplete, {}, {
          q: "t",
          caretpos: "1",
          startfra: "adgangsadresse"
        });
        expect(result.length).to.be.above(1);
        var sugg = result[0];
        expect(sugg.type).to.equal('adgangsadresse');
      }).asPromise();
    });

    it('Hvis der ikke er nogen hits i vejnavne, og søgeteksten ikke indeholder et tal, og fuzzy søgning er aktiveret, ' +
      ' så skal der returneres vejnavne', function () {
      return go(function*() {
        const result = yield helpers.getJson(clientFn(), autocomplete, {}, {
          caretpos: "8",
          q: "fjors ga",
          fuzzy: ""
        });
        expect(result.length).to.be.above(1);
        expect(result[0].type).to.equal('vejnavn');
        expect(result[0].tekst).to.equal('Fjordsgade ');
      }).asPromise();
    });

    it('Hvis fuzzy søgning er aktiv, og søgeteksten indeholder et tal, og der ikke er nogen almindelige hits, så skal der returneres adresser', function () {
      return go(function*() {
        const result = yield helpers.getJson(clientFn(), autocomplete, {}, {
          caretpos: "8",
          q: "fjors gade 5",
          fuzzy: ""
        });
        expect(result.length).to.be.above(1);
        expect(result[0].type).to.equal('adresse');
        expect(result[0].tekst).to.equal('Fjordsgade 5, 5000 Odense C');
      }).asPromise();
    });

    it('Hvis laver en fuzzy autocomplete med type vejnavn, så får jeg vejnavne tilbage', function () {
      return go(function*() {
        const result = yield helpers.getJson(clientFn(), autocomplete, {}, {
          caretpos: "10",
          q: "fjors gade",
          fuzzy: "",
          type: 'vejnavn'
        });
        expect(result.length).to.be.above(1);
        expect(result[0].type).to.equal('vejnavn');
        expect(result[0].tekst).to.equal('Fjordsgade');
      }).asPromise();
    });

    it('Hvis laver en fuzzy autocomplete med type adgangsadresse, så får jeg adgangsadresser tilbage', function () {
      return go(function*() {
        const result = yield helpers.getJson(clientFn(), autocomplete, {}, {
          q: "fjors gade 5 5",
          fuzzy: "",
          type: 'adgangsadresse'
        });
        expect(result.length).to.be.above(1);
        expect(result[0].type).to.equal('adgangsadresse');
        expect(result[0].tekst).to.equal('Fjordsgade 5, 5000 Odense C');
      }).asPromise();
    });

    it('Søgning skal ikke gå videre til adgangsadresser med mindre det indtastede matcher vjenavnet eksakt', () => {
      return go(function*() {
        const result = yield helpers.getJson(clientFn(), autocomplete, {}, {
          q: "mosev",
          fuzzy: "",
          type: 'adgangsadresse',
          caretpos: '5'
        });
        expect(result).to.have.length(1);
        expect(result[0].type).to.equal('vejnavn');
        expect(result[0].tekst).to.equal('Mosevej ');
      }).asPromise();
    });

    it('Søgning skal gå videre til adgangsadresser med det indtastede matcher vejnavn eksakt', () => {
      return go(function*() {
        const result = yield helpers.getJson(clientFn(), autocomplete, {}, {
          q: "mosevej ",
          fuzzy: "",
          type: 'adgangsadresse',
          caretpos: '8'
        });
        expect(result.length).to.be.above(1);
        expect(result[0].type).to.equal('adgangsadresse');
      }).asPromise();
    });

    it('Skal understøtte JSONP', () => go(function*() {
      const result = yield helpers.getStringResponse(clientFn(), autocomplete, {}, {
          q: "Mosede",
          callback: 'cb'
        }
      );
      expect(result.startsWith('cb(')).to.be.true;
    }).asPromise());

    // Legacy behavior
    it('Hvis jeg anvender adgangsadresseid parameteren sammen med type parameteren, så ignoreres type parameteren',
      () => go(function*() {
        const result = yield helpers.getJson(clientFn(), autocomplete, {}, {
            q: "Mosede engvej",
            fuzzy: "",
            type: 'adgangsadresse',
            adgangsadresseid: '0a3f5081-3b23-32b8-e044-0003ba298018'
          }
        );
        expect(result.length).to.be.above(0);
        expect(result[0].type).to.equal('adresse');
      }));

    it('Søgning med startfra senere end type skal give tomt resultat', () => go(function*() {
      const result = yield helpers.getJson(clientFn(), autocomplete, {}, {
          q: "Mosede ",
          fuzzy: "",
          type: 'vejnavn',
          startfra: 'adgangsadresse'
        }
      );
      expect(result.length).to.equal(0);
    }));

    it('Supplerende bynavn kan fjernes fra adgangsadressetekster', () => go(function*() {
      const result = yield helpers.getJson(clientFn(), autocomplete, {}, {
          q: "stadionvej",
          fuzzy: "",
          type: 'adresse',
          startfra: 'adgangsadresse',
          supplerendebynavn: 'false'
        }
      );
      expect(result[0].tekst).to.equal("Stadionvej 38, , 5200 Odense V");
      expect(result[0].forslagstekst).to.equal("Stadionvej 38, 5200 Odense V");
    }));
    it('Supplerende bynavn kan fjernes fra adressetekster', () => go(function*() {
      const result = yield helpers.getJson(clientFn(), autocomplete, {}, {
          q: "stadionvej 38",
          fuzzy: "",
          type: 'adresse',
          startfra: 'adgangsadresse',
          supplerendebynavn: 'false'
        }
      );
      expect(result[0].tekst).to.equal("Stadionvej 38, st. tv, 5200 Odense V");
      expect(result[0].forslagstekst).to.equal("Stadionvej 38, st. tv, 5200 Odense V");
    }));
    it('multilinje kan aktiveres for adgangsadresseforslag', () => go(function*() {
      const result = yield helpers.getJson(clientFn(), autocomplete, {}, {
          q: "stadionvej",
          fuzzy: "",
          type: 'adresse',
          startfra: 'adgangsadresse',
          multilinje: 'true'
        }
      );
      expect(result[0].tekst).to.equal("Stadionvej 38, , Bolbro, 5200 Odense V");
      expect(result[0].forslagstekst).to.equal("Stadionvej 38\nBolbro\n5200 Odense V");

    }));

    it('multilinje kan aktiveres for adresseforslag', () => go(function*() {
      const result = yield helpers.getJson(clientFn(), autocomplete, {}, {
          q: "stadionvej 38",
          fuzzy: "",
          type: 'adresse',
          startfra: 'adgangsadresse',
          multilinje: 'true'
        }
      );
      expect(result[0].tekst).to.equal("Stadionvej 38, st. tv, Bolbro, 5200 Odense V");
      expect(result[0].forslagstekst).to.equal("Stadionvej 38, st. tv\nBolbro\n5200 Odense V");

    }));

    it('stormodtagerpostnumre kan aktiveres for adgangsadresser', () => go(function*() {
      const result = yield helpers.getJson(clientFn(), autocomplete, {}, {
          q: "girostrøget 1, 0800",
          type: 'adgangsadresse',
          startfra: 'adgangsadresse',
          stormodtagerpostnumre: 'true'
        }
      );
      expect(result[0].tekst).to.equal("Girostrøget 1, Høje Taastrup, 0800 Høje Taastrup");
      expect(result[0].forslagstekst).to.equal("Girostrøget 1, Høje Taastrup, 0800 Høje Taastrup");
      expect(result[1].tekst).to.equal("Girostrøget 1, Høje Taastrup, 2630 Taastrup");
      expect(result[1].forslagstekst).to.equal("Girostrøget 1, Høje Taastrup, 2630 Taastrup");

    }));
    it('stormodtagerpostnumre kan aktiveres for adresser', () => go(function*() {
      const result = yield helpers.getJson(clientFn(), autocomplete, {}, {
          q: "girostrøget 1",
          type: 'adresse',
          startfra: 'adresse',
          stormodtagerpostnumre: 'true'
        }
      );
      expect(result[0].tekst).to.equal("Girostrøget 1, Høje Taastrup, 2630 Taastrup");
      expect(result[0].forslagstekst).to.equal("Girostrøget 1, Høje Taastrup, 2630 Taastrup");
      expect(result[1].tekst).to.equal("Girostrøget 1, Høje Taastrup, 0800 Høje Taastrup");
      expect(result[1].forslagstekst).to.equal("Girostrøget 1, Høje Taastrup, 0800 Høje Taastrup");
    }));

    it('Kan hente en adresse ud fra id', () => go(function*() {
      const result = yield helpers.getJson(clientFn(), autocomplete, {}, {
          id: '01ffcb65-c425-4cee-9145-bef6570f34bb',
          type: 'adresse'
        }
      );
      expect(result).to.have.length(1);
      expect(result[0].data.id).to.equal('01ffcb65-c425-4cee-9145-bef6570f34bb');
    }));
    it('Kan hente en adgangsadresse ud fra id', () => go(function*() {
      const result = yield helpers.getJson(clientFn(), autocomplete, {}, {
          id: '17c718a1-5510-40cd-8380-735dca3f0afd',
          type: 'adgangsadresse'
        }
      );
      expect(result).to.have.length(1);
      expect(result[0].data.id).to.equal('17c718a1-5510-40cd-8380-735dca3f0afd');
    }));
  });
});
