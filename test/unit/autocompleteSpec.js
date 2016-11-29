"use strict";

const expect = require('chai').expect;

const autocomplete = require('../../apiSpecification/autocomplete/autocomplete');

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
  });
});
