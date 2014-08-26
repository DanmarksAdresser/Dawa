//"use strict";
//
//var request = require('request');
//var _ = require('underscore');
//
//var baseUrl = process.env.baseUrl || 'http://dawa.aws.dk';
//
//
//var collectionResources = [
//  {
//    uri: '/adresser',
//    formats: ['json', 'csv', 'geojson']
//  },
//  {
//    uri: '/adgangsadresser',
//    formats: ['json', 'csv', 'geojson']
//  }
//];
//
//var collectionResourceVerifiers = {
//  json: function(resultString) {
//    var json = JSON.parse(resultString);
//    expect(_.isArray(json)).toBeTruthy();
//    expect(json.length).toBe(10);
//  }
//};
//
//describe('Deployment test', function() {
//  collectionResources.forEach(function(res) {
//    res.formats.forEach(function(format) {
//      request.get(baseUrl + res.uri + '?format=' + format + '&per_side=10', function(err, response, body) {
//        expect(err).toBeFalsy();
//        expect(response).
//        collectionResourceVerifiers[format](body);
//      });
//    });
//  });
//});