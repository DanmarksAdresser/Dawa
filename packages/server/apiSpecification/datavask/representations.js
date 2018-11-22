"use strict";

var commonMappers = require('../commonMappers');
var commonSchemaDefinitionsUtil = require('../commonSchemaDefinitionsUtil');
var registry = require('../registry');
var schemaUtil = require('../schemaUtil');

var globalSchemaObject = commonSchemaDefinitionsUtil.globalSchemaObject;
var makeHref = commonMappers.makeHref;
var schemaObject = schemaUtil.schemaObject;


function createResponseMapper(adgangsadresseOnly) {
  return function (baseUrl) {
    return function(row) {
      // we just set a href on the current address. The rest happens in sqlModel
      row.resultater.forEach((item) => {
        if(item.aktueladresse && (item.aktueladresse.status === 1 || item.aktueladresse.status === 3)) {
          item.aktueladresse.href = makeHref(
            baseUrl,
            adgangsadresseOnly ? 'adgangsadresse' : 'adresse',
            [item.aktueladresse.id]);
        }
      });
      return row;
    }
  }
}

['adgangsadresse', 'adresse'].forEach((entityName) => {
  exports[entityName] = {
    json: {
      fields: [],
      mapper: createResponseMapper(entityName === 'adgangsadresse'),
      schema: globalSchemaObject({
        properties: {
          kategori: {
            description: 'Angiver, hvor godt de(n) returnerede adresse(r) matcher adressebetegnelsen. "A" angiver, at den returnerede adresse matcher præcist, bortset fra forskelle på store og små bogstaver samt punktuering. ' +
            '"B" angiver et sikkert match, hvor der dog er mindre variationer (stavefejl eller lignende). C angiver et usikkert match, ' +
            ' hvor der er en stor sansynlighed for at den fundne adresse ikke er korrekt. For kategori A og B gælder, at der kun ' +
            'returneres én adresse. For kategori C kan der returneres flere adresser.',
            enum: ['A', 'B', 'C']
          },
          resultater: {
            description: 'En liste af de adresser, som bedst matcher adressebetegnelsen, samt information om hvordan hver enkelt adresse matcher.' +
            ' Listen er ordnet efter hvor godt de matcher adressebetegnelsen med den bedst matchende adresse først.',
            type: 'array',
            items: schemaObject({
              properties: {
                adresse: {
                  description: 'Den (muligvis historiske) adresse, som matchede adressebetegnelsen',
                  type: 'object'
                },
                aktueladresse: {
                  description: 'Den aktuelle version af den adresse, som matchede adressebetegnelsen. Bemærk, at adressen' +
                  ' kan være nedlagt (statuskode 2 eller 4).',
                  type: 'object'
                },
                vaskeresultat: schemaObject({
                  description: 'Information om hvordan adressebetegnelsen matchede den fundne adresse',
                  properties: {
                    afstand: {
                      description: 'Levenshtein afstanden mellem adressebetegnelsen og den fundne adresses adressebetegnelse',
                      type: 'integer'
                    },
                    parsetadresse: {
                      description: 'En angivelse af, hvordan adressebetegnelsen blev parset til en struktureret adresse',
                      type: 'object'
                    },
                    forskelle: {
                      description: 'Levenshtein afstand mellem hvert felt i den parsede adresse og den fundne adresse',
                      type: 'object'
                    },
                    ukendtetokens: {
                      description: 'En liste over de tokens i adressebetegnelsen, som ikke kunne knyttes til en del af den fundne adresse',
                      type: 'array',
                      items: {
                        description: 'Den ukendte token',
                        type: 'string'
                      }
                    }
                  },
                  docOrder: ['afstand', 'parsetadresse', 'forskelle', 'ukendtetokens']
                })
              },
              docOrder: ['adresse', 'aktueladresse', 'vaskeresultat']
            })
          }
        },
        docOrder: ['kategori', 'resultater']
     })
    }
  };

  registry.addMultiple(`${entityName}_datavask`, 'representation', exports[entityName]);
});

