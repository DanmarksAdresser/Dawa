"use strict";

const expect = require('chai').expect;

const autocomplete = require('../../apiSpecification/autocomplete/autocomplete');
const Husnr = require('@dawadk/common/src/postgres/types').Husnr;

require('../../apiSpecification/allSpecs');

const scoreAddressElement = autocomplete.scoreAddressElement;

describe('Sorting of autocomplete results', () => {
  describe('Scoring of a single adress element', () => {
    it('Exact match should result of score 0', () => {
      expect(scoreAddressElement('margrethepladsen', 'margrethepladsen', 2)).to.equal(0);
    });

    it('Missing should result in score of 1', () => {
      expect(scoreAddressElement('margrethepladsen', '', 2)).to.equal(1);
    });
    it('Prefix match should result in score of 2', () => {
      expect(scoreAddressElement('margrethepladsen', 'margret', 2)).to.equal(2);
    });
    it('A single missing char should result in score identical to 2+weight', () => {
      expect(scoreAddressElement('margrethepladsen', 'margretepladsen', 11)).to.equal(13);
    });
    it('A single wrong char should result in score identical to 2+weight', () => {
      expect(scoreAddressElement('margrethepladsen', 'margretheplassen', 11)).to.equal(13);
    });
    it('A single additional char should result in score identical to 2+weight', () => {
      expect(scoreAddressElement('margrethepladsen', 'margretheepladsen', 11)).to.equal(13);
    });
    it('A single edit and missing suffix should result in score 2+weight+1', () => {
      expect(scoreAddressElement('margrethepladsen', 'margretepla', 11)).to.equal(14);
    });
    it('Two wrong chars should result in score 2 + weight*2', () => {
      expect(scoreAddressElement('margrethepladsen', 'margretteplassen', 11)).to.equal(24);
    });

    const testcases = [{
      description: 'Etage sorteres nedefra og op, null først',
      search: 'Testvej 2, ',
      results: [
        {
          vejnavn: 'Testvej',
          husnr: new Husnr(2, null),
          etage: null,
          dør: null,
          supplerendebynavn: null,
          postnr: 1000,
          postnrnavn: 'Testby'
        },
        {
          vejnavn: 'Testvej',
          husnr: new Husnr(2, null),
          etage: 'kl4',
          dør: null,
          supplerendebynavn: null,
          postnr: 1000,
          postnrnavn: 'Testby'
        },
        {
          vejnavn: 'Testvej',
          husnr: new Husnr(2, null),
          etage: 'kl3',
          dør: null,
          supplerendebynavn: null,
          postnr: 1000,
          postnrnavn: 'Testby'
        },
        {
          vejnavn: 'Testvej',
          husnr: new Husnr(2, null),
          etage: 'kl2',
          dør: null,
          supplerendebynavn: null,
          postnr: 1000,
          postnrnavn: 'Testby'
        },
        {
          vejnavn: 'Testvej',
          husnr: new Husnr(2, null),
          etage: 'kl',
          dør: null,
          supplerendebynavn: null,
          postnr: 1000,
          postnrnavn: 'Testby'
        },
        {
          vejnavn: 'Testvej',
          husnr: new Husnr(2, null),
          etage: 'st',
          dør: null,
          supplerendebynavn: null,
          postnr: 1000,
          postnrnavn: 'Testby'
        },
        {
          vejnavn: 'Testvej',
          husnr: new Husnr(2, null),
          etage: '1',
          dør: null,
          supplerendebynavn: null,
          postnr: 1000,
          postnrnavn: 'Testby'
        },
        {
          vejnavn: 'Testvej',
          husnr: new Husnr(2, null),
          etage: '2',
          dør: null,
          supplerendebynavn: null,
          postnr: 1000,
          postnrnavn: 'Testby'
        }
      ],
    },
      {
        description: 'Dør sorteres null, tv, mf, th, tal (mindste først), alt andet (lexiografisk)',
        search: 'Testvej 2',
        results: [{
          vejnavn: 'Testvej',
          husnr: new Husnr(2, null),
          etage: null,
          dør: 'tv',
          supplerendebynavn: null,
          postnr: 1000,
          postnrnavn: 'Testby'
        }, {
          vejnavn: 'Testvej',
          husnr: new Husnr(2, null),
          etage: null,
          dør: 'mf',
          supplerendebynavn: null,
          postnr: 1000,
          postnrnavn: 'Testby'
        }, {
          vejnavn: 'Testvej',
          husnr: new Husnr(2, null),
          etage: null,
          dør: 'th',
          supplerendebynavn: null,
          postnr: 1000,
          postnrnavn: 'Testby'
        }, {
          vejnavn: 'Testvej',
          husnr: new Husnr(2, null),
          etage: null,
          dør: '1',
          supplerendebynavn: null,
          postnr: 1000,
          postnrnavn: 'Testby'
        }, {
          vejnavn: 'Testvej',
          husnr: new Husnr(2, null),
          etage: null,
          dør: '11',
          supplerendebynavn: null,
          postnr: 1000,
          postnrnavn: 'Testby'
        }, {
          vejnavn: 'Testvej',
          husnr: new Husnr(2, null),
          etage: null,
          dør: '12',
          supplerendebynavn: null,
          postnr: 1000,
          postnrnavn: 'Testby'
        },{
          vejnavn: 'Testvej',
          husnr: new Husnr(2, null),
          etage: null,
          dør: 'aa1',
          supplerendebynavn: null,
          postnr: 1000,
          postnrnavn: 'Testby'
        }, {
          vejnavn: 'Testvej',
          husnr: new Husnr(2, null),
          etage: null,
          dør: 'aa2',
          supplerendebynavn: null,
          postnr: 1000,
          postnrnavn: 'Testby'
        }]
      },
      {
        description: 'Husnumre sorteres som tal, numre uden bogstaver før numre med bogstaver, og bogstaver leksiografisk',
        search: 'Testvej',
        results: [
          {
            vejnavn: 'Testvej',
            husnr: new Husnr(2, null),
            etage: null,
            dør: null,
            supplerendebynavn: null,
            postnr: 1000,
            postnrnavn: 'Testby'
          },
          {
            vejnavn: 'Testvej',
            husnr: new Husnr(11, null),
            etage: null,
            dør: null,
            supplerendebynavn: null,
            postnr: 1000,
            postnrnavn: 'Testby'
          },
          {
            vejnavn: 'Testvej',
            husnr: new Husnr(203, null),
            etage: null,
            dør: null,
            supplerendebynavn: null,
            postnr: 1000,
            postnrnavn: 'Testby'
          },
          {
            vejnavn: 'Testvej',
            husnr: new Husnr(203, 'A'),
            etage: null,
            dør: null,
            supplerendebynavn: null,
            postnr: 1000,
            postnrnavn: 'Testby'
          },
          {
            vejnavn: 'Testvej',
            husnr: new Husnr(203, 'B'),
            etage: null,
            dør: null,
            supplerendebynavn: null,
            postnr: 1000,
            postnrnavn: 'Testby'
          },
          {
            vejnavn: 'Testvej',
            husnr: new Husnr(203, 'C'),
            etage: null,
            dør: null,
            supplerendebynavn: null,
            postnr: 1000,
            postnrnavn: 'Testby'
          }
        ]
      }
    ];

    for (let testcase of testcases) {
      it(testcase.description, () => {
        const processedResults = autocomplete.sortAdresse('adresse', testcase.search, 20, testcase.results.slice().reverse());
        expect(processedResults).to.deep.equal(testcase.results);
      });
    }
  });
});
