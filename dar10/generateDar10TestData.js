"use strict";

const fs = require('fs');
const path = require('path');
const q = require('q');
const split2 = require('split2');
const _ = require('underscore');

const cliParameterParsing = require('../bbr/common/cliParameterParsing');
const promisingStreamCombiner = require('../promisingStreamCombiner');

const csvParse = require('csv-parse');

const optionSpec = {
  src: [false, 'Folder med NDJSON-filer', 'string'],
  dst: [false, 'Whether this is an initial import', 'string', 'test/data/dar10'],
  adressesubset: [false, 'File containing ids of adresses', 'string', 'test/data_subsets/dar_adresse_subset.csv']
};


function readNdjson(filePath, filterFn) {
  return q.async(function*() {
    let result = [];
    const inputStream = fs.createReadStream(filePath, {encoding: 'utf8'});
    const stream = inputStream.pipe(split2());
    stream.on('data', line => {
      const json = JSON.parse(line);
      if (filterFn(json)) {
        result.push(json);
      }
    });
    yield q.Promise((resolve, reject) => {
      stream.on('end', resolve);
      stream.on('error', reject);
    });
    return result;
  })();
}

function writeNdjson(filePath, arr) {
  return q.Promise((resolve, reject) => {
    const outputStream = fs.createWriteStream(filePath, {encoding: 'utf8'});
    for (let item of arr) {
      outputStream.write(JSON.stringify(item) + '\n');
    }
    outputStream.end();
    outputStream.on('finish', resolve);
  });
}

cliParameterParsing.main(optionSpec, _.keys(optionSpec), function (args, options) {
  q.async(function*() {

    const addressIds = new Set();

    const csvParser = csvParse({
      columns: true
    });

    csvParser.on('data', (row) => addressIds.add(row.bkid));
    yield promisingStreamCombiner([
      fs.createReadStream(options.adressesubset),
      csvParser
    ]);

    const addresses = yield readNdjson(path.join(options.src, 'Adresse.ndjson'),
      row => addressIds.has(row.id));
    const husnummerIds = new Set(addresses.map(address => address.husnummer_id));
    const husnumre = yield readNdjson(path.join(options.src, 'Husnummer.ndjson'),
      row => husnummerIds.has(row.id));

    const adressepunktIds = new Set(husnumre.map(husnummer=> husnummer.adgangspunkt_id)
      .concat(husnumre.map(husnummer => husnummer.vejpunkt_id)));

    const adressepunkter = yield readNdjson(path.join(options.src, 'Adressepunkt.ndjson'),
      row => adressepunktIds.has(row.id));

    const kommuneIds = new Set(husnumre.map(husnummer => husnummer.darkommune_id));
    const darKommuner = yield readNdjson(path.join(options.src, 'DARKommuneinddeling.ndjson'),
      row => kommuneIds.has(row.id));
    const navngivenVejIds = new Set(husnumre.map(husnummer => husnummer.navngivenvej_id));
    const navngivneVeje = yield readNdjson(path.join(options.src, 'NavngivenVej.ndjson'),
      row => navngivenVejIds.has(row.id));
    const navngivenVejKommunedele = yield readNdjson(path.join(options.src, 'NavngivenVejKommunedel.ndjson'),
      row => navngivenVejIds.has(row.navngivenvej_id));

    const postnummerIds = new Set(husnumre.map(husnummer => husnummer.postnummer_id));
    const postnumre = yield readNdjson(path.join(options.src, 'Postnummer.ndjson'),
      row => postnummerIds.has(row.id));

    const supplerendeBynavnIds = new Set(husnumre.map(husnummer => husnummer.supplerendebynavn_id));
    const supplerendeBynavne = yield readNdjson(path.join(options.src, 'SupplerendeBynavn.ndjson'),
      row => supplerendeBynavnIds.has(row.id));

    const darAfstemningsområdeIds = new Set(husnumre.map(husnummer => husnummer.darafstemningsområde_id));
    const darAfstemningsområder = yield readNdjson(path.join(options.src, 'DARAfstemningsomraade.ndjson'),
      row => darAfstemningsområdeIds.has(row.id));

    const sogneIds = new Set(husnumre.map(husnummer => husnummer.darsogneinddeling_id));
    const sogne = yield readNdjson(path.join(options.src, 'DARSogneinddeling.ndjson'),
      row => sogneIds.has(row.id));

    const darMenighedsrådsafstemingsområdeIds = new Set(husnumre.map(husnummer => husnummer.darmenighedsrådsafstemningsområde_id));
    const darMenighedsrådsafstemingsområder = yield readNdjson(path.join(options.src, 'DARMenighedsraadsafstemningsomraade.ndjson'),
      row => darMenighedsrådsafstemingsområdeIds.has(row.id));

    const navngivenVejPostnummerRelationer = yield readNdjson(path.join(options.src, 'NavngivenVejPostnummerRelation.ndjson'),
      row => navngivenVejIds.has(row.navngivenvej_id) || postnummerIds.has(row.postnummer_id));

    const navngivenVejSupplerendebynavnRelationer = yield readNdjson(path.join(options.src, 'NavngivenVejSupplerendeBynavnRelation.ndjson'),
      row => navngivenVejIds.has(row.navngivenvej_id) || supplerendeBynavnIds.has(row.supplerendebynavn_id));
    writeNdjson(path.join(options.dst, 'AdressePunkt.ndjson'), adressepunkter);
    writeNdjson(path.join(options.dst, 'Adresse.ndjson'), addresses);
    writeNdjson(path.join(options.dst, 'Husnummer.ndjson'), husnumre);
    writeNdjson(path.join(options.dst, 'DARKommuneinddeling.ndjson'), darKommuner);
    writeNdjson(path.join(options.dst, 'NavngivenVej.ndjson'), navngivneVeje);
    writeNdjson(path.join(options.dst, 'NavngivenVejKommunedel.ndjson'), navngivenVejKommunedele);
    writeNdjson(path.join(options.dst, 'Postnummer.ndjson'), postnumre);
    writeNdjson(path.join(options.dst, 'SupplerendeBynavn.ndjson'), supplerendeBynavne);
    writeNdjson(path.join(options.dst, 'DARAfstemningsomraade.ndjson'), darAfstemningsområder);
    writeNdjson(path.join(options.dst, 'DARMenighedsraadsafstemningsomraade.ndjson'), darMenighedsrådsafstemingsområder);
    writeNdjson(path.join(options.dst, 'NavngivenVejPostnummerRelation.ndjson'), navngivenVejPostnummerRelationer);
    writeNdjson(path.join(options.dst, 'NavngivenVejSupplerendeBynavnRelation.ndjson'), navngivenVejSupplerendebynavnRelationer);
    writeNdjson(path.join(options.dst, 'DARSogneinddeling.ndjson'), sogne);

  })().done();
});
