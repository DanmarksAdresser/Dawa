"use strict";

var _ = require('underscore');
/********************************************************************************
 ***** Schema helper functions ***************************************************
 ********************************************************************************/

function header(type, data){
  var headerData = headerNoAendringstype(type, data);
  headerData.aendringstype = notNull(enumeration(['aendring','oprettelse','nedlaeggelse']));
  return headerData;
}

function headerNoAendringstype(type, data){
  return {type                : notNull(enumeration([type])),
    sekvensnummer       : notNull(integer()),
    lokaltSekvensnummer : notNull(integer()),
    tidspunkt           : notNull(time()),
    data                : requireAllProperties({type: 'object',
      additionalProperties: false,
      properties: data})
  };
}

function notNull(type){
  if (_.isArray(type.type)){
    type.type = _.filter(type.type, function(val) { return val !== 'null'; });
  }
  if (_.isArray(type.enum)){
    type.enum = _.filter(type.enum, function(val) { return val !== 'null'; });
  }
  return type;
}

function integer()      {return simpleType('integer');}
function number()       {return simpleType('number');}
function string()       {return simpleType('string');}
function time()         {return string();}
function simpleType(t)  {return {type: ['null', t]};}
function array(t)       {return {type: ['null', 'array'], minItems:0, items: t};}
function enumeration(l) {return {enum: ['null'].concat(l)};}
function uuid() {
  return {type: 'string',
    pattern: '^([0-9a-fA-F]{8}\\-[0-9a-fA-F]{4}\\-[0-9a-fA-F]{4}\\-[0-9a-fA-F]{4}\\-[0-9a-fA-F]{12})$'};
}

function requireAllProperties(object){
  var properties = _.keys(object.properties);
  object.required = properties;
  return object;
}

function postnummerIntervaller(){
  return array(requireAllProperties(
    {type: 'object',
      additionalProperties: false,
      properties: {
        husnrFra : string(),
        husnrTil : string(),
        nummer   : integer()}}));
}

function supplerendebynavnIntervaller(){
  return array(requireAllProperties(
    {type: 'object',
      additionalProperties: false,
      properties: {
        husnrFra : string(),
        husnrTil : string(),
        navn   : string()}}));
}

/********************************************************************************
 ***** Haendelse schemas *********************************************************
 ********************************************************************************/
/**
 * Basic event properties
 */
var basicHaendelseSchema = requireAllProperties({
  title: 'Schema for alle hændelser',
  type: 'object',
  additionalProperties: true,
  properties: {
    type: notNull(enumeration(['enhedsadresse', 'adgangsadresse', 'supplerendebynavn', 'postnummer', 'vejnavn'])),
    sekvensnummer: notNull(integer())
  }
});

var vejnavnsHaendelseSchema = requireAllProperties({
  title : 'Hædelsesskema for vejnavne',
  type  : 'object',
  additionalProperties: false,
  properties : header('vejnavn', {
    kommunekode      : notNull(integer()),
    vejkode          : notNull(integer()),
    oprettet          : time(),
    aendret           : time(),
    navn             : string(),
    adresseringsnavn : string()
  })
});

var adgangsadresseHaendelseSchema = requireAllProperties({
  title : 'Hændelseskema for adgangsadresser',
  type  : 'object',
  additionalProperties: false,
  properties : header('adgangsadresse', {
    id                : uuid(),
    vejkode           : notNull(integer()),
    husnummer         : notNull(string()),
    kommunekode       : notNull(integer()),
    landsejerlav_kode : integer(),
    landsejerlav_navn : string(),
    matrikelnr        : string(),
    esrejendomsnr     : string(),
    postnummer        : integer(),
    postdistrikt      : string(),
    supplerendebynavn : string(),
    objekttype        : integer(),
    oprettet          : time(),
    aendret           : time(),
    ikrafttraedelsesdato : time(),
    adgangspunkt_id                     : uuid(),
    adgangspunkt_kilde                  : integer(),
    adgangspunkt_noejagtighedsklasse    : string(),
    adgangspunkt_tekniskstandard        : string(),
    adgangspunkt_retning                : number(),
    adgangspunkt_placering              : string(),
    adgangspunkt_revisionsdato          : time(),
    adgangspunkt_etrs89koordinat_oest   : number(),
    adgangspunkt_etrs89koordinat_nord   : number(),
    adgangspunkt_wgs84koordinat_bredde  : number(),
    adgangspunkt_wgs84koordinat_laengde : number(),
    adgangspunkt_DDKN_m100 : string(),
    adgangspunkt_DDKN_km1  : string(),
    adgangspunkt_DDKN_km10 : string()
  })
});

var enhedsadresseHaendelseSchema = requireAllProperties({
  title : 'Hændelseskema for enhedsadresser',
  type  : 'object',
  additionalProperties: false,
  properties : header('enhedsadresse', {
    id               : uuid(),
    adgangsadresseid : uuid(),
    etage            : string(),
    doer             : string(),
    objekttype       : integer(),
    oprettet         : time(),
    aendret          : time(),
    ikrafttraedelsesdato : time()
  })
});

var postnummerHaendelseSchema = requireAllProperties({
  title : 'Postnummer tilknytnings hændelse',
  type  : 'object',
  additionalProperties: false,
  properties : headerNoAendringstype('postnummer', {
    kommunekode : notNull(integer()),
    vejkode     : notNull(integer()),
    side     : enumeration(['lige','ulige']),
    intervaller : notNull(postnummerIntervaller())
  })
});

var supplerendebynavnHaendelseSchema = requireAllProperties({
  title : 'Hændelseskema for supplerende bynavne',
  type  : 'object',
  additionalProperties: false,
  properties : headerNoAendringstype('supplerendebynavn', {
    kommunekode : notNull(integer()),
    vejkode     : notNull(integer()),
    side     : enumeration(['lige','ulige']),
    intervaller : notNull(supplerendebynavnIntervaller())
  })
});

exports.basicHaendelseSchema = basicHaendelseSchema;
exports.vejnavn = vejnavnsHaendelseSchema;
exports.postnummer = postnummerHaendelseSchema;
exports.adgangsadresse = adgangsadresseHaendelseSchema;
exports.enhedsadresse = enhedsadresseHaendelseSchema;
exports.supplerendebynavn = supplerendebynavnHaendelseSchema;
