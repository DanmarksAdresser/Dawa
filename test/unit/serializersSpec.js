"use strict";

var expect = require('chai').expect;

var serializers = require('../../apiSpecification/common/serializers');
const { transducingSerializer } = serializers;
var eventStream = require('event-stream');
var pipeline = require('../../pipeline');
const { into }= require('transducers-js');

describe('serializers', function() {
  describe('JSON serialization', function() {
    var sampleObject = {
      foo: 'bar',
      baz: 2
    };
    var representation = {};
    it('Can serialize a single object to pretty printed JSON', function(done) {
      var serializeFn = serializers.createSingleObjectSerializer('json', null, true, false, representation);
      serializeFn(sampleObject, function(err, response) {
        expect(JSON.parse(response.body)).to.deep.equal(sampleObject);
        expect(response.body.indexOf(' ')).to.be.at.least(0);
        done();
      });
    });
    it('Can serialize a single object to non-pretty-printed JSON', function(done) {
      var serializeFn = serializers.createSingleObjectSerializer('json', null, false, false, representation);
      serializeFn(sampleObject, function(err, response) {
        expect(JSON.parse(response.body)).to.deep.equal(sampleObject);
        expect(response.body.indexOf(' ')).to.equal(-1);
        done();
      });
    });
    it('Can serialize a single object to ndjson', function(done) {
      var serializeFn = serializers.createSingleObjectSerializer('json', null, false, true, representation);
      serializeFn(sampleObject, function(err, response) {
        expect(JSON.parse(response.body)).to.deep.equal(sampleObject);
        expect(response.body.indexOf(' ')).to.equal(-1);
        done();
      });
    });

    function serializeStream(objectArray, formatParam, callbackParam, sridParam, prettyPrint, ndjsonParam, representation, callback) {
      var serializeFn = serializers.createStreamSerializer(formatParam, callbackParam, sridParam, prettyPrint, ndjsonParam, representation);
      var stream = eventStream.readArray(objectArray);
      var pipe = pipeline(stream);
      serializeFn(pipe, function(err, response) {
        response.bodyPipe.toArray(function(err, result) {
          callback(null, result.join(''));
        });
      });
    }

    it('Can serialize a stream of objects to pretty printed JSON', function(done) {
      var sampleData = [sampleObject, sampleObject];
      serializeStream(sampleData, 'json',null, null, true, false, representation, function(err, stringResult) {
        expect(JSON.parse(stringResult)).to.deep.equal(sampleData);
        expect(stringResult.indexOf(' ')).to.be.at.least(0);
        done();
      });
    });

    it('Can serialize a stream of objects to non pretty printed JSON', function(done) {
      var sampleData = [sampleObject, sampleObject];
      serializeStream(sampleData, 'json',null, null, false, false, representation, function(err, stringResult) {
        expect(JSON.parse(stringResult)).to.deep.equal(sampleData);
        expect(stringResult.indexOf(' ')).to.equal(-1);
        done();
      });
    });

    it('Can serialize a stream of objects to ndjson', function(done) {
      var sampleData = [sampleObject, sampleObject];
      serializeStream(sampleData, 'json',null, null, false, true, representation, function(err, stringResult) {
        var parsedResults = stringResult.split('\r\n').map(function (item) {
          return JSON.parse(item);
        });

        expect(parsedResults).to.deep.equal(sampleData);
        done();
      });
    });
  });
});

describe('Transducing serializer', () => {
  it('Can serialize JSON values', () => {
    const serializer = transducingSerializer('json', null, null, false, false, null);
    expect(serializer.headers['Content-Type']).to.equal('application/json; charset=UTF-8');
    const serializedResult = into([], serializer.xform, [{id: 'a'}, {id: 'b'}]).join('');
    expect(serializedResult).to.equal(JSON.stringify([{id: 'a'}, {id: 'b'}]));
  });
  it('Can serialize NDJSON values', () => {
    const serializer = transducingSerializer('json', null, null, false, true, null);
    expect(serializer.headers['Content-Type']).to.equal('application/x-ndjson; charset=UTF-8');
    const serializedResult = into([], serializer.xform, [{id: 'a'}, {id: 'b'}]).join('');
    expect(serializedResult).to.equal(`${JSON.stringify({id: 'a'})}\r\n${JSON.stringify({id: 'b'})}`);
  });
});
