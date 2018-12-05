"use strict";

"use strict";

const _ = require('underscore');

const representationUtil = require('../common/representationUtil');
const fields = require('./fields');
const registry = require('../registry');

const fieldsExcludedFromFlat = ['geom_json', 'visueltcenter'];
const flatFields = representationUtil.fieldsWithoutNames(fields, fieldsExcludedFromFlat);
const {globalSchemaObject} = require('../commonSchemaDefinitionsUtil');
const schemaObject = require('../schemaUtil').schemaObject;
const commonMappers = require('../commonMappers');
const {makeHref} = require('../commonMappers');
const normalizedFieldSchemas = require('../replikering/normalizedFieldSchemas');
const { numberToString } = require('../util');

var normalizedFieldSchema = function (fieldName) {
  return normalizedFieldSchemas.normalizedSchemaField('jordstykke', fieldName);
};


exports.flat = representationUtil.defaultFlatRepresentation(flatFields);

const fieldsExcludedFromJson = ['geom_json', 'visueltcenter'];

const autocompleteFieldNames = ['ejerlavkode', 'ejerlavnavn', 'matrikelnr', 'kommunekode',
  'bbox_xmin', 'bbox_ymin', 'bbox_xmax', 'bbox_ymax',
  'visueltcenter_x', 'visueltcenter_y',
  'esrejendomsnr', 'udvidet_esrejendomsnr', 'sfeejendomsnr'];


const autocompleteSchemaProperties = {
  href: {
    type: 'string',
    description: 'Jordstykkets unikke URL'
  },
  ejerlav: {
    description: 'Ejerlavet som jordstykket tilhører.',
    $ref: '#/definitions/EjerlavRef',
  },
  matrikelnr: normalizedFieldSchema('matrikelnr'),
  udvidet_esrejendomsnr: normalizedFieldSchema('udvidet_esrejendomsnr'),
  esrejendomsnr: normalizedFieldSchema('esrejendomsnr'),
  sfeejendomsnr: normalizedFieldSchema('sfeejendomsnr'),
  kommune: {
    description: 'Kommunen som jordstykket er beliggende i.',
    $ref: '#/definitions/NullableKommuneRef'
  },
  visueltcenter: {
    description: 'Koordinater for jordstykkets visuelle center. Kan eksempelvis benyttes til at placere jodstykkets matrikelnr på et kort.',
    $ref: '#/definitions/NullableVisueltCenter'
  },
  bbox: {
    description: `Geometriens bounding box, dvs. det mindste rectangel som indeholder geometrien. Består af et array af 4 tal.
        De første to tal er koordinaterne for bounding boxens sydvestlige hjørne, og to to sidste tal er
        koordinaterne for bounding boxens nordøstlige hjørne. Anvend srid parameteren til at angive det ønskede koordinatsystem.`,
    $ref: '#/definitions/NullableBbox'
  },
};
const autocompletePropertiesDocOrder = ['href','ejerlav', 'matrikelnr', 'udvidet_esrejendomsnr', 'esrejendomsnr', 'sfeejendomsnr', 'kommune', 'visueltcenter', 'bbox'];


