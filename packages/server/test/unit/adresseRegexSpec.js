"use strict";

var expect = require('chai').expect;

var adresseRegex = require('../../apiSpecification/adresseRegex');
describe('Adresse regex', () => {
  it('Matcher vejnavn og husnr', () => {
    var regex = new RegExp(`^${adresseRegex.internal.vejnavnStrict}${adresseRegex.internal.husnrStrict}$`);
    var tekst = "Christian 4. gade 13B";
    var match = regex.exec(tekst);
    expect(match[0]).to.equal(tekst);
    expect(match[1]).to.equal('Christian 4. gade');
    expect(match[2]).to.equal('13B');
  });

  it('Matcher en adresse uden etage og dør', () => {
    var tekst = 'Augustenborggade 5, 5. th, SupplerendeBynavn, 8000 Aarhus C';
    var match = adresseRegex.strict.exec(tekst);
    expect(match[0]).to.equal(tekst);
    expect(match[1]).to.equal('Augustenborggade');
    expect(match[2]).to.equal('5');
    expect(match[3]).to.equal('5');
    expect(match[4]).to.equal('th');
    expect(match[5]).to.equal('SupplerendeBynavn');
    expect(match[6]).to.equal('8000');
    expect(match[7]).to.equal('Aarhus C');

  });
});
