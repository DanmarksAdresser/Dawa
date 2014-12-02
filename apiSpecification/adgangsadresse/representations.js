"use strict";

var _ = require('underscore');

var temaNameAndKeys = require('../temaer/namesAndKeys');
var representationUtil = require('../common/representationUtil');
var fields = require('./fields');
var commonMappers = require('../commonMappers');
var commonSchemaDefinitionsUtil = require('../commonSchemaDefinitionsUtil');
var schemaUtil = require('../schemaUtil');
var util = require('../util');

var adressebetegnelse = util.adressebetegnelse;
var schemaObject = schemaUtil.schemaObject;
var globalSchemaObject = commonSchemaDefinitionsUtil.globalSchemaObject;
var makeHref = commonMappers.makeHref;
var mapPostnummerRef = commonMappers.mapPostnummerRef;
var mapKommuneRef = commonMappers.mapKommuneRef;
var d = util.d;

var maybeNull = util.maybeNull;

var normalizedFieldSchemas = require('../replikering/normalizedFieldSchemas');
var normalizedFieldSchema = function(fieldName) {
  return normalizedFieldSchemas.normalizedSchemaField('adgangsadresse', fieldName);
};

var nullableType = schemaUtil.nullableType;
var kode4String = require('../util').kode4String;
var kvhFormat = require('./kvhTransformer').format;
var kvhFieldsDts = require('./kvhTransformer').kvhFieldsDts;

  /*
   * flat format
   */
exports.flat = representationUtil.adresseFlatRepresentation(fields);

