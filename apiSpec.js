"use strict";

var model = require('./awsDataModel');
var _     = require('underscore');


/**
 * Specificerer hvilke felter en adresse har, samt hvordan de mapper til kolonnenavne i databasen
 * Felterne anvendes som kolonner i CSV-formateringen af adresser.
 */
var adresseFields = [
  {
    name: 'id'
  },
  {
    name: 'vejkode'
  },
  {
    name: 'vejnavn'
  },
  {
    name: 'husnr'
  },
  {
    name: 'supplerendebynavn'
  },
  {
    name: 'postnr'
  },
  {
    name: 'postnrnavn'
  },
  {
    name: 'etage'
  },
  {
    name: 'dør',
    column: 'doer'
  },
  {
    name: 'bygningsnavn'
  },
  {
    name: 'adgangsadresseid'
  },
  {
    name: 'kommunekode'
  },
  {
    name: 'kommunenavn'
  },
  {
    name: 'ejerlavkode'
  },
  {
    name: 'ejerlavnavn'
  },
  {
    name: 'matrikel',
    column: 'matrikelnr'
  },
  {
    name: 'esrejendomsnr'
  },
  {
    name: 'etrs89koordinat_øst',
    column: 'oest'
  },
  {
    name: 'etrs89koordinat_nord',
    column: 'nord'
  },
  {
    name: 'wgs84koordinat_bredde',
    column: 'lat'
  },
  {
    name: 'wgs84koordinat_længde',
    column: 'long'
  },
  {
    name: 'nøjagtighed',
    column: 'noejagtighed'
  },
  {
    name: 'kilde'
  },
  {
    name: 'tekniskstandard'
  },
  {
    name: 'tekstretning'
  },
  {
    name: 'DDKN_m100',
    column: 'kn100mdk'
  },
  {
    name: 'DDKN_km1',
    column: 'kn1kmdk'
  },
  {
    name: 'DDKN_km10',
    column: 'kn10kmdk'
  }
];
function polygonWhereClause(paramNumberString){
  return "ST_Contains(ST_GeomFromText("+paramNumberString+", 4326)::geometry, wgs84geom)\n";
}

function searchWhereClause(paramNumberString) {
  // TODO add support for parameterized where clauses.
  return "(tsv @@ to_tsquery('danish', " + paramNumberString + "))";
}

function toPgSearchQuery(q) {
  q = q.replace(/[^a-zA-Z0-9ÆæØøÅåéE]/g, ' ');

  // normalize whitespace
  q = q.replace(/\s+/g, ' ');

  // remove leading / trailing whitespace
  q = q.replace(/^\s*/g, '');
  q = q.replace(/\s*$/g, '');


  // translate spaces into AND clauses
  var tsq = q.replace(/ /g, ' & ');

  return tsq;
}

function polygonTransformer(paramValue){
  var mapPoint   = function(point) { return ""+point[0]+" "+point[1]; };
  var mapPoints  = function(points) { return "("+_.map(points, mapPoint).join(", ")+")"; };
  var mapPolygon = function(poly) { return "POLYGON("+_.map(poly, mapPoints).join(" ")+")"; };
  return mapPolygon(paramValue);
}

function d(date) { return JSON.stringify(date); }
//function defaultVal(val, def) { return val ? val : def;}

function mapAddress(rs){
  var adr = {};
  adr.id = rs.enhedsadresseid;
  adr.version = d(rs.e_version);
  if (adr.etage) adr.etage = rs.etage;
  if (adr.dør) adr.dør = rs.doer;
  adr.adressebetegnelse = "TODO";  //TODO
  adr.adgangsadresse = mapAdganggsadresse(rs);
  return adr;
}

