"use strict";

const chai = require('chai');
const _ = require('underscore');
const { go } = require('ts-csp');

const registry = require('../../apiSpecification/registry');
const schemaValid = require('../helpers/schema-valid');
const testdb = require('@dawadk/test-util/src/testdb');

const expect = chai.expect;
chai.use(schemaValid);

require('../../apiSpecification/allSpecs');
/**
 * This test verifies that all testdata is valid according to JSON schema
 * and that all fieldMap (except the ones specified in valuesNeverExpectedToBeSeen below)
 * is returned at least once.
 */

const valuesNeverExpectedToBeSeen = {
  json: {
    vejstykke: {
      historik: {
        ændret: true
      }
    },
    adresse: {
    },
    navngivenvej: {
      beskrivelse: true,
      beliggenhed: {
        vejtilslutningspunkter: {
          type: true,
          coordinates: true
        }
      },
      historik: {
        nedlagt: true
      }
    },
    bbr_bygning: {
      ejerlejlighed: true,
      byg071BevaringsværdighedReference: true,
      byg111StormrådetsOversvømmelsesSelvrisiko: true,
      byg112DatoForRegistreringFraStormrådet: true,
      byg123MedlemskabAfSpildevandsforsyning: true,
      byg124PåbudVedrSpildevandsafledning: true,
      byg125FristVedrSpildevandsafledning: true,
      byg126TilladelseTilUdtræden: true,
      byg127DatoForTilladelseTilUdtræden: true,
      byg128TilladelseTilAlternativBortskaffelseEllerAfledning: true,
      byg129DatoForTilladelseTilAlternativBortskaffelseEllerAfledning: true,
      byg131DispensationFritagelseIftKollektivVarmeforsyning: true,
      byg132DatoForDispensationFritagelseIftKollektivVarmeforsyning: true,
      byg137BanedanmarkBygværksnummer: true,
      byg140ServitutForUdlejningsEjendomDato: true,
      byg150Gulvbelægning: true,
      byg152ÅbenLukketKonstruktion: true,
      byg153Konstruktionsforhold: true,
      byg301TypeAfFlytning: true,
      byg403ØvrigeBemærkningerFraStormrådet: true
    },
    bbr_ejendomsrelation: {
      ejerlejlighed: true
    },
    bbr_enhed: {
      enh044DatoForDelvisIbrugtagningsTilladelse: true,
      enh053SupplerendeVarme: true,
      enh068FlexboligTilladelsesart: true,
      enh069FlexboligOphørsdato: true,
      enh105SupplerendeAnvendelseskode1: true,
      enh106SupplerendeAnvendelseskode2: true,
      enh107SupplerendeAnvendelseskode3: true
    },
    bbr_etage: {
      eta500Notatlinjer: true
    },
    bbr_fordelingaffordelingsareal: {
      status: true
    },
    bbr_grund: {
      gru026DatoForTilladelseTilUdtræden: true,
      gru028DatoForTilladelseTilAlternativBortskaffelseEllerAfledning: true,
      gru029DispensationFritagelseIftKollektivVarmeforsyning: true,
      gru030DatoForDispensationFritagelseIftKollektivVarmeforsyning: true
    },
    bbr_opgang: {
      opg500Notatlinjer: true
    },
    bbr_tekniskanlæg: {
      enhed: true,
      ejerlejlighed: true,
      tek022EksternDatabase: true,
      tek023EksternNøgle: true,
      tek040Fredning: true,
      tek070DatoForSenestUdførteSupplerendeIndvendigKorrosionsbeskyttelse: true,
      tek101Gyldighedsdato: true,
      tek102FabrikatVindmølle: true,
      tek103FabrikatOliefyr: true,
      tek104FabrikatSolcelleanlægSolvarme: true,
      tek105OverdækningTank: true,
      tek106InspektionsdatoTank: true,
      tek111DatoForSenesteInspektion: true,
      tek112InspicerendeVirksomhed: true
    },
    bbr_bygningpåfremmedgrund: {
      status: true
    },
    bbr_enhedejerlejlighed: {
      status: true
    },
    bbr_grundjordstykke: {
      status: true
    }
  },
  flat: {},
  mini: {}
};

function hasType(schema, type) {
  return schema.type === type || (_.isArray(schema.type) && schema.type.indexOf(type) !== -1);
}

function recordVisitedValues(json, schema, record) {
  _.each(schema.properties, function(typeDef, key) {
    if(json[key] !== undefined && json[key] !== null) {
      if(hasType(typeDef, 'object')) {
        record[key] = record[key] || {};
        recordVisitedValues(json[key],typeDef, record[key]);
      }
      else if(hasType(typeDef, 'array')) {
        record[key] = record[key] || {};
        _.each(json[key], function(json) {
          recordVisitedValues(json,typeDef.items, record[key]);
        });
      }
      else {
        record[key] = true;
      }
    }
  });
}

function verifyAllValuesVisited(schema, record, prefix) {
  prefix = prefix || '';
  return _.reduce(schema.properties, function(memo, typeDef, key) {
    const keyPath = prefix + '.' + key;
    if(record[key] === undefined) {
      /*eslint no-console: 0 */
      console.log('KEY NOT SEEN: ' + key);
      return false;
    }
    if(hasType(typeDef, 'object')) {
      return memo && verifyAllValuesVisited(typeDef, record[key], keyPath);
    }
    if(hasType(typeDef, 'array')) {
      return memo && verifyAllValuesVisited(typeDef.items, record[key], keyPath);
    }
    return memo;
  }, true);
}

describe('Validering af JSON-formatteret output', function() {
    for(let qualifier of ['json', 'flat', 'mini']) {
      const representationEntries = registry.entriesWhere({
        type: 'representation',
        qualifier
      });
      for(let representationEntry of representationEntries) {
        const representation = representationEntry.object;
        const entityName = representationEntry.entityName;
        console.log(`${qualifier} ${entityName}`);
        const sqlModel = registry.findWhere({
          entityName,
          type: 'sqlModel'
        });
        if(!representation) {
          continue;
        }
        if(!sqlModel) {
          continue;
        }
        if(!sqlModel.processQuery) {
          continue;
        }
        const mapper = representation.mapper('BASE_URL', {});
        const schema = representation.schema;
        if(!schema) {
          if(qualifier === 'json') {
            console.log(`No schema for ${entityName}`);
          }
          continue;
        }
        it(`Alle ${entityName} for representation ${qualifier} skal validere`, function() {
          return testdb.withTransaction('test', 'READ_ONLY', client => go(function*() {
            const rows = yield sqlModel.processQuery(client, _.pluck(representation.fields, 'name'), {});
            rows.forEach(function(row) {
              const json = mapper(row);
              expect(json).to.be.schemaValid(schema);
            });
          }));
        });
        it(`Alle felter i ${entityName} skal ses mindst en gang`, function() {
          const schema = representation.schema;
          const valuesSeen = valuesNeverExpectedToBeSeen[qualifier][entityName] || {};
          return testdb.withTransaction('test', 'READ_ONLY', client => go(function*() {
            const rows = yield sqlModel.processQuery(client, _.pluck(representation.fields, 'name'), {medtagnedlagte: true});
            rows.forEach(function (row) {
              const json = mapper(row);
              recordVisitedValues(json, schema, valuesSeen);
            });
            expect(verifyAllValuesVisited(schema, valuesSeen)).to.equal(true);
          }));
        });
      }
    }
});