exports.json = {
  fields: _.where(fields, {selectable: true}),
  schema: globalSchemaObject({
    title: 'Adgangsadresse',
    properties: {
      href: {
        description: 'Adgangsadressens URL.',
        $ref: '#/definitions/Href'
      },
      'id'     : normalizedFieldSchema('id'),
      status: normalizedFieldSchema('status'),
      'vejstykke'    : {
        description: 'Vejstykket som adressen er knyttet til.',
        $ref: '#/definitions/VejstykkeKodeOgNavn'
      },
      'husnr'  : normalizedFieldSchema('husnr'),
      'supplerendebynavn': normalizedFieldSchema('supplerendebynavn'),
      'postnummer': {
        description: 'Postnummeret som adressen er beliggende i.',
        $ref: '#/definitions/NullablePostnummerRef'
      },
      'kommune':{
        description: 'Kommunen som adressen er beliggende i.',
        $ref: '#/definitions/KommuneRef'
      },
      'ejerlav': schemaObject({
        description: 'Det matrikulære ejerlav som adressen ligger i.',
        nullable: true,
        properties: {
          'kode': normalizedFieldSchema('ejerlavkode'),
          'navn': {
            description: 'Det matrikulære ”ejerlav”s navn. Eksempel: ”Eskebjerg By, Bregninge”.',
            type: 'string'
          }
        },
        docOrder: ['kode', 'navn']
      }),
      'matrikelnr': normalizedFieldSchema('matrikelnr'),
      'esrejendomsnr': normalizedFieldSchema('esrejendomsnr'),
      'historik' : schemaObject({
        'description': 'Væsentlige tidspunkter for adgangsadressen',
        properties: {
          'oprettet': normalizedFieldSchema('oprettet'),
          'ændret': normalizedFieldSchema('ændret')
        },
        docOrder: ['oprettet', 'ændret']

      }),
      'adgangspunkt': schemaObject({
        description: 'Geografisk punkt, som angiver særskilt adgang fra navngiven vej ind på et areal eller bygning.',
        properties: {
          koordinater: {
            description: 'Adgangspunktets koordinater som array [x,y].',
            $ref: '#/definitions/NullableGeoJsonCoordinates'
          },
          nøjagtighed: normalizedFieldSchema('nøjagtighed'),
          kilde: normalizedFieldSchema('kilde'),
          tekniskstandard: normalizedFieldSchema('tekniskstandard'),
          tekstretning: normalizedFieldSchema('tekstretning'),
          ændret: normalizedFieldSchema('adressepunktændringsdato')
        },
        docOrder: ['koordinater','nøjagtighed','kilde', 'tekniskstandard','tekstretning', 'ændret']
      }),
      'DDKN': schemaObject({
        nullable: true,
        description: 'Adressens placering i Det Danske Kvadratnet (DDKN).',
        properties: {
          'm100': normalizedFieldSchema('ddkn_m100'),
          'km1' : normalizedFieldSchema('ddkn_km1'),
          'km10': normalizedFieldSchema('ddkn_km10')
        },
        docOrder: ['m100', 'km1', 'km10']
      }),
      'sogn': schemaObject({
        nullable: true,
        description: 'Sognet som adressen er beliggende i. Beregnes udfra adgangspunktet og sogneinddelingerne fra <a href="http://www.gst.dk/emner/frie-data/hvilke-data-er-omfattet/hvilke-data-er-frie/landinddelinger/danmarks-administrative-geografiske-inddelinger-(dagi)/">DAGI</a>',
        properties: {
          href: {
            description: 'Sognets unikke URL',
            type: 'string'
          },
          kode: {
            description: 'Identifikation af sognet',
            $ref: '#/definitions/Kode4'
          },
          navn: {
            description: 'Sognets navn',
            type: 'string'
          }
        },
        docOrder: ['href', 'kode', 'navn']
      }),
      'region': schemaObject({
        nullable: true,
        description: 'Regionen som adressen er beliggende i. Beregnes udfra adgangspunktet og regionsinddelingerne fra <a href="http://www.gst.dk/emner/frie-data/hvilke-data-er-omfattet/hvilke-data-er-frie/landinddelinger/danmarks-administrative-geografiske-inddelinger-(dagi)/">DAGI</a>',
        properties: {
          href: {
            description: 'Regionens unikke URL',
            type: 'string'
          },
          kode: {
            description: 'Identifikation af regionen',
            $ref: '#/definitions/Kode4'
          },
          navn: {
            description: 'Regionens navn',
            type: 'string'
          }
        },
        docOrder: ['href', 'kode', 'navn']
      }),
      'retskreds': schemaObject({
        nullable: true,
        description: 'Retskredsen som adressen er beliggende i. Beregnes udfra adgangspunktet og retskredsinddelingerne fra <a href="http://www.gst.dk/emner/frie-data/hvilke-data-er-omfattet/hvilke-data-er-frie/landinddelinger/danmarks-administrative-geografiske-inddelinger-(dagi)/">DAGI</a>',
        properties: {
          href: {
            description: 'Retskredsens unikke URL',
            type: 'string'
          },
          kode: {
            description: 'Identifikation af retskredsen',
            $ref: '#/definitions/Kode4'
          },
          navn: {
            description: 'Retskredsens navn',
            type: 'string'
          }
        },
        docOrder: ['href', 'kode', 'navn']
      }),
      'politikreds': schemaObject({
        nullable: true,
        description: 'Politikredsen som adressen er beliggende i. Beregnes udfra adgangspunktet og politikredsinddelingerne fra <a href="http://www.gst.dk/emner/frie-data/hvilke-data-er-omfattet/hvilke-data-er-frie/landinddelinger/danmarks-administrative-geografiske-inddelinger-(dagi)/">DAGI</a>',
        properties: {
          href: {
            description: 'Politikredsens unikke URL',
            type: 'string'
          },
          kode: {
            description: 'Identifikation af politikredsen',
            $ref: '#/definitions/Kode4'
          },
          navn: {
            description: 'Politikredsens navn',
            type: 'string'
          }
        },
        docOrder: ['href', 'kode', 'navn']
      }),
      'opstillingskreds': schemaObject({
        nullable: true,
        description: 'Opstillingskresen som adressen er beliggende i. Beregnes udfra adgangspunktet og opstillingskredsinddelingerne fra <a href="http://www.gst.dk/emner/frie-data/hvilke-data-er-omfattet/hvilke-data-er-frie/landinddelinger/danmarks-administrative-geografiske-inddelinger-(dagi)/">DAGI</a>',
        properties: {
          href: {
            description: 'Opstillingskredsens unikke URL',
            type: 'string'
          },
          kode: {
            description: 'Identifikation af opstillingskredsen.',
            $ref: '#/definitions/Kode4'
          },
          navn: {
            description: 'Opstillingskredsens navn.',
            type: 'string'
          }
        },
        docOrder: ['href', 'kode', 'navn']
      }),
      zone: {
        description: 'Hvilken zone adressen ligger i. "Byzone", "Sommerhusområde" eller "Landzone". Beregnes udfra adgangspunktet og zoneinddelingerne fra <a href="http://naturstyrelsen.dk/planlaegning/plansystemdk/services/wfs/">PlansystemDK</a>',
        enum: [null, 'Byzone', 'Sommerhusområde', 'Landzone']
      },
      kvh: {
        description: 'Sammensat nøgle for adgangsadressen. Indeholder til brug for integration til ældre systemer felter, der tilsammen identificerer adressen. Hvis det er muligt, bør adressens id eller href benyttes til identifikation.<br />' +
                     'KVH-nøglen er sammen således:' +
                     '<dl>' +
                      kvhFieldsDts +
                     '</dl>' +
                     'En adresse på vejstykke 1074 (Melvej) nummer 6 i kommune 420 (Assens) vil altså få KVH-nøgle "042010740006"',
        type: 'string'
      }
    },
    docOrder: ['href','id', 'kvh', 'status', 'vejstykke', 'husnr','supplerendebynavn',
      'postnummer','kommune', 'ejerlav', 'matrikelnr','esrejendomsnr', 'historik',
      'adgangspunkt', 'DDKN', 'sogn','region','retskreds','politikreds','opstillingskreds', 'zone']
  }),
  mapper: function (baseUrl){
    return function(rs) {
      function mapDagiTema(tema) {
        var result = _.clone(tema.fields);
        // this is a hack, and should be fixed.
        if(result.kode) {
          result.kode = kode4String(result.kode);
        }
        result.href = makeHref(baseUrl, tema.tema, [tema.fields[temaNameAndKeys[tema.tema].key[0]]]);
        return result;
      }
      var adr = {};
      adr.href = makeHref(baseUrl, 'adgangsadresse', [rs.id]);
      adr.id = rs.id;
      adr.kvh = kvhFormat(rs);
      adr.status = rs.status;
      adr.vejstykke = {
        href: makeHref(baseUrl, 'vejstykke', [rs.kommunekode, rs.vejkode]),
        navn: maybeNull(rs.vejnavn),
        kode: kode4String(rs.vejkode)
      };
      adr.husnr = rs.husnr;
      adr.supplerendebynavn = maybeNull(rs.supplerendebynavn);
      adr.postnummer = mapPostnummerRef({nr: rs.postnr, navn: rs.postnrnavn}, baseUrl);
      adr.kommune = mapKommuneRef({kode: rs.kommunekode, navn: rs.kommunenavn}, baseUrl);
      if(rs.ejerlavkode) {
        adr.ejerlav = {
          kode: rs.ejerlavkode,
          navn: rs.ejerlavnavn
        };
      }
      else {
        adr.ejerlav = null;
      }
      adr.esrejendomsnr = rs.esrejendomsnr ? "" + rs.esrejendomsnr : null;
      adr.matrikelnr = maybeNull(rs.matrikelnr);
      adr.historik = {
        oprettet: d(rs.oprettet),
        ændret: d(rs.ændret)
      };
      adr.adgangspunkt = {
        koordinater: rs.geom_json ? JSON.parse(rs.geom_json).coordinates : null,
        nøjagtighed: maybeNull(rs.nøjagtighed),
        kilde: maybeNull(rs.kilde),
        tekniskstandard: maybeNull(rs.tekniskstandard),
        tekstretning:    maybeNull(rs.tekstretning),
        'ændret':        d(rs.adressepunktændringsdato)
      };
      adr.DDKN = rs.ddkn_m100 || rs.ddkn_km1 || rs.ddkn_km10 ? {
        m100: maybeNull(rs.ddkn_m100),
        km1:  maybeNull(rs.ddkn_km1),
        km10: maybeNull(rs.ddkn_km10)
      } : null;

      // DAGI temaer
      adr.sogn = null;
      adr.region = null;
      adr.retskreds = null;
      adr.politikreds = null;
      adr.opstillingskreds = null;
      var includedDagiTemaer = ['sogn', 'region', 'retskreds','politikreds','opstillingskreds'];
      var temaer = rs.temaer || [];
      var dagiTemaArray =temaer.filter(function(tema) { return _.contains(includedDagiTemaer, tema.tema); });
      var dagiTemaMap = _.indexBy(dagiTemaArray, 'tema');
      var mappedDagiTemaer = _.reduce(dagiTemaMap, function(memo, tema, temaNavn) {
        memo[temaNavn] = mapDagiTema(tema);
        return memo;
      }, {});
      var zoneTemaer = _.where(temaer, {tema: 'zone'});
      if(zoneTemaer.length <= 1) {
        var zoneTema = zoneTemaer[0];
        var zoneKode = zoneTema ? zoneTema.fields.zone : 3;
        adr.zone = util.zoneKodeFormatter(zoneKode);
      }
      // hvis mere en én zone overlapper, eller ingen, så sætter vi zone til null.
      if(adr.zone === undefined) {
        adr.zone = null;
      }

      _.extend(adr, mappedDagiTemaer);
      return adr;
    };
  }
};

