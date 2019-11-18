"use strict";

const {expect, assert} = require('chai');

var parameterParsing = require("../../parameterParsing");

var schema =  {
  uuid: {type: 'string',
         pattern: '^([0-9a-fA-F]{8}\\-[0-9a-fA-F]{4}\\-[0-9a-fA-F]{4}\\-[0-9a-fA-F]{4}\\-[0-9a-fA-F]{12})$'}
};

var parameterSpec =  {
  anyValue:  {name: 'something'},
  aString:   {type: 'string'},
  aInteger:   {type: 'integer', maxLength: 10},
  aFloat: {type: 'float'},
  objectJson: {type: 'json'},
  arrayJson: {type: 'json'},
  uuid: {type: 'string',
         schema: schema.uuid}
};

describe("Parsing types with schemas", function () {
  it('Should reject very long parameters by default', function() {
    expect(parameterParsing.parseParameters({aString: '01234567890123456789012345678901234567890123456789012345678901234567890123456789012345678901234567890123456789'}, parameterSpec))
      .to.deep.equal( {params: {}, errors: [['aString', "Parameteren må bestå af højst 100 karakterer"]]});
  });

  it('Should respect maxLength', function() {
    expect(parameterParsing.parseParameters({aInteger: '012345678901234567890'}, parameterSpec))
      .to.deep.equal( {params: {}, errors: [['aInteger', "Parameteren må bestå af højst 10 karakterer"]]});
  });

  it("should succeed on valid data", function () {
    expect(parameterParsing.parseParameters({uuid: '98239823-9823-9823-9823-982398239823'}, parameterSpec))
      .to.deep.equal({params: {uuid: "98239823-9823-9823-9823-982398239823"}, errors: []});
  });

  it("should fail on invalid data ", function (done) {
    expect(parameterParsing.parseParameters({uuid: '98239823-982-982-982-982398239823'}, parameterSpec))
      .to.deep.equal({params: {}, errors: [['uuid', 'String does not match pattern ^([0-9a-fA-F]{8}\\-[0-9a-fA-F]{4}\\-[0-9a-fA-F]{4}\\-[0-9a-fA-F]{4}\\-[0-9a-fA-F]{12})$: 98239823-982-982-982-982398239823']]});
    done();
  });
});

describe("Parsing parameters of type 'string'", function () {
  it("should accept anything", function (done) {
    expect(parameterParsing.parseParameters({aString: 'str'}, parameterSpec))
      .to.deep.equal({params: {aString: "str"}, errors: []});
    expect(parameterParsing.parseParameters({aString: '42'}, parameterSpec))
      .to.deep.equal({params: {aString: '42'}, errors: []});
    expect(parameterParsing.parseParameters({aString: '[1,2,3]'}, parameterSpec))
      .to.deep.equal({params: {aString: '[1,2,3]'}, errors: []});

    done();
  });
});

describe("Parsing parameters of different types", function () {
  it("should succeed", function (done) {
    expect(parameterParsing.parseParameters({aString:'str', aInteger:"42", aFloat:"3.14", arrayJson:'[1,2,"3"]', objectJson:'{"foo":42}'}, parameterSpec))
      .to.deep.equal({params: {aString: "str", aInteger: 42, aFloat: 3.14, arrayJson: [1,2,"3"], objectJson: {foo:42}}, errors: []});
    done();
  });
});

describe("When Parsing parameters", function () {
  it("all errors should be returned", function (done) {
    expect(parameterParsing.parseParameters({aString: "42", aInteger: "ad", aFloat: "[3.14]", arrayJson: "a42", objectJson: "4,2"}, parameterSpec))
      .to.deep.equal({params: {aString: '42'}, errors: [["aInteger", 'notInteger'],["aFloat", 'notFloat'],
                                                  ["arrayJson", 'notJson'], ["objectJson", 'notJson']]});
    done();
  });
});

describe("Parsing parameters of type 'undefined'", function () {
  it("should never fail", function () {
    expect(parameterParsing.parseParameters({anyValue: "aString"}, parameterSpec))
      .to.deep.equal({params: {anyValue: "aString"}, errors: []});

    expect(parameterParsing.parseParameters({anyValue: "42"}, parameterSpec))
      .to.deep.equal({params: {anyValue: "42"}, errors: []});

    expect(parameterParsing.parseParameters({anyValue: "3.14"}, parameterSpec))
      .to.deep.equal({params: {anyValue: "3.14"}, errors: []});

    expect(parameterParsing.parseParameters({anyValue: "[[[1,2,3]]]"}, parameterSpec))
      .to.deep.equal({params: {anyValue: "[[[1,2,3]]]"}, errors: []});
  });
});

describe("When parsing unknown parameters'", function () {
  it("they should just be ignored if valider param is not set", function () {
    expect(parameterParsing.parseParameters({anyValue: "42", unknownParam: ""}, parameterSpec))
      .to.deep.equal({params: {anyValue: "42"}, errors: []});

    expect(parameterParsing.parseParameters({unknownParam: ""}, parameterSpec))
      .to.deep.equal({params: {}, errors: []});
  });

  it('Should result in an error if valider param is set', () => {
    expect(parameterParsing.parseParameters({anyValue: "42", unknownParam: "", valider: ''}, parameterSpec))
      .to.deep.equal({params: {anyValue: "42"}, errors: [
        ['unknownParam', 'Ukendt parameter unknownParam']
      ]});

    expect(parameterParsing.parseParameters({unknownParam: "", valider: 'asdf'}, parameterSpec))
      .to.deep.equal({params: {}, errors: [
        ['unknownParam', 'Ukendt parameter unknownParam']
      ]});
  });

  it('Should not result in an error if both valider and cache params are set', () => {
    const result = parameterParsing.parseParameters({valider: '', cache: 'no-cache'}, parameterSpec);
    assert.deepEqual(result, {params: {}, errors: []});
  });

});
