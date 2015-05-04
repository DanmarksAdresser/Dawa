"use strict";

var _ = require('underscore');

var csvSpec = require('./csvSpec');


module.exports = {
  adgangspunkt: {
    table: 'dar_adgangspunkt',
    temporality: 'bitemporal',
    idColumns: ['id'],
    columns: _.without(_.pluck(csvSpec.adgangspunkt.columns, 'name'), 'oest', 'nord').concat('geom')
  },
  husnummer: {
    table: 'dar_husnummer',
    temporality: 'bitemporal',
    idColumns: ['id'],
    columns: _.pluck(csvSpec.husnummer.columns, 'name')
  },
  adresse: {
    filename: 'Adresse.csv',
    table: 'dar_adresse',
    temporality: 'bitemporal',
    idColumns: ['id'],
    columns: _.pluck(csvSpec.adresse.columns, 'name')
  },
  streetname: {
    table: 'dar_vejnavn',
    temporality: 'monotemporal',
    idColumns: ['id'],
    columns: _.pluck(csvSpec.streetname.columns, 'name'),
  },
  postnr: {
    table: 'dar_postnr',
    temporality: 'monotemporal',
    idColumns: ['id'],
    columns: _.without(_.pluck(csvSpec.postnr.columns, 'name'), 'byhusnummerfra', 'byhusnummertil', 'vejstykkeside').concat(['husnrinterval', 'side'])
  },
  supplerendebynavn: {
    table: 'dar_supplerendebynavn',
    temporality: 'monotemporal',
    idColumns: ['id'],
    columns: _.without(_.pluck(csvSpec.supplerendebynavn.columns, 'name'), 'byhusnummerfra', 'byhusnummertil', 'byvejside').concat(['husnrinterval', 'side'])
  }
};