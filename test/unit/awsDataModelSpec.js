"use strict";
var model = require("../../awsDataModel");

describe("Any validation", function () {
  it("should validate anything", function () {
    expect(model.Any(1)).toBe(true);
    expect(model.Any("satueh")).toBe(true);
    expect(model.Any([1,2,"ntoeh"])).toBe(true);
    expect(model.Any({})).toBe(true);
    expect(model.Any(undefined)).toBe(true);
    expect(model.Any({foo: 42, bar: 1, ' baz ': 'det virker'})).toBe(true);
  });
});

describe("String validation", function () {
  it("should validate all strings", function () {
    expect(model.String("")).toBe(true);
    expect(model.String("satueh")).toBe(true);
    expect(model.String(1)).toBe(false);
    expect(model.String({})).toBe(false);
    expect(model.String([])).toBe(false);
  });
});

describe("Number validation", function () {
  it("should validate all numbers", function () {
    expect(model.Number(1)).toBe(true);
    expect(model.Number(-1)).toBe(true);
    expect(model.Number(0)).toBe(true);
    expect(model.Number(-1.0)).toBe(true);
    expect(model.Number(3.14)).toBe(true);
    expect(model.Number("")).toBe(false);
    expect(model.Number({})).toBe(false);
  });
});

describe("UUID validation", function () {
  it("should validate all UUID strings", function () {
    expect(model.UUID("72329834-ab34-af39-AD98-934b934b934b")).toBe(true);
    expect(model.UUID("72329834-3ab34-af39-AD98-934b934b934b")).toBe(false);
    expect(model.UUID("72329834-ab34-af39-AD98-934b934b934b3")).toBe(false);
    expect(model.UUID("G2329838-ab34-af39-AD98-934b934b934b")).toBe(false);
  });
});

describe("Etage validation", function () {
  it("should validate Etage strings", function () {
    expect(model.Etage("100")).toBe(false);
    expect(model.Etage("99")).toBe(true);
    expect(model.Etage("1")).toBe(true);
    expect(model.Etage("st")).toBe(true);
    expect(model.Etage("kl")).toBe(true);
    expect(model.Etage("kl1")).toBe(true);
    expect(model.Etage("kl9")).toBe(true);
    expect(model.Etage("kl10")).toBe(false);
    expect(model.Etage("0")).toBe(false);
    expect(model.Etage("-1")).toBe(false);
  });
});

describe("AdgangsAdresse validation", function () {
  it("should validate", function () {
    expect(model.validate({id: '38743874-3874-3874-3874-387438743874',
                           version: 'noehu',
                           husnr: '10'},
                          model.AdgangsAdresse))
      .toMatch('^Success$');
  });
});


describe("Adresse validation", function () {
  var adgangsadressen = {id: '38743874-3874-3874-3874-387438743874',
                         version: 'noehu',
                         husnr: '10'};

  it("should validate", function () {
    expect(model.validate({id:                '38743874-3874-3874-3874-387438743874',
                           version:           'version',
                           etage:             '7',
                           dør:               'doer',
                           adressebetegnelse: 'adressebetegnelse',
                           adgangsadressen:   adgangsadressen},
                          model.Adresse))
      .toMatch('^Success$');
  });

  it("should only require some fields", function () {
    expect(model.validate({id:                '38743874-3874-3874-3874-387438743874',
                           version:           'version',
                           adressebetegnelse: 'adressebetegnelse',
                           adgangsadressen:   adgangsadressen},
                          model.Adresse))
      .toMatch('^Success$');
    expect(model.validate({id:                '38743874-3874-3874-3874-387438743874',
                           adressebetegnelse: 'adressebetegnelse',
                           adgangsadressen:   adgangsadressen},
                          model.Adresse))
      .toMatch('Missing required field: version');
  });
});

