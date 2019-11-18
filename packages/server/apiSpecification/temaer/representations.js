"use strict";

var _ = require('underscore');
var representationUtil = require('../common/representationUtil');
var fieldMap = require('./fields');
var commonSchemaDefinitionsUtil = require('../commonSchemaDefinitionsUtil');
const {normalizedSchemaField} = require('../replikering/normalizedFieldSchemas');
const commonMappers = require('../commonMappers');
const commonSchemaDefinitions = require('../commonSchemaDefinitions');
const {schemaObject, nullable} = require('../schemaUtil');
var globalSchemaObject = commonSchemaDefinitionsUtil.globalSchemaObject;
const {
  makeHrefFromPath,
  mapKode4NavnTema,
  mapKommuneRefArray,
  makeHref
} = require('../commonMappers');
const temaModels = require('../../dagiImport/temaModels');
const {kode4String, numberToString} = require('../util');
var registry = require('../registry');

const numToStr = (num) => _.isNumber(num) ? '' + num : null;

var nameOnlyAutocomplete = {
  description: function (tema) {
    return 'Navnet på ' + tema.singularSpecific;
  },
  mapper: function (row) {
    return row.navn;
  }
};

const commonGeoProps = {
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
  bbox: {
    description: `Geometriens bounding box, dvs. det mindste rectangel som indeholder geometrien. Består af et array af 4 tal.
        De første to tal er koordinaterne for bounding boxens sydvestlige hjørne, og to sidste tal er
        koordinaterne for bounding boxens nordøstlige hjørne. Anvend srid parameteren til at angive det ønskede koordinatsystem.`,
    $ref: '#/definitions/NullableBbox'
  },
  visueltcenter: {
    description: 'Geometriens visuelle center. Kan eksempelvis anvendes til placering af labels.',
    $ref: '#/definitions/NullableVisueltCenter'
  }
};


var autocompleteTekst = {
  valglandsdel: nameOnlyAutocomplete,
  storkreds: nameOnlyAutocomplete,
  menighedsrådsafstemningsområde: nameOnlyAutocomplete,
  afstemningsområde: nameOnlyAutocomplete,
  supplerendebynavn: nameOnlyAutocomplete,
  landsdel: nameOnlyAutocomplete
};

var kodeAndNavnTemaer = ['region', 'kommune', 'sogn', 'opstillingskreds', 'retskreds', 'politikreds'];
kodeAndNavnTemaer.forEach(function (dagiTemaNavn) {
  autocompleteTekst[dagiTemaNavn] = {
    description: function (tema) {
      return 'Koden efterfulgt af navnet på ' + tema.singularSpecific;
    },
    mapper: function (row) {
      return '' + kode4String(row.kode) + ' ' + row.navn;
    }
  };
});

const kodeNavnMiniBetegnelse = (row) => `${row.navn} (${kode4String(row.kode)})`;
const kodeNrMiniBetegnelse = (row) => `${row.navn} (${row.nummer})`;
const miniBetegnelse = {
  kommune: kodeNavnMiniBetegnelse,
  region: kodeNavnMiniBetegnelse,
  politikreds: kodeNavnMiniBetegnelse,
  retskreds: kodeNavnMiniBetegnelse,
  sogn: kodeNavnMiniBetegnelse,
  menighedsrådsafstemningsområde: kodeNrMiniBetegnelse,
  opstillingskreds: kodeNrMiniBetegnelse,
  storkreds: kodeNrMiniBetegnelse,
  valglandsdel: row => `${row.navn} (${row.bogstav})`,
  afstemningsområde: row => `${row.navn}, ${row.kommunenavn} (${row.afstemningsstednavn})`,
  supplerendebynavn: row => `${row.navn}, ${row.kommunenavn} Kommune`,
  landsdel: row => `${row.navn} (${row.nuts3})`
};

const mapMetaFields = row => {
  return {
    ændret: row.ændret,
    geo_version: row.geo_version,
    geo_ændret: row.geo_ændret,
    bbox: commonMappers.mapBbox(row),
    visueltcenter: commonMappers.mapVisueltCenter(row)
  };
};

