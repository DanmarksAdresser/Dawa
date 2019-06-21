const _ = require('underscore');


/******************************************************************************/
/*** Utils ********************************************************************/
/******************************************************************************/

const autocompleteSubtext = (name) => {
  return 'Autocomplete på ' + name + '. Der kan anvendes de samme parametre som ved søgning, men bemærk at' +
    ' <em>q</em> parameteren fortolkes anderledes. Læs mere under <a href="generelt#autocomplete">autocomplete</a>.';
};

const  overwriteWithAutocompleteQParameter = (properties) => {
  var overwrite = [{
    name: 'q',
    doc: 'Se beskrivelse under <a href="generelt#autocomplete">autocomplete</a>'
  }];
  return _.map(_.pairs(_.extend(_.indexBy(properties, 'name'), _.indexBy(overwrite, 'name'))),
    function (pair) {
      pair[1].name = pair[0];
      return pair[1];
    });
};

/******************************************************************************/
/*** Format parameters ********************************************************/
/******************************************************************************/

const formatParameters = [
  {
    name: 'callback',
    doc: 'Output leveres i <em>JSONP</em> format. Se <a href=generelt#dataformater>Dataformater</a>.'
  },
  {
    name: 'format',
    doc: 'Output leveres i andet format end <em>JSON</em>. Se <a href=generelt#dataformater>Dataformater</a>.'
  },
  {
    name: 'noformat',
    doc: 'Parameteren angiver, at whitespaceformatering skal udelades'
  }
];

const strukturParameter = {
  name: 'struktur',
  doc: 'Struktur parameteren angiver om der ønskes en flad eller en nestet svarstruktur. Default er nestet for JSON, og flad for GeoJSON.'
};

const pagingParameters = [{
  name: 'side',
  doc: 'Angiver hvilken siden som skal leveres. Se <a href=generelt#paginering>Paginering</a>.'
},
  {
    name: 'per_side',
    doc: 'Antal resultater per side. Se <a href=generelt#paginering>Paginering</a>.'
  }];

const formatAndPagingParams = formatParameters.concat(pagingParameters);

const fuzzyParameter = {
  name: 'fuzzy',
  doc: 'Aktiver fuzzy søgning'
};

const SRIDParameter = {
  name: 'srid',
  doc: 'Angiver <a href="http://en.wikipedia.org/wiki/SRID">SRID</a>' +
  ' for det koordinatsystem, som geospatiale parametre er angivet i. Default er 4326 (WGS84).'
};

const reverseGeocodingParameters = [{
  name: 'x',
  doc: 'X koordinat. (Hvis ETRS89/UTM32 anvendes angives øst-værdien.) Hvis WGS84/geografisk ' +
  'anvendes angives bredde-værdien.'
},
  {
    name: 'y',
    doc: 'Y koordinat. (Hvis ETRS89/UTM32 anvendes angives nord-værdien.) Hvis WGS84/geografisk ' +
    'anvendes angives længde-værdien.'
  },
  SRIDParameter].concat(formatParameters);

const autocompleteParameter = {
  name: 'autocomplete',
  doc: 'Udfør søgning som autocomplete-søgning.'
};
module.exports = {
  autocompleteSubtext,
  overwriteWithAutocompleteQParameter,
  formatParameters,
  strukturParameter,
  pagingParameters,
  formatAndPagingParams,
  fuzzyParameter,
  SRIDParameter,
  reverseGeocodingParameters,
  autocompleteParameter
};
