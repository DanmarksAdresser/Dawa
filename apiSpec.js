"use strict";

var model = require('./awsDataModel');
var _     = require('underscore');

var BASE_URL = 'http://dawa.aws.dk/api/pg';
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

function toPgSuggestQuery(q) {
  // normalize whitespace
  q = q.replace(/\s+/g, ' ');

  var hasTrailingWhitespace = /.*\s$/.test(q);
  var tsq = toPgSearchQuery(q);

  // Since we do suggest, if there is no trailing whitespace,
  // the last search clause should be a prefix search
  if (!hasTrailingWhitespace) {
    tsq += ":*";
  }
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
  if (rs.etage) adr.etage = rs.etage;
  if (rs.dør) adr.dør = rs.doer;
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

function adresseRowToAutocompleteJson(row) {
  function adresseText(row) {
    var result =  row.vejnavn + ' ' + row.husnr;
    if(row.etage || row.doer) {
      result += ', ';
      if(row.etage) {
        result += row.etage + '.';
      }
      if(row.doer) {
        result += ' ' +row.doer;
      }
    }
    if(row.supplerendebynavn) {
      result += ', ' + row.supplerendebynavn;
    }
    result += ', ' + row.postnr + ' ' + row.postnrnavn;
    return result;
  }
  return {
    tekst: adresseText(row),
    adresse: {
      id: row.id,
      href: BASE_URL + '/adresser/' + row.id
    }
  };
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
          pattern: '^(\\d{1,4})$'}
};

var adresseApiSpec = {
  model: model.adresse,
  pageable: true,
  searchable: true,
  suggestable: true,
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
      schema: schema.kode4
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
      name: 'kommunekode'
    },
    {
      name: 'ejerlavkode'
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
    }
  ],
  mappers: {
    json: mapAddress,
    autocomplete: adresseRowToAutocompleteJson
  }
};

var vejnavnFields = [
  {
    name: 'vejnavn'
  }
];

var vejnavnJsonMapper = function(row) {
  return {
    vejnavn: row.vejnavn
  };
};

function vejnavnRowToAutocompleteJson(row) {
  return {
    tekst: row.vejnavn,
    vejnavnn: {
      vejnavn: row.vejnavn,
      href: BASE_URL + '/vejnavne/' + encodeURIComponent(row.vejnavn)
    }
  };
}



var vejnavnApiSpec = {
  model: model.vejnavn,
  pageable: true,
  searchable: true,
  suggestable: true,
  fields: vejnavnFields,
  fieldMap: _.indexBy(vejnavnFields, 'name'),
  parameters: [
    {
      name: 'vejnavn'
    }
  ],
  mappers: {
    json: vejnavnJsonMapper,
    autocomplete: vejnavnRowToAutocompleteJson
  }
};

var postnummerFields = [
  {
    name: 'nr'
  },
  {
    name: 'navn'
  },
  {
    name: 'version'
  }
];

function postnummerJsonMapper(row) {
  return {
    nr: "" + row.nr,
    navn: row.navn,
    version: row.version
  };
}

function postnummerRowToAutocompleteJson(row) {
  return {
    tekst: row.nr + ' ' + row.navn,
    postnummer: {
      nr: "" + row.nr,
      href: BASE_URL + '/postnumre/' + row.nr
    }
  };
}


var postnummerSpec = {
  model: model.postnummer,
  pageable: true,
  searchable: true,
  suggestable: true,
  fields: postnummerFields,
  fieldMap: _.indexBy(postnummerFields, 'name'),
  parameters: [
    {
      name: 'nr'
    },
    {
      name: 'navn'
    }
  ],
  mappers: {
    json: postnummerJsonMapper,
    autocomplete: postnummerRowToAutocompleteJson
  }
};

var vejstykkeFields = [
  {
    name: 'kode'
  },
  {
    name: 'kommunekode'
  },
  {
    name: 'navn',
    column: 'vejnavn'
  }
];

function vejstykkeJsonMapper(row) {
  console.log(JSON.stringify(row));
  return {
    kode: row.kode,
    navn: row.vejnavn,
    kommune: {
      kode: "" + row.kommunekode,
      navn: row.kommunenavn
    },
    postnumre: row.postnumre
  };
}

function vejstykkeRowToAutocompleteJson(row) {
  return {
    tekst: row.navn,
    vejstykke: {
      href: BASE_URL + '/vejstykker/' + row.kommunekode + '/' + row.kode
    }
  };
}


var vejstykkeSpec = {
  model: model.vejstykke,
  pageable: true,
  searchable: true,
  suggestable: true,
  fields: vejstykkeFields,
  fieldMap: _.indexBy(vejstykkeFields, 'name'),
  parameters: [
    {
      name: 'kode'
    },
    {
      name: 'kommunekode'
    },
    {
      name: 'navn'
    }
  ],
  mappers: {
    json: vejstykkeJsonMapper,
    autocomplete: vejstykkeRowToAutocompleteJson
  }
}


var kommuneFields = [{name: 'kommunekode', column: 'kode'}, {name: 'navn'}];

var kommuneApiSpec = {
  model: model.kommune,
  pageable: true,
  searchable: true,
  suggestable: true,
  fields: kommuneFields,
  fieldMap: _.indexBy(kommuneFields, 'name'),
  parameters: [{name: 'navn'},
               {name: 'kommunekode'}
              ],
  mappers: {
    json: kommuneJsonMapper,
    autocomplete: kommuneRowToAutocompleteJson
  }
};


function kommuneJsonMapper(row) {
  return {
    kode: row.kode,
    navn: row.navn,
  };
};

function kommuneRowToAutocompleteJson(row) {
  return {
    tekst: row.navn,
    kommune: {
      navn: row.navn,
      href: BASE_URL + '/kommuner/' + encodeURIComponent(row.kode)
    }
  };
}


module.exports = {
  adresse: adresseApiSpec,
  vejnavn: vejnavnApiSpec,
  postnummer: postnummerSpec,
  vejstykke: vejstykkeSpec,
  kommune: kommuneApiSpec,

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
  ],
  searchParameterSpec: [
    {
      name: 'q',
      type: 'string',
      whereClause: searchWhereClause,
      transform: toPgSearchQuery
    }
  ],

  autocompleteParameterSpec: [
    {
      name: 'q',
      type: 'string',
      whereClause: searchWhereClause,
      transform: toPgSuggestQuery
    }
  ]
};