const miniFieldNames = {
  kommune: ['dagi_id', 'kode', 'navn', 'udenforkommuneinddeling', 'regionskode', 'regionsnavn'],
  landsdel: ['dagi_id', 'nuts3', 'navn', 'regionskode', 'regionsnavn', 'landsdelsnavn'],
  region: ['dagi_id', 'kode', 'navn'],
  afstemningsområde: ['dagi_id', 'nummer', 'navn', 'kommunekode', 'kommunenavn', 'opstillingskredsnummer', 'opstillingskredsnavn', 'afstemningsstednavn'],
  opstillingskreds: ['dagi_id', 'kode', 'nummer', 'navn', 'kredskommunekode', 'kredskommunenavn', 'storkredsnummer', 'storkredsnavn', 'valgkredsnummer'],
  storkreds: ['dagi_id', 'nummer', 'navn', 'valglandsdelsbogstav', 'valglandsdelsnavn'],
  valglandsdel: ['dagi_id', 'bogstav', 'navn'],
  politikreds: ['dagi_id', 'kode', 'navn'],
  retskreds: ['dagi_id', 'kode', 'navn'],
  sogn: ['dagi_id', 'kode', 'navn', 'kommunekode', 'kommunenavn'],
  menighedsrådsafstemningsområde: ['dagi_id', 'nummer', 'navn', 'kommunekode', 'kommunenavn', 'sognekode', 'sognenavn'],
  supplerendebynavn: ['dagi_id', 'navn', 'darstatus', 'kommunekode', 'kommunenavn']
};

const miniFieldsNotInOutput = {
  opstillingskreds: ['kode']
};

const makeHrefFormatter = model => (baseUrl, row) =>
  makeHrefFromPath(baseUrl, model.path || model.plural, _.map(model.primaryKey, function (keyName) {
      return row[keyName];
    }
  ));


const kommuneJsonRepresentation = (() => {
  const fields = representationUtil.fieldsWithoutNames(fieldMap.kommune, ['geom_json']);
  const normalizedFieldSchema = (fieldName) => {
    return normalizedSchemaField('kommune', fieldName);
  };
  const mapper = baseUrl => row => {
    const result = Object.assign(mapMetaFields(row), {
      href: makeHref(baseUrl, 'kommune', [kode4String(row.kode)]),
      dagi_id: numberToString(row.dagi_id),
      kode: kode4String(row.kode),
      navn: row.navn,
      udenforkommuneinddeling: row.udenforkommuneinddeling,
      regionskode: kode4String(row.regionskode),
      region: mapKode4NavnTema('region', row.regionskode, row.regionsnavn, baseUrl),
    });
    return result;
  };
  const schema = globalSchemaObject({
    title: 'Kommune',
    properties: Object.assign({
      dagi_id: normalizedFieldSchema('dagi_id'),
      href: Object.assign({}, commonSchemaDefinitions.Href, {description: 'Kommunens URL'}),
      kode: normalizedFieldSchema('kode'),
      navn: normalizedFieldSchema('navn'),
      regionskode: normalizedFieldSchema('regionskode'),
      udenforkommuneinddeling: normalizedFieldSchema('udenforkommuneinddeling'),
      region: nullable(Object.assign({}, commonSchemaDefinitions.RegionsRef, {description: 'Den region, som kommunen ligger i.'})),
    }, commonGeoProps),
    docOrder: ['dagi_id', 'href', 'kode', 'navn', 'udenforkommuneinddeling', 'ændret', 'geo_version', 'geo_ændret', 'bbox', 'visueltcenter', 'region', 'regionskode']
  });
  return {fields, mapper, schema};
})();

