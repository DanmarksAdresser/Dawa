"use strict";

var docUtil = require('../../docUtil');
var ZSchema = require('z-schema');

describe('Documentation generation utilities', function() {
  describe('extractDocumentationForObject', function() {
    it('should be able to parse the schema', function() {
      var sampleSchema = {
        'title': 'postnummer',
        'type': 'object',
        'properties': {
          'stormodtageradresse': {
            description: 'Hvis postnummeret er et stormodtagerpostnummer rummer feltet adressen på stormodtageren.',
            type: 'string'
          },
          'kommuner': {
            description: 'De kommuner hvis areal overlapper postnumeret areal.',
            type: 'array',
            items: {
              '$ref': '#/definitions/KommuneRef'
            }
          }
        },
        'required': ['stormodtageradresse', 'kommuner'],
        'docOrder': ['stormodtageradresse', 'kommuner'],
        'additionalProperties': false,
        'definitions': {
          'NullableKode4': {type: ['null','integer'], pattern: '^(\\d{4})$'},
          KommuneRef: {
            type: 'object',
            properties: {
              href: {
                description: 'Kommunens unikke URL.',
                type: 'string'
              },
              kode: {
                description: 'Kommunekoden. 4 cifre.',
                '$ref': '#/definitions/NullableKode4'
              }
            },
            required: ['href', 'kode'],
            docOrder: ['href', 'kode'],
            'additionalProperties': false
          }
        }
      };

      expect(new ZSchema().validateSchema(sampleSchema)).toBeTruthy();
      var doc = docUtil.extractDocumentationForObject(sampleSchema);
      expect(doc).toEqual([
        { name: 'stormodtageradresse', description: 'Hvis postnummeret er et stormodtagerpostnummer rummer feltet adressen på stormodtageren.', type: 'string', required: true },
        { name: 'kommuner', description: 'De kommuner hvis areal overlapper postnumeret areal.', type: 'array', required: true, items: [
          { name: 'href', description: 'Kommunens unikke URL.', type: 'string', required: true },
          { name: 'kode', description: 'Kommunekoden. 4 cifre.', type: 'integer', required: false }
        ] }
      ]);
    });
  });
});