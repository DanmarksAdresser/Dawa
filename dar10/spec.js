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
      const coordinates = wkt.parse(wktText).coordinates;
      let resultGons = (Math.atan(coordinates[1]/coordinates[0])) * 400 / (2*Math.PI);
      if(resultGons < 0) {
        resultGons = resultGons + 400;
      }
      return resultGons.toFixed(2);
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

const sqlTypes = {
  Adressepunkt: {
    position: 'geometry(Point,25832)'
  },
  Husnummer: {
    husnummertekst: 'husnr',
    husnummerretning: 'float4'
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



module.exports = {
  schemas: schemas,
  validateFns: validateFns,
  fieldTransforms: fieldTransforms,
  sqlTypes: sqlTypes
};


