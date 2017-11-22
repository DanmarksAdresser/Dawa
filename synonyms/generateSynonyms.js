"use strict";

const {go} = require('ts-csp');
const _ = require('underscore');
const fs = require('fs');

const {runImporter} = require('../importUtil/runImporter');
const proddb = require('../psql/proddb');

const optionSpec = {
  pgConnectionUrl: [false, 'URL som anvendes ved forbindelse til databasen', 'string'],
  file: [false, 'Output-fil med synonymordbog', 'string'],
  additionalFile: [false, 'Fil med yderligere synonymer', 'string', 'psql/dictionaries/adresser_xsyn.rules']
};

const union = function (setA, setB) {
  const result = new Set(setA);
  for (let elem of setB) {
    result.add(elem);
  }
  return result;
};


const applyReplacement = (synmap, vejnavn, regex, r2) => {
  if (regex.test(vejnavn)) {
    const synonym = vejnavn.replace(regex, `$1${r2}$2`);
    const synonymVal = synmap.get(synonym) || new Set([synonym]);
    const merged = union(synonymVal, synmap.get(vejnavn));
    for (let s of merged) {
      synmap.set(s, merged);
    }
  }
};

const preprocessReplacements =
  [['\\.', ' '],
    ['\\-', ' '],
    ['\\/', ' '],
    ['\\(', ' '],
    ['\\)', ' '],
    ["'", ' '],
    ['\\,', ' '],
    ['ä', 'a'],
    ['ÿ', 'y'],
    ['ó', 'o'],
    ['ö', 'o'],
    ['ü', 'u'],
    ['é', 'e'],
    ['è', 'e'],
    ['ë', 'e'],
    ['x', 'ks'],
    ['æ', 'ae'],
    ['ø', 'oe'],
    ['å', 'aa']];

runImporter('generate-synonyms', optionSpec, _.keys(optionSpec), function (args, options) {
  proddb.init({
    connString: options.pgConnectionUrl,
    pooled: false
  });

  return proddb.withTransaction('READ_ONLY', client => go(function* () {
    const vejnavne = (yield client.queryRows('SELECT distinct vejnavn FROM vejstykker')).map(row => row.vejnavn);
    const vejnavnTokens = new Set();
    for (let vejnavn of vejnavne) {
      const processedVejnavn = preprocessReplacements.reduce(
        (processedVejnavn, [ch, replacement]) => {
          return processedVejnavn.replace(new RegExp(ch, 'g'), replacement);

        }, vejnavn.toLowerCase());
      const tokens = processedVejnavn.split(' ').filter(token => token !== '');
      for (let token of tokens) {
        vejnavnTokens.add(token);
      }
    }
    const synmap = new Map();
    for (let token of vejnavnTokens) {
      synmap.set(token, new Set([token]));
    }
    const replacements =
      [["gren", "green", true],
        ["sten", "steen", true],
        ['oester', 'oestre', true],
        ['vester', 'vestre', true],
        ['kaer', 'kjaer', true],
        ['dal', 'dahl', true],
        ['thor', 'tor', true],
        ['scho', 'sko', true],
        ['scho', 'sjo', true],
        ['schr', 'skr', true],
        ['schm', 'sm', false],
        ['schn', 'sn', false],
        ['schw', 'sw', true],
        ['schw', 'sv', false],
        ['qui', 'kvi', true]];
    for (let [r1, r2, inverse] of replacements) {
      const regex1 = new RegExp(`(.*)${r1}(.*)`);
      const regex2 = new RegExp(`(.*)${r2}(.*)`);
      for (let token of synmap.keys()) {
        applyReplacement(synmap, token, regex1, r2);
        if(inverse) {
          applyReplacement(synmap, token, regex2, r1);
        }
      }
    }
    const synGroups = new Set();
    for (let token of vejnavnTokens) {
      const syns = synmap.get(token);
      if (syns.size > 1) {
        synGroups.add(syns);
      }
    }
    const writeStream = fs.createWriteStream(options.file);
    for (let synGroup of synGroups) {
      const line = Array.from(synGroup).join(' ');
      writeStream.write(line + '\n');
    }
    const additionalStream = fs.createReadStream(options.additionalFile);
    additionalStream.pipe(writeStream);
  }));
});
