"use strict";

module.exports = [
  {
    singular: 'region',
    singularSpecific: 'regionen',
    plural: 'regioner',
    prefix: 'regions',
    key: [{
      name: 'kode',
      type: 'integer',
      sqlType: 'integer'
    }],
    published: true,
    searchable: true,
    materialized: true
  },
  {
    singular: 'kommune',
    singularSpecific: 'kommunen',
    plural: 'kommuner',
    prefix: 'kommune',
    key: [{
      name: 'kode',
      type: 'integer',
      sqlType: 'integer'
    }],
    published: true,
    searchable: true,
    materialized: true
  },
  {
    singular: 'sogn',
    singularSpecific: 'sognet',
    plural: 'sogne',
    prefix: 'sogne',
    key: [{
      name: 'kode',
      type: 'integer',
      sqlType: 'integer'
    }],
    published: true,
    searchable: true
  },
  {
    singular: 'politikreds',
    singularSpecific: 'politikredsen',
    plural: 'politikredse',
    prefix: 'politikreds',
    key: [{
      name: 'kode',
      type: 'integer',
      sqlType: 'integer'
    }],
    published: true,
    searchable: true
  },
  {
    singular: 'retskreds',
    singularSpecific: 'retskredsen',
    plural: 'retskredse',
    prefix: 'retskreds',
    key: [{
      name: 'kode',
      type: 'integer',
      sqlType: 'integer'
    }],
    published: true,
    searchable: true
  },
  {
    singular: 'opstillingskreds',
    singularSpecific: 'opstillingskredsen',
    plural: 'opstillingskredse',
    prefix: 'opstillingskreds',
    key: [{
      name: 'kode',
      type: 'integer',
      sqlType: 'integer'
    }],
    published: true,
    searchable: true
  },
  {
    singular: 'postnummer',
    singularSpecific: 'postnummeret',
    plural: 'postnumre',
    prefix: 'postnummer',
    key: [{
      name: 'nr',
      type: 'integer',
      sqlType: 'integer'
    }],
    published: false
  },
  {
    singular: 'zone',
    singularSpecific: 'zonen',
    plural: 'zoner',
    prefix: 'zone',
    key: [{
      name: 'zone',
      type: 'integer',
      sqlType: 'integer'
    }],
    published: false
  },
  {
    singular: 'valglandsdel',
    singularSpecific: 'valglandsdelen',
    plural: 'valglandsdele',
    prefix: 'valglandsdels',
    key: [{
      name: 'bogstav',
      type: 'string',
      sqlType: 'text'
    }],
    published: true,
    searchable: true
  },
  {
    singular: 'storkreds',
    singularSpecific: 'storkredsen',
    plural: 'storkredse',
    prefix: 'storkreds',
    key: [{
      name: 'nummer',
      type: 'integer',
      sqlType: 'integer'
    }],
    published: true,
    searchable: true
  },
  {
    singular: 'jordstykke',
    singularSpecific: 'jordstykket',
    plural: 'jordstykker',
    prefix: 'jordstykke',
    key: [{
      name: 'ejerlavkode',
      type: 'integer',
      sqlType: 'integer'
    }, {
      name: 'matrikelnr',
      type: 'string',
      sqlType: 'text'
    }],
    published: true,
    searchable: false,
    materialized: true,
    nested: true
  }
];
