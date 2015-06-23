"use strict";

var path = require('path');

var aboutOis = require('../../../oisImport/aboutOis');

var oisParser = require('../../../oisImport/oisParser');
describe('OIS XML file parser', function() {
  it('Kan parse OIS fil med bygninger', function() {
    return oisParser.oisStream(path.join(__dirname, 'ois_bygning.xml'), aboutOis.bygning);
  });
});