function mapAdganggsadresse(rs){
  var slice = function(slice, str) { return ("00000000000"+str).slice(slice); };
  var adr = {};
  adr.id = rs.adgangsadresseid;
  adr.version = d(rs.e_version);
  adr.vej = {navn: rs.vejnavn,
    kode: slice(-4, rs.vejkode)};
  adr.husnr = rs.husnr;
  //if (rs.bygningsnavn) adr.bygningsnavn = rs.bygningsnavn;
  if (rs.supplerendebynavn) adr.supplerendebynavn = rs.supplerendebynavn;
  adr.postnummer = {nr: slice(-4, rs.postnr),
    navn: rs.postnrnavn};
  adr.kommune = {kode: slice(-4, rs.kommunekode),
    navn: rs.kommunenavn};
  adr.ejerlav = {kode: slice(-8, rs.ejerlavkode),
    navn: rs.ejerlavnavn};
  adr.matrikelnr = rs.matrikelnr;
  adr.historik = {oprettet: d(rs.e_oprettet),
    'ændret': d(rs.e_aendret)};
  adr.adgangspunkt = {etrs89koordinat: {'øst': rs.oest,
    nord:  rs.nord},
    wgs84koordinat:  {'længde': rs.lat,
      bredde: rs.long},
    kvalitet:        {'nøjagtighed': rs.noejagtighed,
      kilde: rs.kilde,
      tekniskstandard: rs.tekniskstandard},
    tekstretning:    rs.tekstretning,
    'ændret':        d(rs.adressepunktaendringsdato)};
  adr.DDKN = {m100: rs.kn100mdk,
    km1:  rs.kn1kmdk,
    km10: rs.kn10kmdk};

  return adr;
}

var schema =  {
  uuid: {type: 'string',
         pattern: '^([0-9a-fA-F]{8}\\-[0-9a-fA-F]{4}\\-[0-9a-fA-F]{4}\\-[0-9a-fA-F]{4}\\-[0-9a-fA-F]{12})$'},
  postnr: {type: 'integer',
           minimum: 1000,
           maximum: 9999},
  polygon: {type: 'array',
            items: { type: 'array'}},
  positiveInteger: {type: 'integer',
                    minimum: 1
                   },
  kode4: {type: 'string',
          pattern: '^(\\d{1,4})$'},
};

var adresseApiSpec = {
  model: model.adresse,
  pageable: true,
  searchable: true,
  fields: adresseFields,
  fieldMap: _.indexBy(adresseFields, 'name'),
  parameters: [
    {
      name: 'id',
      type: 'string',
      schema: schema.uuid
    },
    {
      name: 'vejkode',
      type: 'string',
      schema: schema.kode4,
    },
    {
      name: 'vejnavn'
    },
    {
      name: 'husnr'
    },
    {
      name: 'supplerendebynavn'
    },
    {
      name: 'postnr',
      type: 'number',
      schema: schema.postnr
    },
    {
      name: 'etage'
    },
    {
      name: 'dør'
    },
    {
      name: 'adgangsadresseid'
    },
    {
      name: 'kommune'
    },
    {
      name: 'ejerlav'
    },
    {
      name: 'matrikel'
    },
    {
      name: 'polygon',
      type: 'array',
      schema: schema.polygon,
      whereClause: polygonWhereClause,
      transform: polygonTransformer
    },
    {
      name: 'q',
      type: 'string',
      whereClause: searchWhereClause,
      transform: toPgSearchQuery
    }
  ],
  mappers: {
    json: mapAddress
  }
};

var vejnavnenavneFields = [
  {
    name: 'vejnavn'
  }
];

var vejnavnenavneJsonMapper = function(row) {
  return {
    vejnavn: row.vejnavn
  };
};

var vejnavnnavnApiSpec = {
  model: model.vejnavnnavn,
  pageable: true,
  searchable: true,
  fields: vejnavnenavneFields,
  fieldMap: _.indexBy(adresseFields, 'name'),
  parameters: [
    {
      name: 'vejnavn'
    },
    {
      name: 'q',
      type: 'string',
      whereClause: searchWhereClause,
      transform: toPgSearchQuery
    }
  ],
  mappers: {
    json: vejnavnenavneJsonMapper
  }
};

module.exports = {
  adresse: adresseApiSpec,
  vejnavnnavn: vejnavnnavnApiSpec,
  pagingParameterSpec: [
    {
      name: 'side',
      type: 'number',
      schema: schema.positiveInteger
    },
    {
      name: 'per_side',
      type: 'number',
      schema: schema.positiveInteger
    }
  ],
  formatParameterSpec: [
    {
      name: 'format',
      schema: {
        "enum" : ['csv', 'json', 'jsonp']
      }
    },
    {
      name: 'callback',
      schema: {
        type: 'string',
        pattern: '^[\\$_a-zA-Z0-9]+$'
      }

    }
  ]


};

