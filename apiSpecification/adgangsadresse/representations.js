"use strict";

var _ = require('underscore');

var ddknSchemas = require('./ddknSchemas');
var representationUtil = require('../common/representationUtil');
var fields = require('./fields');
var commonMappers = require('../commonMappers');
var commonSchemaDefinitions = require('../commonSchemaDefinitions');
var commonSchemaDefinitionsUtil = require('../commonSchemaDefinitionsUtil');
var husnrUtil = require('../husnrUtil');
var schemaUtil = require('../schemaUtil');
var util = require('../util');

var adressebetegnelse = util.adressebetegnelse;
var schemaObject = schemaUtil.schemaObject;
var globalSchemaObject = commonSchemaDefinitionsUtil.globalSchemaObject;
const { makeHref, makeHrefFromPath}  = commonMappers;

var mapPostnummerRef = commonMappers.mapPostnummerRef;
var mapKommuneRef = commonMappers.mapKommuneRef;
const { d, numberToString, maybeNull, kode4String }= util;

var normalizedFieldSchemas = require('../replikering/normalizedFieldSchemas');
var normalizedFieldSchema = function(fieldName) {
  return normalizedFieldSchemas.normalizedSchemaField('adgangsadresse', fieldName);
};

var nullableType = schemaUtil.nullableType;
var kvhFormat = require('./kvhTransformer').format;
var kvhFieldsDts = require('./kvhTransformer').kvhFieldsDts;

var normalizedDdknSchema = function(fieldName) {
  var field = _.findWhere(ddknSchemas, {name: fieldName});
  var schema = _.clone(field.schema);
  schema.description = field.description;
  return schema;
}

  /*
   * flat format
   */
exports.flat = representationUtil.adresseFlatRepresentation(fields, function(rs) {
  return {
    kvh: kvhFormat(rs)
  };
});

const FIELDS_AT_END = ['højde', 'adgangspunktid', 'vejpunkt_id', 'vejpunkt_kilde', 'vejpunkt_nøjagtighed', 'vejpunkt_tekniskstandard', 'vejpunkt_x', 'vejpunkt_y', 'afstemningsområdenummer', 'afstemningsområdenavn', 'brofast', 'supplerendebynavn_dagi_id', 'navngivenvej_id'];
exports.flat.outputFields = _.difference(exports.flat.outputFields, FIELDS_AT_END).concat(FIELDS_AT_END);


const miniFieldNamesWithoutCoords = ['id', 'status', 'kommunekode', 'vejkode', 'vejnavn', 'adresseringsvejnavn', 'husnr', 'supplerendebynavn', 'postnr', 'postnrnavn'];

const miniFieldNames = miniFieldNamesWithoutCoords.concat(['x', 'y']);


const miniFieldsWithoutCoords = fields.filter(field => _.contains(miniFieldNamesWithoutCoords, field.name));
const miniFields = fields.filter(field => _.contains(miniFieldNames, field.name));

