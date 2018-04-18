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

const transformGeometry = (wktText) => {
  if(!wktText) {
    return null;
  }
  if(wktText.indexOf('EMPTY') !== -1) {
    return null;
  }
  return `SRID=25832;${wktText}`;
};

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
  NavngivenVej: {
    administreresafkommune: parseInteger,
    vejnavnebeliggenhed_vejnavnelinje: transformGeometry,
    vejnavnebeliggenhed_vejnavneområde: transformGeometry,
    vejnavnebeliggenhed_vejtilslutningspunkter: transformGeometry
  },
  NavngivenVejKommunedel: {
    kommune: parseInteger,
    vejkode: parseInteger
  },
  DARKommuneinddeling: {
    kommunekode: parseInteger,
    kommuneinddeling: parseInteger
  },
  Postnummer: {
    postnr: parseInteger,
    postnummerinddeling: parseInteger
  },
  DARSogneinddeling: {
    sogneinddeling: parseInteger,
    sognekode: parseInteger
  },
  DARMenighedsrådsafstemningsområde: {
    mrafstemningsområde: parseInteger,
    mrafstemningsområdenummer: parseInteger
  },
  DARAfstemningsområde: {
    afstemningsområde: parseInteger,
    afstemningsområdenummer: parseInteger
  },
  SupplerendeBynavn: {
    supplerendebynavn1: parseInteger
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
  NavngivenVej: {
    administreresafkommune: 'smallint',
    vejnavnebeliggenhed_vejnavnelinje: 'geometry(geometry, 25832)',
    vejnavnebeliggenhed_vejnavneområde: 'geometry(geometry, 25832)',
    vejnavnebeliggenhed_vejtilslutningspunkter: 'geometry(geometry, 25832)'
  },
  NavngivenVejKommunedel: {
    kommune: 'smallint',
    vejkode: 'smallint'
  },
  DARKommuneinddeling: {
    kommunekode: 'smallint',
    kommuneinddeling: 'integer'
  },
  DARSogneinddeling: {
    sogneinddeling: 'integer',
    sognekode: 'smallint'
  },
  Postnummer: {
    postnr: 'smallint',
    postnummerinddeling: 'integer'
  },
  DARMenighedsrådsafstemningsområde: {
    mrafstemningsområde: 'integer',
    mrafstemningsområdenummer: 'smallint'
  },
  DARAfstemningsområde: {
    afstemningsområde: 'integer',
    afstemningsområdenummer: 'smallint'
  },
  SupplerendeBynavn: {
    supplerendebynavn1: 'integer'
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
  ],
  SupplerendeBynavn: [['supplerendebynavn1']],
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


