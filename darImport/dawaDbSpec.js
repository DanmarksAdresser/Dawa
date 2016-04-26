"use strict";

var _ = require('underscore');

var datamodels = require('../crud/datamodel');


module.exports = {
  adresse: {
    temporality: 'nontemporal',
    table: datamodels.adresse.table,
    columns: datamodels.adresse.columns,
    idColumns: datamodels.adresse.key
  },
  adgangsadresse: {
    temporality: 'nontemporal',
    table: datamodels.adgangsadresse.table,
    columns:  _.without(datamodels.adgangsadresse.columns, 'ejerlavkode', 'matrikelnr', 'esrejendomsnr'),
    idColumns: datamodels.adgangsadresse.key
  },
  vejstykke: {
    temporality: 'nontemporal',
    table: datamodels.vejstykke.table,
    columns: _.without(datamodels.vejstykke.columns, 'oprettet', 'aendret', 'geom'),
    idColumns: datamodels.vejstykke.key
  }
};