const opstillingskredsJsonRepresentation = (() => {
  const fields = representationUtil.fieldsWithoutNames(fieldMap.opstillingskreds, ['geom_json']);
  const normalizedFieldSchema = (fieldName) => {
    return normalizedSchemaField('opstillingskreds', fieldName);
  };
  const mapper = baseUrl => row => {
    const result = Object.assign(mapMetaFields(row), {
      href: makeHref(baseUrl, 'opstillingskreds', [row.nummer]),
      dagi_id: numberToString(row.dagi_id),
      nummer: numToStr(row.nummer),
      kode: kode4String(row.nummer),
      navn: row.navn,
      valgkredsnummer: numToStr(row.valgkredsnummer),
      kredskommune: mapKode4NavnTema('kommune', kode4String(row.kredskommunekode), row.kredskommunenavn, baseUrl),
      region: mapKode4NavnTema('region', row.regionskode, row.regionsnavn, baseUrl),
      storkreds: commonMappers.mapStorkredsRef(row, baseUrl),
      valglandsdel: commonMappers.mapValglandsdelRef(row, baseUrl),
      kommuner: mapKommuneRefArray(row.kommuner, baseUrl)
    });
    return result;
  };
  const schema = globalSchemaObject({
    title: 'Opstillingskreds',
    properties: Object.assign({
      dagi_id: normalizedFieldSchema('dagi_id'),
      href: Object.assign({}, commonSchemaDefinitions.Href, {description: 'Opstillingskredsens URL'}),
      navn: normalizedFieldSchema('navn'),
      nummer: normalizedFieldSchema('nummer'),
      kode: normalizedFieldSchema('kode'),
      valgkredsnummer: normalizedFieldSchema('valgkredsnummer'),
      kredskommune: Object.assign({}, commonSchemaDefinitions.KommuneRef, {description: 'Opstillingskredsens kredskommune.'}),
      region: Object.assign({}, commonSchemaDefinitions.RegionsRef, {description: 'Den region, som opstillingskredsen ligger i.'}),
      storkreds: Object.assign({}, commonSchemaDefinitions.StorkredsRef, {description: 'Den storkreds, som opstillingskredsen tilhører.'}),
      valglandsdel: Object.assign({}, commonSchemaDefinitions.ValglandsdelsRef, {description: 'Den valglandsdel, som opstillingskredsen tilhører'}),
      kommuner: {
        description: 'De kommuner som opstillingskredsen ligger i.',
        type: 'array',
        items:
        commonSchemaDefinitions.KommuneRef

      }
    }, commonGeoProps),
    docOrder: ['dagi_id', 'href', 'navn', 'ændret', 'geo_version', 'geo_ændret', 'bbox', 'visueltcenter', 'nummer', 'valgkredsnummer', 'kode',
      'kredskommune', 'region', 'storkreds', 'valglandsdel', 'kommuner']
  });
  return {fields, mapper, schema};
})();

const afstemningsområdeJsonRepresentation = (() => {
  const fields = representationUtil.fieldsWithoutNames(fieldMap.afstemningsområde, ['geom_json']);
  const mapper = baseUrl => row => {
    const result = Object.assign(mapMetaFields(row), {
      href: makeHref(baseUrl, 'afstemningsområde', [row.kommunekode, row.nummer]),
      dagi_id: numberToString(row.dagi_id),
      nummer: numToStr(row.nummer),
      navn: row.navn,
      afstemningssted: {
        navn: row.afstemningsstednavn,
        adgangsadresse: {
          href: makeHref(baseUrl, 'adgangsadresse', [row.afstemningsstedadresseid]),
          id: row.afstemningsstedadresseid,
          adressebetegnelse: row.afstemningsstedadressebetegnelse,
          koordinater: [row.afstemningssted_adgangspunkt_x, row.afstemningssted_adgangspunkt_y]
        }
      },
      kommune: mapKode4NavnTema('kommune', row.kommunekode, row.kommunenavn, baseUrl),
      region: mapKode4NavnTema('region', row.regionskode, row.regionsnavn, baseUrl),
      opstillingskreds: {
        href: makeHref(baseUrl, 'opstillingskreds', [row.opstillingskredsnummer]),
        nummer: numToStr(row.opstillingskredsnummer),
        navn: row.opstillingskredsnavn
      },
      storkreds: commonMappers.mapStorkredsRef(row, baseUrl),
      valglandsdel: commonMappers.mapValglandsdelRef(row, baseUrl)
    });
    return result;
  };
  const normalizedFieldSchema = (fieldName) => {
    return normalizedSchemaField('afstemningsområde', fieldName);
  };
  const schema = globalSchemaObject({
    title: 'Afstemningsområde',
    properties: Object.assign({
      dagi_id: normalizedFieldSchema('dagi_id'),
      href: commonSchemaDefinitions.Href,
      navn: normalizedFieldSchema('navn'),
      nummer: normalizedFieldSchema('nummer'),
      afstemningssted: schemaObject({
        properties: {
          navn: {
            type: 'string',
            description: 'Afstemningsstedets navn.'
          },
          adgangsadresse: schemaObject({
            description: 'Afstemningsstedets adgangsadresse',
            properties: {
              href: {
                type: 'string',
                description: 'Adgangsadressens unikke URL'
              },
              id: Object.assign({}, commonSchemaDefinitions.UUID, {
                description: 'Adgangsadressens unikke ID.'
              }),
              adressebetegnelse: {
                type: 'string',
                description: 'Adressebetegnelse for adgangsadressen.'
              },
              koordinater: {
                type: 'array',
                items: {
                  type: 'number'
                }
              }
            },
            docOrder: ['href', 'id', 'adressebetegnelse', 'koordinater']
          })
        },
        docOrder: ['navn', 'adgangsadresse']
      }),
      kommune: commonSchemaDefinitions.KommuneRef,
      region: commonSchemaDefinitions.RegionsRef,
      opstillingskreds: commonSchemaDefinitions.OpstillingskredsRef,
      storkreds: commonSchemaDefinitions.StorkredsRef,
      valglandsdel: commonSchemaDefinitions.ValglandsdelsRef,
    }, commonGeoProps),
    docOrder: ['dagi_id', 'href', 'navn', 'ændret', 'geo_version', 'geo_ændret', 'bbox', 'visueltcenter', 'nummer',
      'afstemningssted',
      'kommune', 'region', 'opstillingskreds', 'storkreds', 'valglandsdel']
  });
  return {fields, mapper, schema};
})();

