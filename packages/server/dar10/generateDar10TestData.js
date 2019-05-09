"use strict";

const { go } = require('ts-csp');
const fs = require('fs');
const path = require('path');
const _ = require('underscore');

const runConfigured = require('@dawadk/common/src/cli/run-configured');
const promisingStreamCombiner = require('@dawadk/import-util/src/promising-stream-combiner');
const {readNdjson, writeNdjson} = require('../importUtil/ndjson');

const csvParse = require('csv-parse');

const schema = {
  dst: {
    format: 'string',
    doc: 'Where to place test data',
    default: 'test/data/dar10',
    cli: true
  },
  address_subset: {
    format: 'string',
    doc: 'CSV file containing ids of addresses to include in subset',
    default: 'test/data_subsets/dar_adresse_subset.csv',
    cli: true
  },
  src: {
    format: 'string',
    doc: 'Folder with NDJSON files',
    cli: true,
    default: null,
    required: true
  },
};

runConfigured(schema, [], config => go(function* () {
  const addressIds = new Set();

  const csvParser = csvParse({
    columns: true
  });

  csvParser.on('data', (row) => addressIds.add(row.bkid));
  yield promisingStreamCombiner([
    fs.createReadStream(config.get('address_subset')),
    csvParser
  ]);

  const addresses = yield readNdjson(path.join(config.get('src'), 'Adresse.ndjson'),
    row => addressIds.has(row.id));
  const husnummerIds = new Set(addresses.map(address => address.husnummer_id));
  const husnumre = yield readNdjson(path.join(config.get('src'), 'Husnummer.ndjson'),
    row => husnummerIds.has(row.id));

  const adressepunktIds = new Set(husnumre.map(husnummer => husnummer.adgangspunkt_id)
    .concat(husnumre.map(husnummer => husnummer.vejpunkt_id)));

  const adressepunkter = yield readNdjson(path.join(config.get('src'), 'Adressepunkt.ndjson'),
    row => adressepunktIds.has(row.id));

  const kommuneIds = new Set(husnumre.map(husnummer => husnummer.darkommune_id));
  const darKommuner = yield readNdjson(path.join(config.get('src'), 'DARKommuneinddeling.ndjson'),
    row => kommuneIds.has(row.id));
  const navngivenVejIds = new Set(husnumre.map(husnummer => husnummer.navngivenvej_id));
  const navngivneVeje = yield readNdjson(path.join(config.get('src'), 'NavngivenVej.ndjson'),
    row => navngivenVejIds.has(row.id));
  const navngivenVejKommunedele = yield readNdjson(path.join(config.get('src'), 'NavngivenVejKommunedel.ndjson'),
    row => navngivenVejIds.has(row.navngivenvej_id));

  const postnummerIds = new Set(husnumre.map(husnummer => husnummer.postnummer_id));
  const postnumre = yield readNdjson(path.join(config.get('src'), 'Postnummer.ndjson'),
    row => postnummerIds.has(row.id));

  const supplerendeBynavnIds = new Set(husnumre.map(husnummer => husnummer.supplerendebynavn_id));
  const supplerendeBynavne = yield readNdjson(path.join(config.get('src'), 'SupplerendeBynavn.ndjson'),
    row => supplerendeBynavnIds.has(row.id));

  const darAfstemningsområdeIds = new Set(husnumre.map(husnummer => husnummer.darafstemningsområde_id));
  const darAfstemningsområder = yield readNdjson(path.join(config.get('src'), 'DARAfstemningsomraade.ndjson'),
    row => darAfstemningsområdeIds.has(row.id));

  const sogneIds = new Set(husnumre.map(husnummer => husnummer.darsogneinddeling_id));
  const sogne = yield readNdjson(path.join(config.get('src'), 'DARSogneinddeling.ndjson'),
    row => sogneIds.has(row.id));

  const darMenighedsrådsafstemingsområdeIds = new Set(husnumre.map(husnummer => husnummer.darmenighedsrådsafstemningsområde_id));
  const darMenighedsrådsafstemingsområder = yield readNdjson(path.join(config.get('src'), 'DARMenighedsraadsafstemningsomraade.ndjson'),
    row => darMenighedsrådsafstemingsområdeIds.has(row.id));

  const navngivenVejPostnummerRelationer = yield readNdjson(path.join(config.get('src'), 'NavngivenVejPostnummerRelation.ndjson'),
    row => navngivenVejIds.has(row.navngivenvej_id) || postnummerIds.has(row.postnummer_id));

  const navngivenVejSupplerendebynavnRelationer = yield readNdjson(path.join(config.get('src'), 'NavngivenVejSupplerendeBynavnRelation.ndjson'),
    row => navngivenVejIds.has(row.navngivenvej_id) || supplerendeBynavnIds.has(row.supplerendebynavn_id));

  for (let [arr, filename] of [
    [adressepunkter, 'AdressePunkt.ndjson'],
    [addresses, 'Adresse.ndjson'],
    [husnumre, 'Husnummer.ndjson'],
    [darKommuner, 'DARKommuneinddeling.ndjson'],
    [navngivneVeje, 'NavngivenVej.ndjson'],
    [navngivenVejKommunedele, 'NavngivenVejKommunedel.ndjson'],
    [postnumre, 'Postnummer.ndjson'],
    [supplerendeBynavne, 'SupplerendeBynavn.ndjson'],
    [darAfstemningsområder, 'DARAfstemningsomraade.ndjson'],
    [darMenighedsrådsafstemingsområder, 'DARMenighedsraadsafstemningsomraade.ndjson'],
    [navngivenVejPostnummerRelationer, 'NavngivenVejPostnummerRelation.ndjson'],
    [navngivenVejSupplerendebynavnRelationer, 'NavngivenVejSupplerendeBynavnRelation.ndjson'],
    [sogne, 'DARSogneinddeling.ndjson']
  ]) {
    const sorted = _.sortBy(arr, 'id');
    writeNdjson(path.join(config.get('dst'), filename), sorted);
  }
}));
