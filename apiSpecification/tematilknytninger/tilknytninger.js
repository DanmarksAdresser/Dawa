"use strict";

module.exports = {
  region: {
    keyFieldNames: ['regionskode'],
    filterable: false // filtreres ved property filter
  },
  kommune: {
    keyFieldNames: ['kommunekode'],
    filterable: false // filtreres ved simpelt property filter
  },
  sogn: {
    keyFieldNames: ['sognekode'],
    filterable: true
  },
  politikreds: {
    keyFieldNames: ['politikredskode'],
    filterable: true
  },
  retskreds: {
    keyFieldNames: ['retskredskode'],
    filterable: true
  },
  opstillingskreds: {
    keyFieldNames: ['opstillingskredskode'],
    filterable: true
  },
  postnummer: {
    keyFieldNames: ['postnummer'],
    filterable: true
  },
  zone: {
    keyFieldNames: ['zone'],
    filterable: true
  },
  valglandsdel: {
    keyFieldNames: ['valglandsdelsbogstav'],
    filterable: true
  },
  jordstykke: {
    keyFieldNames: ['ejerlavkode', 'matrikelnr'],
    filterable: false
  }
};