const mrAfstemningsområdeRepresentation = (() => {
  const fields = representationUtil.fieldsWithoutNames(fieldMap.menighedsrådsafstemningsområde, ['geom_json']);
  const mapper = baseUrl => row => {
    const result = Object.assign(mapMetaFields(row), {
      href: makeHrefFromPath(baseUrl, 'menighedsraadsafstemningsomraader', [row.kommunekode, row.nummer]),
      dagi_id: numberToString(row.dagi_id),
      ændret: row.ændret,
      geo_version: row.geo_version,
      geo_ændret: row.geo_ændret,
      nummer: numToStr(row.nummer),
      navn: row.navn,
      kommune: mapKode4NavnTema('kommune', row.kommunekode, row.kommunenavn, baseUrl),
      sogn: mapKode4NavnTema('sogn', row.sognekode, row.sognenavn, baseUrl)
    });
    return result;
  };
  const normalizedFieldSchema = (fieldName) => {
    return normalizedSchemaField('menighedsrådsafstemningsområde', fieldName);
  };
  const schema = globalSchemaObject({
    title: 'Menighedsrådsafstemningsområde',
    properties: Object.assign({
      dagi_id: normalizedFieldSchema('dagi_id'),
      href: commonSchemaDefinitions.Href,
      navn: normalizedFieldSchema('navn'),
      nummer: normalizedFieldSchema('nummer'),
      kommune: commonSchemaDefinitions.KommuneRef,
      sogn: commonSchemaDefinitions.SogneRef
    }, commonGeoProps),
    docOrder: ['dagi_id', 'href', 'navn', 'ændret', 'geo_version', 'geo_ændret', 'bbox', 'visueltcenter', 'nummer',
      'kommune', 'sogn']
  });
  return {fields, mapper, schema};
})();

const storkredsJsonRepresentation = (() => {
  const fields = representationUtil.fieldsWithoutNames(fieldMap.storkreds, ['geom_json']);
  const mapper = baseUrl => row => {
    const result = Object.assign(mapMetaFields(row), {
      href: makeHref(baseUrl, 'storkreds', [row.nummer]),
      nummer: numToStr(row.nummer),
      navn: row.navn,
      region: mapKode4NavnTema('region', row.regionskode, row.regionsnavn, baseUrl),
      valglandsdel: commonMappers.mapValglandsdelRef(row ,baseUrl)
    });
    return result;
  };
  const normalizedFieldSchema = (fieldName) => {
    return normalizedSchemaField('storkreds', fieldName);
  };
  const schema = globalSchemaObject({
    title: 'Storkreds',
    properties: Object.assign({
      href: Object.assign({}, commonSchemaDefinitions.Href, {description: 'Storkredsens URL'}),
      nummer: normalizedFieldSchema('nummer'),
      navn: normalizedFieldSchema('navn'),
      region: Object.assign({}, commonSchemaDefinitions.RegionsRef, {description: 'Den region, som storkredsen ligger i.'}),
      valglandsdel: Object.assign({}, commonSchemaDefinitions.ValglandsdelsRef, {description: 'Den valglandsdel, som storkredsen tilhører'}),
    }, commonGeoProps),
    docOrder: ['href', 'ændret', 'geo_version', 'geo_ændret','bbox', 'visueltcenter','nummer', 'navn',
      'region', 'valglandsdel']
  });
  return {fields, mapper, schema};
})();

