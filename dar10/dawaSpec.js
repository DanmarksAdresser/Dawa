"use strict";

var _ = require('underscore');

var datamodels = require('../crud/datamodel');

module.exports = {
  adresse: {
    table: datamodels.adresse.table,
    columns: _.without(datamodels.adresse.columns, 'ikraftfra', 'kilde', 'esdhreference', 'journalnummer'),
    idColumns: datamodels.adresse.key
  },
  adgangsadresse: {
    table: datamodels.adgangsadresse.table,
    columns:  _.without(datamodels.adgangsadresse.columns, 'ejerlavkode', 'matrikelnr', 'esrejendomsnr', 'ikraftfra', 'husnummerkilde', 'esdhreference', 'journalnummer'),
    idColumns: datamodels.adgangsadresse.key
  },
  vejstykke: {
    table: datamodels.vejstykke.table,
    columns: _.without(datamodels.vejstykke.columns, 'oprettet', 'aendret'),
    idColumns: datamodels.vejstykke.key
  }
};