exports.mini = representationUtil.defaultFlatRepresentation(miniFields);

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
      'supplerendebynavn2': schemaObject({
        description: 'Det supplerende bynavn, som adgangsadressen ligger i',
        properties: {
          href: {
            description: 'Det supplerende bynavns unikke URL',
            type: 'string'
          },
          dagi_id: {
            description: 'Det supplerende bynavns unikke ID i DAGI',
            type: 'string'
          }
        },
        nullable: true,
        docOrder: ['href', 'dagi_id']
      }),

      'postnummer': {
        description: 'Postnummeret som adressen er beliggende i.',
        $ref: '#/definitions/NullablePostnummerRef'
      },
      stormodtagerpostnummer: {
        description: 'Evt. stormodtagerpostnummer (firmapostnummer) som er tilknyttet adressen.',
        $ref: '#/definitions/NullablePostnummerRef'
      },
      'kommune':{
        description: 'Kommunen som adressen er beliggende i.',
        $ref: '#/definitions/KommuneRef'
      },
      'ejerlav': schemaObject({
        description: 'DEPRECATED. Opdateres ikke længere. Benyt "jordstykke" i stedet. ' +
        'Feltet indeholder den værdi der i sin tid var registreret i BBR. I dag beregnes det tilhørende' +
        ' jordstykke ud fra adgangspunktets placering.',
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
          id: normalizedFieldSchema('adgangspunktid'),
          højde: normalizedFieldSchema('højde'),
          nøjagtighed: normalizedFieldSchema('nøjagtighed'),
          kilde: normalizedFieldSchema('kilde'),
          tekniskstandard: normalizedFieldSchema('tekniskstandard'),
          tekstretning: normalizedFieldSchema('tekstretning'),
          ændret: normalizedFieldSchema('adressepunktændringsdato')
        },
        docOrder: ['id', 'koordinater', 'højde','nøjagtighed','kilde', 'tekniskstandard','tekstretning', 'ændret']
      }),
      vejpunkt: schemaObject({
        description:
`
<p>BETA. Vejpunkter udstilles på forsøgsbasis. Betaperioden udløber når DAR 1.0 går i produktion i foråret 2018.</p>
<p>Et geografisk punkt på færdselsnettet som repræsenterer startpunktet \
af den rute, der fører til et bestemt adgangspunkt.</p>
<p>Beskrivelse:</p>\
<p>Et "vejpunkt" repræsenterer det sted på vej- eller stinettet e.l., hvorfra \
adgangsvejen hen imod et adgangspunkt til et areal eller en bygning \
starter.</p>
<p>Ofte vil vejpunktet således angive det sted hvor man forlader vejnettet, \
for at begive sig det sidste stykke hen imod adgangspunktet (fx \
indgangen til bygningen) og dermed den adresse, som er turens mål.</p>
<p>Vejpunktet repræsenterer således det sted, som et nutidigt bilnavigationssystem \
typisk vil regne som turens destination eller ankomstpunkt. \
For et bilnavigatonssystem vil vejruten mellem to adresser \
blive beregnet mellem de to adressers respektive vejpunkter.</p>
<p>Vejpunktet vil som hovedregel være beliggende et sted på den navngivne \
vej, som adgangspunktets adresser refererer til.</p>`,
        nullable: true,
        properties: {
          koordinater: {
            description: 'Vejpunktets koordinater som array [x,y].',
            $ref: '#/definitions/NullableGeoJsonCoordinates'
          },
          id: {
            description: 'Vejpunktets unikke ID',
            $ref: '#/definitions/UUID'
          },
          kilde: {
            description: `\
<p>Kilden til vejpunktets position.</p>
<dl>
<dt>Grundkort:</dt>
<dd>Grundkort</dd>
<dt>Matrikelkort:</dt>
<dd>Matrikelkort</dd>
<dt>Ekstern:</dt>
<dd>Ekstern tredjepart</dd>
<dt>Ejer:</dt>
<dd>Ejer eller administrator</dd>
<dt>Landinsp:</dt>
<dd>Landinspektør</dd>
<dt>Adressemyn:</dt>
<dd>Adressemyndigheden</dd>
</dl>`,
            type: 'string'
          },
          tekniskstandard: {
            description: `\
<p>Vejpunktets tekniske standard.</p>
<dl>
<dt>VU:</dt>
<dd>Vejpunkt er uspecificeret eller ukendt</dd>
<dt>VN:</dt>
<dd>Vejpunkt i vejtilslutningspunkt</dd>
<dt>V0:</dt>
<dd>Vejpunkt på vej med korrekt vejkode. Stor sikkerhed for korrekt vejpunkt</dd>
<dt>V1:</dt>
<dd>Vejpunkt på vej med korrekt vejkode. Adgang til adgangspunkt via indkørselsvej eller sti</dd>
<dt>V2:</dt>
<dd>Vejpunkt på vej med korrekt vejkode. Risiko for at skulle krydse stier</dd>
<dt>V3:</dt>
<dd>Vejpunkt på vej med korrekt vejkode. Risiko for at skulle krydse andre veje</dd>
<dt>V4:</dt>
<dd>Vejpunkt på vej med korrekt vejkode. Risiko for at skulle krydse et enkelt teknisk anlæg eller trafikhegn</dd>
<dt>V5:</dt>
<dd>Vejpunkt på vej med korrekt vejkode. Risiko for at skulle krydse et større antal bygninger eller jordstykker</dd>
<dt>V6:</dt>
<dd>Vejpunkt på mindre indkørselsvej med korrekt vejkode. Risiko for at skulle krydse fysiske forhindringer</dd>
<dt>V7:</dt>
<dd>Vejpunkt på vej med forkert vejkode, men på samme matrikelnummer. Risiko for at skulle krydse fysiske forhindringer</dd>
<dt>V8:</dt>
<dd>Vejpunkt på sti med korrekt vejkode. Risiko for at skulle krydse fysiske forhindringer</dd>
<dt>V9:</dt>
<dd>Vejpunkt på vej eller indkørselsvej med forkert kommunekode eller vejkode. Risiko for at skulle krydse fysiske forhindringer</dd>
<dt>VX:</dt>
<dd>Vejpunkt på vej. Stor usikkerhed om korrekthed</dd>
</dl>`,
            type: 'string'
          },
          nøjagtighed: {
            description: `\
<p>Vejpunktets nøjagtighedsklasse.</p>
<p>A : Absolut placeret</p>
<p>B : Beregnet placering</p>`,
            type: 'string'
          }
        },
        docOrder: ['id', 'koordinater', 'kilde', 'tekniskstandard', 'nøjagtighed']
      }),
      'DDKN': schemaObject({
        nullable: true,
        description: 'Adressens placering i Det Danske Kvadratnet (DDKN).',
        properties: {
          'm100': normalizedDdknSchema('ddkn_m100'),
          'km1' : normalizedDdknSchema('ddkn_km1'),
          'km10': normalizedDdknSchema('ddkn_km10')
        },
        docOrder: ['m100', 'km1', 'km10']
      }),
      'sogn': {
        description: 'Sognet som adressen er beliggende i. Beregnes udfra adgangspunktet og sogneinddelingerne fra DAGI.',
        $ref: '#/definitions/NullableSogneRef'
      },
      'region': {
        description: 'Regionen som adressen er beliggende i. Beregnes udfra adgangspunktet og regionsinddelingerne fra DAGI.',
        $ref: '#/definitions/NullableRegionsRef'
      },
      'retskreds': {
        description: 'Retskredsen som adressen er beliggende i. Beregnes udfra adgangspunktet og retskredsinddelingerne fra DAGI.',
        $ref: '#/definitions/NullableRetskredsRef'
      },
      'politikreds': schemaObject({
        nullable: true,
        description: 'Politikredsen som adressen er beliggende i. Beregnes udfra adgangspunktet og politikredsinddelingerne fra DAGI.',
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
      'afstemningsområde': schemaObject({
        properties: {
          href: {
            description: 'Afstemningsområdets URL',
            type: 'string'
          },
          nummer: {
            description: 'Afstemningsområdets nummer indenfor kommunen',
            type: 'string'
          },
          navn: {
            description: 'Afstemningsområdets unikke navn',
            type: 'string'
          }
        },
        docOrder: ['href', 'nummer', 'navn']
      }),
      'opstillingskreds': schemaObject({
        nullable: true,
        description: 'Opstillingskresen som adressen er beliggende i. Beregnes udfra adgangspunktet og opstillingskredsinddelingerne fra DAGI.',
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
        description: 'Hvilken zone adressen ligger i. "Byzone", "Sommerhusområde" eller "Landzone". Beregnes udfra adgangspunktet og zoneinddelingerne fra PlansystemDK.',
        enum: [null, 'Byzone', 'Sommerhusområde', 'Landzone']
      },
      jordstykke: schemaObject({
        description: 'Jordstykket, som adressens adgangspunkt ligger på. Dette kan afvige fra det jordstykke der er' +
        ' registreret i BBR.',
        nullable: true,
        properties: {
          href: {
            description: 'Jordstykkets unikke URL',
            type: 'string'
          },
          ejerlav: {
            description: 'Ejerlavet som jordstykket tilhører.',
            $ref: '#/definitions/EjerlavRef'
          },
          matrikelnr: {
            description: 'Jordstykkets matrikelnummer. Udgør sammen med ejerlavet en unik nøgle for jordstykket.' +
            ' Repræsenteret ved Indtil 7 tegn: max. 4 cifre + max. 3 små bogstaver. Eksempel: ”18b”',
            $ref: '#/definitions/matrikelnr'
          },
          esrejendomsnr: {
            description: 'Identifikation af den vurderingsejendom jf. Ejendomsstamregisteret, ESR,' +
            ' som jordstykket er en del af. Repræsenteret ved op til syv cifre. Eksempel ”13606”.',
            schema: commonSchemaDefinitions.Nullableesrejendomsnr
          }
        },
        docOrder: ['href', 'ejerlav', 'matrikelnr', 'esrejendomsnr']
      }),
      bebyggelser: {
        type: 'array',
        items: commonSchemaDefinitions.bebyggelse
      },
      brofast: {
        description: 'Angiver, om adressen er brofast.',
        type: 'boolean'
      },
      kvh: {
        description: 'Sammensat nøgle for adgangsadressen. Indeholder til brug for integration til ældre systemer felter, der tilsammen identificerer adressen. Hvis det er muligt, bør adressens id eller href benyttes til identifikation.<br />' +
                     'KVH-nøglen er sammen således:' +
                     '<dl>' +
                      kvhFieldsDts +
                     '</dl>' +
                     'En adresse på vejstykke 1074 (Melvej) nummer 6 i kommune 420 (Assens) vil altså få KVH-nøgle "04201074___6"',
        type: 'string'
      }
    },
    docOrder: ['href','id', 'kvh', 'status', 'vejstykke', 'husnr','supplerendebynavn', 'supplerendebynavn2',
      'postnummer', 'stormodtagerpostnummer','kommune', 'ejerlav', 'matrikelnr','esrejendomsnr', 'historik',
      'adgangspunkt', 'vejpunkt', 'DDKN', 'sogn','region','retskreds','politikreds', 'afstemningsområde',
      'opstillingskreds', 'zone', 'jordstykke', 'bebyggelser', 'brofast']
  }),
  mapper: function (baseUrl){
    return function(rs) {
      var adr = {};
      adr.href = makeHref(baseUrl, 'adgangsadresse', [rs.id]);
      adr.id = rs.id;
      adr.kvh = kvhFormat(rs);
      adr.status = rs.status;
      adr.vejstykke = {
        href: makeHref(baseUrl, 'vejstykke', [rs.kommunekode, rs.vejkode]),
        navn: maybeNull(rs.vejnavn),
        adresseringsnavn: maybeNull(rs.adresseringsvejnavn),
        kode: kode4String(rs.vejkode)
      };
      adr.husnr = husnrUtil.formatHusnr(rs.husnr);
      adr.supplerendebynavn = maybeNull(rs.supplerendebynavn);
      adr.supplerendebynavn2 = rs.supplerendebynavn_dagi_id ? {
        href: makeHrefFromPath(baseUrl, 'supplerendebynavne2', [rs.supplerendebynavn_dagi_id]),
        dagi_id: numberToString(rs.supplerendebynavn_dagi_id)
      } : null;
      adr.postnummer = mapPostnummerRef({nr: rs.postnr, navn: rs.postnrnavn}, baseUrl);
      if(rs.stormodtagerpostnr) {
        adr.stormodtagerpostnummer = mapPostnummerRef(
          {nr: rs.stormodtagerpostnr, navn: rs.stormodtagerpostnrnavn},
          baseUrl);
      }
      else {
        adr.stormodtagerpostnummer = null;
      }
      adr.kommune = mapKommuneRef({kode: rs.kommunekode, navn: rs.kommunenavn}, baseUrl);
      const adgangspunkt_koordinater = rs.adgangspunkt_geom_json ? JSON.parse(rs.adgangspunkt_geom_json).coordinates : null;
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
        // af legacy årsager returnerer vi kun x,y koordinater
        id: rs.adgangspunktid,
        koordinater: adgangspunkt_koordinater ? [adgangspunkt_koordinater[0], adgangspunkt_koordinater[1]] : null,
        højde: rs.højde,
        nøjagtighed: maybeNull(rs.nøjagtighed),
        kilde: maybeNull(rs.kilde),
        tekniskstandard: maybeNull(rs.tekniskstandard),
        tekstretning:    maybeNull(rs.tekstretning),
        'ændret':        d(rs.adressepunktændringsdato)
      };
      if(rs.vejpunkt_id) {
        const vejpunkt_coordinater = rs.vejpunkt_geom_json ? JSON.parse(rs.vejpunkt_geom_json).coordinates : null;
        adr.vejpunkt = {
          id: rs.vejpunkt_id,
          kilde: maybeNull(rs.vejpunkt_kilde),
          nøjagtighed: maybeNull(rs.vejpunkt_nøjagtighed),
          tekniskstandard: maybeNull(rs.vejpunkt_tekniskstandard),
          koordinater: vejpunkt_coordinater
        }
      }
      else {
        adr.vejpunkt = null;
      }
      adr.DDKN = rs.ddkn_m100 || rs.ddkn_km1 || rs.ddkn_km10 ? {
        m100: maybeNull(rs.ddkn_m100),
        km1:  maybeNull(rs.ddkn_km1),
        km10: maybeNull(rs.ddkn_km10)
      } : null;
      // DAGI temaer
      adr.sogn = commonMappers.mapKode4NavnTema('sogn', rs.sognekode, rs.sognenavn, baseUrl);
      adr.region = commonMappers.mapKode4NavnTema('region', rs.regionskode, rs.regionsnavn, baseUrl);
      adr.retskreds = commonMappers.mapKode4NavnTema('retskreds', rs.retskredskode, rs.retskredsnavn, baseUrl);
      adr.politikreds = commonMappers.mapKode4NavnTema('politikreds', rs.politikredskode, rs.politikredsnavn, baseUrl);
      adr.opstillingskreds = commonMappers.mapKode4NavnTema('opstillingskreds', rs.opstillingskredskode, rs.opstillingskredsnavn, baseUrl);
      adr.afstemningsområde = rs.afstemningsområdenummer ? {
        href: makeHref(baseUrl, 'afstemningsområde', [rs.kommunekode, rs.afstemningsområdenummer]),
        nummer: "" + rs.afstemningsområdenummer,
        navn: rs.afstemningsområdenavn
        } : null,
      adr.zone = rs.zone ? util.zoneKodeFormatter(rs.zone) : null;
      if(rs.jordstykke_matrikelnr) {
        const jordstykke = {};
        jordstykke.href = makeHref(baseUrl, 'jordstykke', [rs.jordstykke_ejerlavkode, rs.jordstykke_matrikelnr]),
        jordstykke.ejerlav = commonMappers.mapEjerlavRef(rs.jordstykke_ejerlavkode, rs.jordstykke_ejerlavnavn, baseUrl);
        jordstykke.matrikelnr = rs.jordstykke_matrikelnr;
        jordstykke.esrejendomsnr = rs.jordstykke_esrejendomsnr  ?  "" + rs.jordstykke_esrejendomsnr  : null;
        adr.jordstykke = jordstykke;
      }
      else {
        adr.jordstykke = null;
      }

      adr.bebyggelser = rs.bebyggelser.map(bebyggelse => {
        bebyggelse.href = makeHref(baseUrl, 'bebyggelse', [bebyggelse.id]);
        return bebyggelse;
      });
      adr.brofast = rs.brofast;
      return adr;
    };
  }
};

