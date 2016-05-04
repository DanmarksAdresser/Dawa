"use strict";

/**
 * This file contains JSON schema definitions and descriptions of the normalized fields of the model
 * They are reused for the non-normalized representations.
 */

var _ = require('underscore');

var definitions = require('../commonSchemaDefinitions');
var globalSchemaObject = require('../commonSchemaDefinitionsUtil').globalSchemaObject;
var husnrUtil = require('../husnrUtil');
var util = require('../util');
var kode4String = util.kode4String;
var timestampFormatter = util.d;
var temaer = require('../temaer/temaer');
var tilknytninger = require('../tematilknytninger/tilknytninger');
var additionalFieldsMap = require('../temaer/additionalFields');

var fields = {
  vejstykke: [{
    name: 'kode',
    description: 'Identifikation af vejstykke. Er unikt indenfor den pågældende kommune. ' +
      'Repræsenteret ved fire cifre. Eksempel: I Københavns kommune er ”0004” lig ”Abel Cathrines Gade”.',
    schema: definitions.Kode4,
    formatter: kode4String,
    primary: true
  }, {
    name: 'kommunekode',
    description: 'Kommunekoden. 4 cifre.',
    schema: definitions.Kode4,
    formatter: kode4String,
    primary: true
  }, {
      name: 'oprettet',
      description: 'DEPRECATED. Feltet opdateres ikke længere. Oprettelsestidspunktet for vejstykket som registreret i BBR',
      schema: definitions.NullableDateTime,
      formatter: timestampFormatter,
      deprecated: true
  }, {
    name: 'ændret',
    description: 'DEPRECATED. Feltet opdateres ikke længere. Tidspunkt for seneste ændring af vejstykket, som registreret i BBR',
    schema: definitions.NullableDateTime,
    formatter: timestampFormatter,
    deprecated: true
  }, {
    name: 'navn',
    description: 'Vejens navn som det er fastsat og registreret af kommunen. ' +
      'Repræsenteret ved indtil 40 tegn. Eksempel: ”Hvidkildevej”.',
    schema: definitions.NullableVejnavn
  }, {
    name: 'adresseringsnavn',
    description: 'En evt. forkortet udgave af vejnavnet på højst 20 tegn,' +
      ' som bruges ved adressering på labels og rudekuverter og lign., hvor der ikke plads til det fulde vejnavn.',
    schema: definitions.NullableVejnavnForkortet
  }
  ],
  postnummer: [
    {
      name: 'nr',
      description: 'Unik identifikation af det postnummeret. Postnumre fastsættes af Post Danmark.' +
        ' Repræsenteret ved fire cifre. Eksempel: ”2400” for ”København NV”.',
      schema: definitions.Postnr,
      formatter: kode4String,
      primary: true
    },
    {
      name: 'navn',
      description: 'Det navn der er knyttet til postnummeret, typisk byens eller bydelens navn.' +
        ' Repræsenteret ved indtil 20 tegn. Eksempel: ”København NV”.',
      schema: definitions.PostnrNavn
    },
    {
      name: 'stormodtager',
      description: 'Hvorvidt postnummeret er en særlig type,' +
        ' der er tilknyttet en organisation der modtager en større mængde post.',
      schema: definitions.Boolean
    }
  ],
  adgangsadresse: [
    {
      name: 'id',
      description: 'Universel, unik identifikation af adressen af datatypen UUID. ' +
        'Er stabil over hele adressens levetid (ligesom et CPR-nummer) ' +
        'dvs. uanset om adressen evt. ændrer vejnavn, husnummer, postnummer eller kommunekode. ' +
        'Repræsenteret som 32 hexadecimale tegn. Eksempel: ”0a3f507a-93e7-32b8-e044-0003ba298018”.',
      schema: definitions.UUID,
      primary: true
    },
    {
      name: 'status',
      description: 'Adgangsadressens status. 1 indikerer en gældende adresse, 3 indikerer en foreløbig adresse.',
      schema: definitions.Status
    },
    {
      name: 'oprettet',
      description: 'Dato og tid for adgangsadressens oprettelse,' +
        ' som registreret i BBR. Eksempel: 2001-12-23T00:00:00.',
      schema: definitions.NullableDateTime,
      formatter: timestampFormatter
    },
    {
      name: 'ændret',
      description: 'Dato og tid hvor der sidst er ændret i adgangsadressen,' +
        ' som registreret i BBR. Eksempel: 2002-04-08T00:00:00.',
      schema: definitions.NullableDateTime,
      formatter: timestampFormatter
    },
    {
      name: 'ikrafttrædelsesdato',
      description: 'Adgangsadressens ikrafttrædelsesdato',
      schema: definitions.NullableDateTime,
      formatter: timestampFormatter
    }, {
      name: 'kommunekode',
      description: 'Kommunekoden. 4 cifre.',
      schema: definitions.NullableKode4,
      formatter: kode4String
    }, {
      name: 'vejkode',
      description: 'Identifikation af vejstykket, adgangsadressen befinder sig på.' +
        ' Er unikt indenfor den pågældende kommune. Repræsenteret ved fire cifre.' +
        ' Eksempel: I Københavns kommune er ”0004” lig ”Abel Cathrines Gade”.',
      schema: definitions.NullableKode4,
      formatter: kode4String
    }, {
      name: 'husnr',
      description: 'Husnummer der identificerer den pågældende adresse i forhold til andre adresser med samme vejnavn.' +
        ' Husnummeret består af et tal 1-999 evt. suppleret af et stort bogstav A..Z, og fastsættes i stigende orden,' +
        ' normalt med lige og ulige numre på hver side af vejen. Eksempel: "11", "12A", "187B".',
      schema: definitions.Nullablehusnr,
      formatter: husnrUtil.formatHusnr
    }, {
      name: 'supplerendebynavn',
      description: 'Et supplerende bynavn – typisk landsbyens navn – eller andet lokalt stednavn,' +
        ' der er fastsat af kommunen for at præcisere adressens beliggenhed indenfor postnummeret.' +
        ' Indgår som en del af den officielle adressebetegnelse. Indtil 34 tegn. Eksempel: ”Sønderholm”.',
      schema: definitions.Nullablesupplerendebynavn
    }, {
      name: 'postnr',
      description: 'Postnummeret som adressen er beliggende i.',
      schema: definitions.NullablePostnr,
      formatter: kode4String
    }, {
      name: 'ejerlavkode',
      description: 'DEPRECATED. Feltet opdateres ikke længere. Benyt "jordstykke" i stedet. Angiver ejerlavkoden registreret i BBR.' +
        ' Repræsenteret ved indtil 7 cifre. Eksempel: ”170354” for ejerlavet ”Eskebjerg By, Bregninge”.',
      schema: definitions.NullableUpTo7,
      deprecated: true
    }, {
      name: 'matrikelnr',
      description: 'DEPRECATED. Feltet opdateres ikke længere. Benyt "jordstykke" i stedet. Angiver matrikelnummeret for jordstykket, som det var registreret i BBR.' +
        ' Repræsenteret ved Indtil 7 tegn: max. 4 cifre + max. 3 små bogstaver. Eksempel: ”18b”.',
      schema: definitions.Nullablematrikelnr,
      deprecated: true
    }, {
      name: 'esrejendomsnr',
      description: 'Identifikation af den vurderingsejendom jf. Ejendomsstamregisteret,' +
        ' ESR, som det matrikelnummer som adressen ligger på, er en del af.' +
        ' Stammer fra BBR.' +
        ' Repræsenteret ved op til syv cifre. Eksempel ”13606”.',
      schema: definitions.Nullableesrejendomsnr
    }, {
      name: 'etrs89koordinat_øst',
      description: 'Adgangspunktets østlige koordiat angivet i koordinatsystemet UTM zone 32' +
        ' og ved brug af det fælles europæiske terrestriale referencesystem EUREF89/ETRS89.',
      schema: definitions.NullableNumber
    }, {
      name: 'etrs89koordinat_nord',
      description: 'Adgangspunktets nordlige koordiat angivet i koordinatsystemet UTM zone 32' +
        ' og ved brug af det fælles europæiske terrestriale referencesystem EUREF89/ETRS89.',
      schema: definitions.NullableNumber
    }, {
      name: 'nøjagtighed',
      description: 'Kode der angiver nøjagtigheden for adressepunktet. Et tegn.' +
        ' ”A” betyder at adressepunktet er absolut placeret på et detaljeret grundkort,' +
        ' tyisk med en nøjagtighed bedre end +/- 2 meter. ”B” betyder at adressepunktet er beregnet –' +
        ' typisk på basis af matrikelkortet, således at adressen ligger midt på det pågældende matrikelnummer.' +
        ' I så fald kan nøjagtigheden være ringere en end +/- 100 meter afhængig af forholdene.' +
        ' ”U” betyder intet adressepunkt.',
      schema: definitions['Nøjagtighed']
    }, {
      name: 'kilde',
      description: 'Kode der angiver kilden til adressepunktet. Et tegn.' +
        ' ”1” = oprettet maskinelt fra teknisk kort;' +
        ' ”2” = Oprettet maskinelt fra af matrikelnummer tyngdepunkt;' +
        ' ”3” = Eksternt indberettet af konsulent på vegne af kommunen;' +
        ' ”4” = Eksternt indberettet af kommunes kortkontor o.l.' +
        ' ”5” = Oprettet af teknisk forvaltning."',
      schema: definitions.NullableInteger
    }, {
      name: 'husnummerkilde',
      description: 'Kode der angiver kilden til husnummeret. Et tal bestående af et ciffer.',
      schema: definitions.NullableInteger
    }, {
      name: 'tekniskstandard',
      description: 'Kode der angiver den specifikation adressepunktet skal opfylde. 2 tegn.' +
        ' ”TD” = 3 meter inde i bygningen ved det sted hvor indgangsdør e.l. skønnes placeret;' +
        ' ”TK” = Udtrykkelig TK-standard: 3 meter inde i bygning, midt for længste side mod vej;' +
        ' ”TN” Alm. teknisk standard: bygningstyngdepunkt eller blot i bygning;' +
        ' ”UF” = Uspecificeret/foreløbig: ikke nødvendigvis placeret i bygning."',
      schema: definitions.NullableTekniskstandard
    }, {
      name: 'tekstretning',
      description: 'Angiver en evt. retningsvinkel for adressen i ”gon”' +
        ' dvs. hvor hele cirklen er 400 gon og 200 er vandret.' +
        ' Værdier 0.00-400.00: Eksempel: ”128.34”.',
      schema: definitions.NullableTekstretning
    }, {
      name: 'adressepunktændringsdato',
      description: 'Dato for sidste ændring i adressepunktet, som registreret af BBR.' +
        ' Eksempel: ”1998-11-17T00:00:00”',
      schema: definitions.NullableDateTime,
      formatter: timestampFormatter
    }, {
      name: 'esdhreference',
      description: 'Nøgle i ESDH system.',
      schema: definitions.Nullableesdhreference
    }, {
      name: 'journalnummer',
      description: 'Journalnummer.',
      schema: definitions.Nullablejournalnummer
    },
    {
      name: 'højde',
      description: 'Adgangspunktets højde over jorden i meter',
      schema: definitions.NullableNumber
    }
  ],
  adresse: [
    {
      name: 'id',
      description: 'Universel, unik identifikation af adressen af datatypen UUID.' +
        ' Er stabil over hele adressens levetid (ligesom et CPR-nummer)' +
        ' dvs. uanset om adressen evt. ændrer vejnavn, husnummer, postnummer eller kommunekode.' +
        ' Repræsenteret som 32 hexadecimale tegn. Eksempel: ”0a3f507a-93e7-32b8-e044-0003ba298018”.',
      schema: definitions.UUID,
      primary: true
    }, {
      name: 'status',
      description: 'Adressens status. 1 indikerer en gældende adresse, 3 indikerer en foreløbig adresse.',
      schema: definitions.Status
    }, {
      name: 'oprettet',
      description: 'Dato og tid for adressens oprettelse, som registreret hos BBR. Eksempel: 2001-12-23T00:00:00.',
      schema: definitions.NullableDateTime,
      formatter: timestampFormatter
    }, {
      name: 'ændret',
      description: 'Dato og tid hvor der sidst er ændret i adgangsadressen, som registreret hos BBR. Eksempel: 2002-04-08T00:00:00.',
      schema: definitions.NullableDateTime,
      formatter: timestampFormatter
    }, {
      name: 'ikrafttrædelsesdato',
      description: 'Adressens ikrafttrædelsesdato.',
      schema: definitions.NullableDateTime,
      formatter: timestampFormatter
    }, {
      name: 'adgangsadresseid',
      description: 'Identifier for adressens adgangsadresse. UUID.',
      schema: definitions.UUID
    }, {
      name: 'etage',
      description: 'Etagebetegnelse. Hvis værdi angivet kan den antage følgende værdier:' +
        ' tal fra 1 til 99, st, kl, k2 op til k9.',
      schema: definitions.NullableEtage
    }, {
      name: 'dør',
      description: 'Dørbetegnelse. Hvis værdi angivet kan den antage følgende værdier:' +
        ' tal fra 1 til 9999, små og store bogstaver samt tegnene / og -.',
      schema: definitions.NullableDør
    }, {
      name: 'kilde',
      description: 'Kode der angiver kilden til adressen. Tal bestående af et ciffer.',
      schema: definitions.NullableInteger
    },
    {
      name: 'esdhreference',
      description: 'Nøgle i ESDH system.',
      schema: definitions.Nullableesdhreference
    }, {
      name: 'journalnummer',
      description: 'Journalnummer.',
      schema: definitions.Nullablejournalnummer
    }
  ],
  ejerlav: [{
    name: 'kode',
    description: 'Unik identifikation af det matrikulære ”ejerlav”.' +
      ' Repræsenteret ved indtil 7 cifre. Eksempel: ”170354” for ejerlavet ”Eskebjerg By, Bregninge”.',
    schema: definitions.UpTo7,
    primary: true
  }, {
    name: 'navn',
    description: 'Det matrikulære ”ejerlav”s navn. Eksempel: ”Eskebjerg By, Bregninge”.',
    schema: definitions.NullableEjerlavNavn
  }]
};

