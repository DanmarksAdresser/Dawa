"use strict";

const ajv = require('ajv')();
const fs = require('fs');
const path = require('path');
const wkt = require('terraformer-wkt-parser');

const husnrUtil = require('../apiSpecification/husnrUtil');
const _ = require('underscore');

const parseHusnr = husnrUtil.parseHusnr;

const udtrækDir = path.join(__dirname, 'schemas', 'Udtræk')
const files = fs.readdirSync(udtrækDir).map(file => file.normalize());
const entityNames = files.map(fileName => fileName.substring(0, fileName.length - '.json'.length));
const schemaStrings = entityNames.reduce((memo, entityName) => {
  memo[entityName] = fs.readFileSync(path.join(udtrækDir, entityName + '.json'));
  return memo;
}, {});

const schemas = _.mapObject(schemaStrings, JSON.parse);
const validateFns = _.mapObject(schemas, schema => ajv.compile(schema));

function parseInteger(tekst) {
  return parseInt(tekst, 10);
}

/**
 * Some fields needs to be transformed before storing in Postgres.
 */
const fieldTransforms = {
  Adressepunkt: {
    position: wktText => {
      if(!wktText) {
        return null;
      }
      if(wktText === 'POINT EMPTY') {
        return null;
      }
      const coordinates = wkt.parse(wktText).coordinates;
      return `SRID=25832;POINT(${coordinates[0]} ${coordinates[1]})`;
    }
  },
  Husnummer: {
    husnummertekst: parseHusnr,
    husnummerretning: wktText => {
      if(!wktText) {
        return null;
      }
      if(wktText === 'POINT EMPTY') {
        return null;
      }
      const coordinates = wkt.parse(wktText).coordinates;
      return `SRID=25832;POINT(${coordinates[0]} ${coordinates[1]})`;
    },
    supplerendebynavn_id: uuid => {
      if(uuid === '00000000-0000-0000-0000-000000000000') {
        return null;
      }
      return uuid;
    }
  },
  NavngivenVejKommunedel: {
    kommune: parseInteger,
    vejkode: parseInteger
  },
  DARKommuneinddeling: {
    kommunekode: parseInteger
  },
  Postnummer: {
    postnr: parseInteger
  }

};

/**
 * SQL type overrides.
 */
const sqlTypes = {
  Adressepunkt: {
    position: 'geometry(Point,25832)'
  },
  Adresse: {
    fk_bbr_bygning_bygning: 'uuid'
  },
  Husnummer: {
    husnummertekst: 'husnr',
    husnummerretning: 'geometry(Point,25832)',
    fk_bbr_bygning_adgangtilbygning: 'uuid',
    fk_bbr_tekniskanlæg_adgangtiltekniskanlæg: 'uuid'

  },
  NavngivenVejKommunedel: {
    kommune: 'smallint',
    vejkode: 'smallint'
  },
  DARKommuneinddeling: {
    kommunekode: 'smallint'
  },
  Postnummer: {
    postnr: 'smallint'
  }
};

const sqlIndicesHistory = {
  Husnummer: [
    // needed for computing 'oprettet'
    ['id']
  ],
  Adresse: [
    // needed for computing 'oprettet'
    ['id']
  ],
  NavngivenVej: [
  // needed for computing 'oprettet'
    ['id']
]
};

const sqlIndices = {
  Husnummer: [
    ['adgangspunkt_id'],
    ['darafstemningsområde_id'],
    ['darkommune_id'],
    ['darmenighedsrådsafstemningsområde_id'],
    ['darsogneinddeling_id'],
    ['navngivenvej_id'],
    ['postnummer_id'],
    ['supplerendebynavn_id'],
    ['vejpunkt_id']
  ],
  NavngivenVejKommunedel: [
    ['navngivenvej_id'],
    // needed for finding entity from husnummer properties
    ['kommune', 'navngivenvej_id']
  ],
  DARKommuneInddeling: [
    ['kommunekode', 'id']
  ],
  Adresse: [
    ['husnummer_id']
  ],
  NavngivenVejPostnummerRelation: [
    ['navngivenvej_id', 'postnummer_id']
  ],
  Postnummer: [
    ['postnr', 'id']
  ]
};

module.exports = {
  entities: Object.keys(schemas),
  schemas: schemas,
  validateFns: validateFns,
  fieldTransforms: fieldTransforms,
  sqlTypes: sqlTypes,
  sqlIndices: sqlIndices,
  sqlIndicesHistory: sqlIndicesHistory
};