var autocompleteFieldNames = ['id', 'vejnavn', 'adresseringsvejnavn', 'husnr', 'supplerendebynavn', 'postnr', 'postnrnavn', 'stormodtagerpostnr', 'stormodtagerpostnrnavn'];
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
          },
          stormodtagerpostnr: {
            description: 'Evt. stormodtagerpostnummer, som er tilknyttet adgangsadressen.',
            type: nullableType('string')
          },
          stormodtagerpostnrnavn: {
            description: 'Stormodtagerpostnummerets navn.',
            type: nullableType('string')
          }
        },
        docOrder: ['id', 'href', 'vejnavn', 'husnr', 'supplerendebynavn', 'postnr', 'postnrnavn',
          'stormodtagerpostnr', 'stormodtagerpostnrnavn']
      }
    },
    docOrder: ['tekst', 'adgangsadresse']
  }),
  mapper: function(baseUrl) {
    return function (row) {
      function adresseText(row) {
        var fields = _.clone(row);
        fields.husnr = husnrUtil.formatHusnr(row.husnr);
        return adressebetegnelse(fields, true);
      }

      return {
        tekst: adresseText(row),
        adgangsadresse: {
          id: row.id,
          href: makeHref(baseUrl, 'adgangsadresse', [row.id]),
          vejnavn: row.vejnavn,
          husnr: husnrUtil.formatHusnr(row.husnr),
          supplerendebynavn: row.supplerendebynavn,
          postnr: kode4String(row.postnr),
          postnrnavn: row.postnrnavn,
          stormodtagerpostnr: kode4String(row.stormodtagerpostnr),
          stormodtagerpostnrnavn: row.stormodtagerpostnrnavn
        }
      };
    };
  }
};

const geojsonField = _.findWhere(fields, {name: 'geom_json'});
exports.geojson = representationUtil.geojsonRepresentation(geojsonField, exports.flat);
exports.geojsonNested = representationUtil.geojsonRepresentation(geojsonField, exports.json);

const miniWithoutCordsRep = representationUtil.defaultFlatRepresentation(miniFieldsWithoutCoords);
exports.geojsonMini=representationUtil.geojsonRepresentation(geojsonField, miniWithoutCordsRep);

var registry = require('../registry');
registry.addMultiple('adgangsadresse', 'representation', module.exports);