const supplerendebynavnRepresentation = (() => {
  const fields = representationUtil.fieldsWithoutNames(fieldMap.supplerendebynavn, ['geom_json']);
  const mapper = baseUrl => row => {
    const result = Object.assign(mapMetaFields(row), {
      href: makeHrefFromPath(baseUrl, 'supplerendebynavne2', [row.dagi_id]),
      dagi_id: numberToString(row.dagi_id),
      navn: row.navn,
      darstatus: row.darstatus,
      kommune: mapKode4NavnTema('kommune', row.kommunekode, row.kommunenavn, baseUrl),
      postnumre: commonMappers.mapPostnummerRefArray(row.postnumre, baseUrl)
    });
    return result;
  };
  const normalizedFieldSchema = (fieldName) => {
    return normalizedSchemaField('supplerendebynavn', fieldName);
  };
  const schema = globalSchemaObject({
    title: 'Supplerende Bynavn',
    properties: Object.assign({
      href: Object.assign({}, commonSchemaDefinitions.Href, {description: 'Det supplerende bynavns URL'}),
      dagi_id: normalizedFieldSchema('dagi_id'),
      navn: normalizedFieldSchema('navn'),
      darstatus: {
        type: 'integer',
        description: 'Det supplerende bynavns status i DAR. 3=gældende, 4=nedlagt'
      },
      kommune: Object.assign({}, commonSchemaDefinitions.NullableKommuneRef, {description: 'Den kommune, som det supplerende bynavn ligger i.'}),
      postnumre: {
        description: 'De postnumre, der forefindes i det supplerende bynavn.',
        type: 'array',
        items: {
          $ref: '#/definitions/PostnummerRef'
        }
      }
    }, commonGeoProps),
    docOrder: ['href', 'dagi_id', 'ændret', 'geo_version', 'geo_ændret', 'bbox', 'visueltcenter', 'navn',
      'darstatus', 'kommune', 'postnumre']
  });

  for(let prop of ['ændret', 'geo_ændret', 'geo_version']) {
    schema.properties[prop] = nullable(schema.properties[prop]);
  }

  return {fields, mapper, schema};
})();

const landsdelsRepresentation = (() => {
  const fields = representationUtil.fieldsWithoutNames(fieldMap.landsdel, ['geom_json']);
  const mapper = baseUrl => row => {
    const result = Object.assign(mapMetaFields(row), {
      href: makeHref(baseUrl, 'landsdel', [row.nuts3]),
      dagi_id: numberToString(row.dagi_id),
      navn: row.navn,
      nuts3: row.nuts3,
      region: mapKode4NavnTema('region', row.regionskode, row.regionsnavn, baseUrl),
    });
    return result;
  };
  const normalizedFieldSchema = (fieldName) => {
    return normalizedSchemaField('landsdel', fieldName);
  };
  const schema = globalSchemaObject({
    title: 'Landsdel',
    properties: Object.assign({
      href: Object.assign({}, commonSchemaDefinitions.Href, {description: 'Landsdelens URL'}),
      dagi_id: normalizedFieldSchema('dagi_id'),
      navn: normalizedFieldSchema('navn'),
      nuts3: normalizedFieldSchema('nuts3'),
      region: nullable(Object.assign({},
        commonSchemaDefinitions.RegionsRef,
        {description: 'Den region, som landsdelen ligger i.'})),
    }, commonGeoProps),
    docOrder: ['href', 'dagi_id', 'ændret', 'geo_version', 'geo_ændret', 'bbox', 'visueltcenter', 'navn',
      'nuts3', 'region']
  });
  return {fields, mapper, schema};
})();


