"use strict";

const ajv = require('ajv')();
const fs = require('fs');
const path = require('path');
const husnrUtil = require('../apiSpecification/husnrUtil');
const _ = require('underscore');

const parseHusnr = husnrUtil.parseHusnr;

const udtrækDir = path.join(__dirname, 'schemas', 'Udtræk')
const files = fs.readdirSync(udtrækDir);
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
  Husnummer: {
    husnummertekst: parseHusnr
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
    status: 'adresse_status'
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


