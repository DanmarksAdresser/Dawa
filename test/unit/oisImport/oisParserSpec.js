"use strict";

var es = require('event-stream');
var expect = require('chai').expect;
var fs = require('fs');
var path = require('path');
var q = require('q');

var oisXmlFacts = require('../../../apiSpecification/ois/oisXmlFacts');

var oisParser = require('../../../oisImport/oisParser');
describe('OIS XML file parser', function() {
  it('Kan parse OIS fil med bygninger', function() {
    var fileStream = fs.createReadStream(path.join(__dirname, 'ois_bygning.xml'));
    var oisStream = oisParser.oisStream(fileStream, oisXmlFacts.bygning);
    return q.Promise(function(resolve, reject) {
      var writeStream = es.writeArray(function(err, array) {
        if(err) {
          return reject(err);
        }
        resolve(array);
      });
      oisStream.pipe(writeStream);
    }).then(function(result) {
      expect(result).to.have.length(2);
      var obj = result[0];
      expect(obj.ois_id).to.equal(2964860);
    });
  });
});