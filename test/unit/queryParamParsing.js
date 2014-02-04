"use strict";

var backend = require("../../dawaPgApi");

var schema =  {
  uuid: {type: 'string',
         pattern: '^([0-9a-fA-F]{8}\\-[0-9a-fA-F]{4}\\-[0-9a-fA-F]{4}\\-[0-9a-fA-F]{4}\\-[0-9a-fA-F]{12})$'},
};

var spec = {
  model:      undefined,
  pageable:   undefined,
  searchable: undefined,
  mappers:    undefined,
  parameters: {
    anyValue:  {name: 'something'},
    aString:   {type: 'string'},
    aNumber:   {type: 'number'},
    anArray:   {type: 'array'},
    anObject:  {type: 'object'},
    anotherNumber: {type: 'number'},
    uuid: {type: 'string',
           schema: schema.uuid},
  },
};

describe("Parsing types with schemas", function () {
  it("should succeed on valid data", function (done) {
    expect(backend.parseParameters({uuid: '"98239823-9823-9823-9823-982398239823"'}, spec))
      .toEqual({values: {uuid: "98239823-9823-9823-9823-982398239823"}, errors: []});
    done();
  });

  it("should fail on invalid data ", function (done) {
    expect(backend.parseParameters({uuid: '"98239823-982-982-982-982398239823"'}, spec))
      .toEqual({values: {}, errors: [['uuid', 'String does not match pattern: ^([0-9a-fA-F]{8}\\-[0-9a-fA-F]{4}\\-[0-9a-fA-F]{4}\\-[0-9a-fA-F]{4}\\-[0-9a-fA-F]{12})$']]});
    done();
  });
});

describe("Parsing parameters of type 'string'", function () {
  it("should accept strings", function (done) {
    expect(backend.parseParameters({aString: '"str"'}, spec))
      .toEqual({values: {aString: "str"}, errors: []});
    done();
  });

  it("should fails on other data than strings", function (done) {
    expect(backend.parseParameters({aString: '42'}, spec))
      .toEqual({values: {}, errors: [['aString', 'notString']]});
    expect(backend.parseParameters({aString: '[1,2,3]'}, spec))
      .toEqual({values: {}, errors: [['aString', 'notString']]});

    done();
  });
});

describe("Parsing parameters of different types", function () {
  it("should succeed", function (done) {
    expect(backend.parseParameters({aString:'"str"', aNumber:"42", anotherNumber:"3.14", anArray:'[1,2,"3"]', anObject:'{"foo":42}'}, spec))
      .toEqual({values: {aString: "str", aNumber: 42, anotherNumber: 3.14, anArray: [1,2,"3"], anObject: {foo:42}}, errors: []});
    done();
  });
});

describe("When Parsing parameters", function () {
  it("all errors should be returned", function (done) {
    expect(backend.parseParameters({aString: "42", aNumber: "ad", anotherNumber: "[3.14]", anArray: "42", anObject: "42"}, spec))
      .toEqual({values: {}, errors: [["aString", 'notString'],["aNumber", 'notValidJSON'],
                                     ["anotherNumber", 'notNumber'], ["anArray", 'notArray'], ["anObject", 'notObject']]});
    done();
  });
});

describe("When Parsing object", function () {
  it("arrays should not be accepted", function (done) {
    expect(backend.parseParameters({anObject: "[1,2,3]"}, spec))
      .toEqual({values: {}, errors: [['anObject', 'notObject']]});
    done();
  });
});

describe("Parsing parameters of type 'undefined'", function () {
  it("should never fail", function (done) {
    expect(backend.parseParameters({anyValue: "aString"}, spec))
      .toEqual({values: {anyValue: "aString"}, errors: []});

    expect(backend.parseParameters({anyValue: "42"}, spec))
      .toEqual({values: {anyValue: "42"}, errors: []});

    expect(backend.parseParameters({anyValue: "3.14"}, spec))
      .toEqual({values: {anyValue: "3.14"}, errors: []});

    expect(backend.parseParameters({anyValue: "[[[1,2,3]]]"}, spec))
      .toEqual({values: {anyValue: "[[[1,2,3]]]"}, errors: []});

    done();
  });
});

describe("When parsing unkonwn parameters'", function () {
  it("they should just be ignored", function (done) {
    expect(backend.parseParameters({anyValue: "42", unknownParam: ""}, spec))
      .toEqual({values: {anyValue: "42"}, errors: []});

    expect(backend.parseParameters({unknownParam: ""}, spec))
      .toEqual({values: {}, errors: []});

    done();
  });
});