const jsonRepresentations = {
  kommune: kommuneJsonRepresentation,
  opstillingskreds: opstillingskredsJsonRepresentation,
  afstemningsområde: afstemningsområdeJsonRepresentation,
  storkreds: storkredsJsonRepresentation,
  menighedsrådsafstemningsområde: mrAfstemningsområdeRepresentation,
  supplerendebynavn: supplerendebynavnRepresentation,
  landsdel: landsdelsRepresentation
};

function schemaForFlatFields(model, excludedFieldNames) {
  var result = {
    title: model.singular,
    properties: Object.assign({
      'href': {
        description: model.singularSpecific + 's unikke URL.',
        $ref: '#/definitions/Href'
      },

    }, commonGeoProps),
    docOrder: ['href', 'ændret', 'geo_ændret', 'geo_version', 'bbox', 'visueltcenter']
  };

  model.fields.filter(function (additionalField) {
    return !_.contains(excludedFieldNames, additionalField.name);
  }).forEach(function (fieldSpec) {
    result.properties[fieldSpec.name] = _.clone(fieldSpec.schema);
    result.properties[fieldSpec.name].description = fieldSpec.description;
    result.docOrder.push(fieldSpec.name);
  });
  return result;
}


// postnumre, zoner eksporteres ikke
temaModels.modelList.filter(model => model.published).forEach(model => {
  const fields = fieldMap[model.singular];
  var representations = {};
  var fieldsExcludedFromFlat = ['geom_json'];
  var flatFields = representationUtil.fieldsWithoutNames(fields, fieldsExcludedFromFlat);

  representations.flat = representationUtil.defaultFlatRepresentation(flatFields);

  representations.mini = representationUtil.miniRepresentation(
    [...miniFieldNames[model.singular], 'bbox_xmin', 'bbox_ymin', 'bbox_xmax', 'bbox_ymax'],
    fields,
    null,
    makeHrefFormatter(model),
    miniBetegnelse[model.singular]);

  if(miniFieldsNotInOutput[model.singular]) {
    representations.mini.outputFields = representations.mini.outputFields.filter(
      fieldName => !miniFieldsNotInOutput[model.singular].includes(fieldName));
  }
  function jsonSchema() {
    return schemaForFlatFields(model, []);
  }


  function dagiTemaJsonMapper() {
    return function (baseUrl) {
      return function (row) {
        const result = mapMetaFields(row);
        model.fields.forEach(function (fieldSpec) {
          result[fieldSpec.name] = fieldSpec.formatter(row[fieldSpec.name]);
        });


        result.ændret = row.ændret;
        result.geo_version = row.geo_version;
        result.geo_ændret = row.geo_ændret;
        result.href = makeHrefFromPath(baseUrl, model.plural, _.map(model.primaryKey, function (keyName) {
          return result[keyName];
        }));

        return result;
      };
    };
  }

  function dagiAutocompleteSchema() {
    var properties = {
      tekst: {
        description: autocompleteTekst[model.singular].description(model),
        type: 'string'
      }
    };
    properties[model.singular] = jsonSchema();
    return globalSchemaObject({
      properties: properties,
      docOrder: ['tekst', model.singular]
    });
  }

  function dagiTemaAutocompleteMapper() {
    return function (baseUrl) {
      var dagiTemaMapper = representations.json.mapper(baseUrl);
      return function (row) {
        var result = {
          tekst: autocompleteTekst[model.singular].mapper(row)
        };
        result[model.singular] = dagiTemaMapper(row);
        return result;
      };
    };
  }

  const defaultJsonRepresentation = {
    // geomentry for the (huge) DAGI temaer is only returned in geojson format.
    fields: representationUtil.fieldsWithoutNames(fields, ['geom_json']),
    schema: globalSchemaObject(jsonSchema()),
    mapper: dagiTemaJsonMapper(model.primaryKey)
  };
  representations.json = jsonRepresentations[model.singular] || defaultJsonRepresentation;
  if (model.searchable) {
    representations.autocomplete = {
      fields: representations.json.fields,
      schema: globalSchemaObject(dagiAutocompleteSchema()),
      mapper: dagiTemaAutocompleteMapper()
    };
  }
  const geojsonField = _.findWhere(fields, {name: 'geom_json'});
  representationUtil.addGeojsonRepresentations(representations, geojsonField);
  exports[model.singular] = representations;

  registry.addMultiple(model.singular, 'representation', module.exports[model.singular]);
});