_.each(tilknytninger, function(tilknytning, temaNavn) {
  var tema = _.findWhere(temaer, { singular: temaNavn});
  var additionalFields = additionalFieldsMap[temaNavn];
  var temaKeyFieldNames = _.pluck(tema.key, 'name');
  var tilknytningKeyFields = temaKeyFieldNames.map(function(temaKeyFieldName) {
    return _.clone(_.findWhere(additionalFields, {name: temaKeyFieldName}));
  });

  var tilknytningKeyFieldNames = tilknytning.keyFieldNames;
  var tilknytningFields = [{
    name: 'adgangsadresseid',
    description: 'Adgangsadressens id.',
    schema: definitions.UUID,
    primary: true
  }];
  tilknytningKeyFields.forEach(function(keyField, index) {
    keyField.name = tilknytningKeyFieldNames[index];
  });
  tilknytningFields = tilknytningFields.concat(tilknytningKeyFields);
  fields[tema.prefix + 'tilknytning'] = tilknytningFields;
});

exports.schemas = _.reduce(fields, function(memo, fieldList, datamodelName) {
  var properties = fieldList.reduce(function(acc, field) {
    var property = _.clone(field.schema);
    property.description = field.description;
    property.primary = field.primary;
    property.deprecated = field.deprecated;
    acc[field.name] = property;
    return acc;
  }, {});
  var fieldNames = _.pluck(fieldList, 'name');
  memo[datamodelName] = globalSchemaObject({
    title: datamodelName + 'Normaliseret',
    properties: properties,
    docOrder: fieldNames
  });
  return memo;
}, {});

exports.normalizedField = function(datamodelName, fieldName) {
  return _.findWhere(fields[datamodelName], {name: fieldName});
};

exports.normalizedSchemaField = function(datamodelName, fieldName) {
  return exports.schemas[datamodelName].properties[fieldName];
};