var autocompleteFieldNames = ['id', 'vejnavn', 'husnr', 'supplerendebynavn', 'postnr', 'postnrnavn'];
exports.autocomplete = {
  fields: representationUtil.fieldsWithNames(fields, autocompleteFieldNames),
  schema: globalSchemaObject({
    properties: {
      tekst: {
        description: 'Adgangsadressen på formen {vej} {husnr}, {supplerende bynavn}, {postnr} {postnrnavn}',
        type: 'string'
      },
      adgangsadresse: {
        description: 'Udvalgte informationer for adgangsadressen.',
        properties: {
          href: {
            description: 'Adgangsadressens unikke URL.',
            type: 'string'
          },
          id: {
            description: 'Adgangsadressens unikke UUID.',
            $ref: '#/definitions/UUID'
          },
          vejnavn: {
            description: 'Vejnavnet',
            type: nullableType('string')
          },
          husnr: {
            description: 'Husnummer',
            $ref: '#/definitions/husnr'
          },
          supplerendebynavn: {
            $ref: '#/definitions/Nullablesupplerendebynavn'
          },
          postnr: {
            description: 'Postnummer',
            type: nullableType('string')
          },
          postnrnavn: {
            description: 'Det navn der er knyttet til postnummeret, typisk byens eller bydelens navn. ' +
              'Repræsenteret ved indtil 20 tegn. Eksempel: ”København NV”.',
            type: nullableType('string')
          }
        },
        docOrder: ['id', 'href', 'vejnavn', 'husnr', 'supplerendebynavn', 'postnr', 'postnrnavn']
      }
    },
    docOrder: ['tekst', 'adgangsadresse']
  }),
  mapper: function(baseUrl) {
    return function (row) {
      function adresseText(row) {
        return adressebetegnelse(row, true);
      }

      return {
        tekst: adresseText(row),
        adgangsadresse: {
          id: row.id,
          href: makeHref(baseUrl, 'adgangsadresse', [row.id]),
          vejnavn: row.vejnavn,
          husnr: row.husnr,
          supplerendebynavn: row.supplerendebynavn,
          postnr: kode4String(row.postnr),
          postnrnavn: row.postnrnavn
        }
      };
    };
  }
};

exports.geojson = representationUtil.geojsonRepresentation(_.findWhere(fields, {name: 'geom_json'}), exports.flat);

var registry = require('../registry');
registry.addMultiple('adgangsadresse', 'representation', module.exports);