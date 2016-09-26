"use strict";

var _ = require('underscore');

var datamodels = require('../crud/datamodel');

/**
 * Specification of DAWA tables and fields, which are updated based on data from DAR 1.0
 */
module.exports = {
  vejstykke: {
    table: datamodels.vejstykke.table,
    columns: _.without(datamodels.vejstykke.columns, 'oprettet', 'aendret', 'geom'),
    idColumns: datamodels.vejstykke.key
  },
  adgangsadresse: {
    table: datamodels.adgangsadresse.table,
    columns:  _.without(datamodels.adgangsadresse.columns, 'ejerlavkode', 'matrikelnr', 'esrejendomsnr', 'ikraftfra', 'husnummerkilde', 'esdhreference', 'journalnummer', 'placering', 'hoejde'),
    idColumns: datamodels.adgangsadresse.key
  },
  adresse: {
    table: datamodels.adresse.table,
    columns: _.without(datamodels.adresse.columns, 'ikraftfra', 'kilde', 'esdhreference', 'journalnummer'),
    idColumns: datamodels.adresse.key
  },
  navngivenvej_postnummer: {
    table: 'navngivenvej_postnummer',
    columns: ['navngivenvej_id', 'postnr', 'tekst'],
    idColumns: ['navngivenvej_id', 'postnr']
  }
};