exports.autocomplete = {
  schema: globalSchemaObject({
    properties: {
      tekst: {
        type: 'string',
        description: 'Autocomplete-tekst, består af "{matrikelnr}, {ejerlavnavn} ({ejerlavkode}"'
      },
      jordstykke: schemaObject({
        properties: autocompleteSchemaProperties,
        docOrder: autocompletePropertiesDocOrder
      })
    },
    docOrder: ['tekst', 'jordstykke']
  }),
  fields: _.filter(_.where(fields, {selectable: true}), function (field) {
    return autocompleteFieldNames.includes(field.name);
  }),
  mapper: (baseUrl) => row => {
    const result = {};
    result.matrikelnr = row.matrikelnr;
    result.bbox = commonMappers.mapBbox(row);
    result.visueltcenter = commonMappers.mapVisueltCenter(row);
    result.href = makeHref(baseUrl, 'jordstykke', [row.ejerlavkode, row.matrikelnr]);
    result.ejerlav = commonMappers.mapEjerlavRef(row.ejerlavkode, row.ejerlavnavn, baseUrl);
    result.kommune = commonMappers.mapKode4NavnTema('kommune', row.kommunekode, row.kommunenavn, baseUrl);
    result.esrejendomsnr = row.esrejendomsnr ? ('' + row.esrejendomsnr) : null;
    result.udvidet_esrejendomsnr = row.udvidet_esrejendomsnr ? ('' + row.udvidet_esrejendomsnr) : null;
    result.sfeejendomsnr = row.sfeejendomsnr ? ('' + row.sfeejendomsnr) : null;
    return {
      tekst: `${result.matrikelnr} ${result.ejerlav.navn} (${result.ejerlav.kode})`,
      jordstykke: result
    }
  }};

  exports.json = {
  schema: globalSchemaObject({
    title: 'Jordstykke',
    properties: Object.assign({}, autocompleteSchemaProperties, {
      region: {
        description: 'Regionen som jordstykket er beliggende i.',
        $ref: '#/definitions/NullableRegionsRef'
      },
      sogn: {
        description: 'Sognet som jordstykket er beliggende i.',
        $ref: '#/definitions/NullableSogneRef'
      },
      retskreds: {
        description: 'Retskredsen, som er tilknyttet jordstykket, angiver hvilken ret den matrikulære registreringsmeddelse er sendt til. Efter 2008 sendes alle registreringsmeddelser til tinglysningsretten i Hobro, som i Matriklen har retskredskode 1180. I denne forbindelse anvender Matriklen et andet retskredsbegreb end DAGI, hvor retskredskoden 1180 ikke eksisterer.',
        $ref: '#/definitions/NullableRetskredsRef'
      },
      'ændret': {
        description: 'Tidspunkt for seneste ændring registreret i DAWA. Opdateres ikke hvis ændringen kun vedrører' +
        ' geometrien (se felterne geo_ændret og geo_version).',
        $ref: '#/definitions/DateTimeUtc'
      },
      'geo_ændret': {
        description: 'Tidspunkt for seneste ændring af geometrien registreret i DAWA.',
        $ref: '#/definitions/DateTimeUtc'
      },
      geo_version: {
        description: 'Versionsangivelse for geometrien. Inkrementeres hver gang geometrien ændrer sig i DAWA.',
        type: 'integer'
      },

      featureid: normalizedFieldSchema('featureid'),
      fælleslod: normalizedFieldSchema('fælleslod'),
      moderjordstykke: normalizedFieldSchema('moderjordstykke'),
      registreretareal:  normalizedFieldSchema('registreretareal'),
      arealberegningsmetode: normalizedFieldSchema('arealberegningsmetode'),
      vejareal: normalizedFieldSchema('vejareal'),
      vejarealberegningsmetode: normalizedFieldSchema('vejarealberegningsmetode'),
      vandarealberegningsmetode: normalizedFieldSchema('vandarealberegningsmetode')
    }),
    docOrder: [...autocompletePropertiesDocOrder, 'region', 'sogn', 'retskreds', 'ændret', 'geo_ændret',
      'geo_version', 'featureid', 'fælleslod', 'moderjordstykke', 'registreretareal', 'arealberegningsmetode', 'vejareal',
      'vejarealberegningsmetode', 'vandarealberegningsmetode']
  }),
  fields: _.filter(_.where(fields, {selectable: true}), function (field) {
    return !_.contains(fieldsExcludedFromJson, field.name);
  }),
  mapper: (baseUrl) => row => {
    const result = exports.autocomplete.mapper(baseUrl)(row).jordstykke;
    Object.assign(result, _.pick(row, 'ændret', 'geo_version', 'geo_ændret',
    'fælleslod','moderjordstykke', 'registreretareal', 'arealberegningsmetode',
      'vejareal', 'vejarealberegningsmetode', 'vandarealberegningsmetode'));
    result.featureid = numberToString(row.featureid);
    result.region = commonMappers.mapKode4NavnTema('region', row.regionskode, row.regionsnavn, baseUrl);
    result.sogn = commonMappers.mapKode4NavnTema('sogn', row.sognekode, row.sognenavn, baseUrl);
    result.retskreds = commonMappers.mapKode4NavnTema('retskreds', row.retskredskode, row.retskredsnavn, baseUrl);

    return result;
  }
};

const geojsonField = _.findWhere(fields, {name: 'geom_json'});
exports.geojson = representationUtil.geojsonRepresentation(geojsonField, exports.flat);
exports.geojsonNested = representationUtil.geojsonRepresentation(geojsonField, exports.json);

registry.addMultiple('jordstykke', 'representation', module.exports);
