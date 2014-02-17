"use strict";

var model = require('./awsDataModel');
var _     = require('underscore');

var BASE_URL = 'http://dawa.aws.dk/api/pg';

var apiSpecUtil = require('./apiSpecUtil');

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
  kode4: {
    type: 'integer',
    minimum: 0,
    maximum: 9999
  }
};

function makeHref(baseUrl, spec, idArray) {
  return baseUrl +'/' + spec.model.plural + '/' + idArray.join('/');
}

function mapKommuneRef(dbJson, baseUrl) {
  return {
    href: makeHref(BASE_URL, module.exports.kommune, [dbJson.kode]),
    kode: dbJson.kode,
    navn: dbJson.navn
  };
}

function mapPostnummerRef(dbJson, baseUrl) {
  return {
    href: makeHref(BASE_URL, module.exports.postnummer, [dbJson.nr]),
    nr: dbJson.nr,
    navn: dbJson.navn
  };
}


var adgangsadresseFields = [
  {
    name: 'id',
    column: 'a_id'
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
    name: 'bygningsnavn'
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
  },
  {
    name: 'tsv',
    selectable: false
  }
];
/**
 * Specificerer hvilke felter en adresse har, samt hvordan de mapper til kolonnenavne i databasen
 * Felterne anvendes som kolonner i CSV-formateringen af adresser.
 */
var adresseFields = [
  {
    name: 'id',
    column: 'e_id'
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
    name: 'bygningsnavn'
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
  },
  {
    name: 'etage'
  },
  {
    name: 'dør',
    column: 'doer'
  },
  {
    name: 'adgangsadresseid',
    column: 'a_id'
  },
  {
    name: 'tsv',
    selectable: false
  }
];

var adgangsadresseParameters = [
  {
    name: 'id',
    type: 'string',
    schema: schema.uuid
  },
  {
    name: 'vejkode',
    type: 'integer',
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
    type: 'integer',
    schema: schema.postnr
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
    type: 'json',
    schema: schema.polygon,
    whereClause: polygonWhereClause,
    transform: polygonTransformer
  }
];

var adresseParameters = adgangsadresseParameters.concat([
  {
    name: 'etage'
  },
  {
    name: 'dør'
  }
]);

function polygonWhereClause(paramNumberString){
  return "ST_Contains(ST_GeomFromText("+paramNumberString+", 4326)::geometry, wgs84geom)\n";
}

function searchWhereClause(paramNumberString, spec) {
  var columnName = apiSpecUtil.getSearchColumn(spec);
  return "(" + columnName + " @@ to_tsquery('danish', " + paramNumberString + "))";
}

function endsWith(str, suffix) {
    return str.indexOf(suffix, str.length - suffix.length) !== -1;
}


function toPgSearchQuery(q) {
  q = q.replace(/[^a-zA-Z0-9ÆæØøÅåéE\*]/g, ' ');

  // normalize whitespace
  q = q.replace(/\s+/g, ' ');

  // remove leading / trailing whitespace
  q = q.replace(/^\s*/g, '');
  q = q.replace(/\s*$/g, '');

  // tokenize the query
  var tokens = q.split(' ');
  tokens = _.map(tokens, function(token) {
    if(endsWith(token, '*')) {
      token = token.substring(0, token.length - 1) + ':*';
    }
    return token;
  });

  return tokens.join(' & ');
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

function adressebetegnelse(adresseRow, adgangOnly) {
  var adresse = adresseRow.vejnavn;
  if(adresseRow.husnr) {
    adresse += ' ' + adresseRow.husnr;
  }
  if(!adgangOnly) {
    if(adresseRow.etage) {
      adresse += ' ' + adresseRow.etage + '.';
    }
    if(adresseRow.doer) {
      adresse += ' ' + adresseRow.doer;
    }
  }
  adresse += '\n';
  if(adresseRow.supplerendebynavn) {
    adresse += adresseRow.supplerendebynavn + '\n';
  }
  adresse += adresseRow.postnr + ' ' + adresseRow.postnrnavn;
  return adresse;
}

function mapAddress(rs){
  var adr = {};
  adr.id = rs.e_id;
  adr.href = BASE_URL + '/adresser/' + rs.e_id;
  adr.version = d(rs.e_version);
  if (rs.etage) adr.etage = rs.etage;
  if (rs.doer) adr.dør = rs.doer;
  adr.adressebetegnelse = adressebetegnelse(rs);
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
    return adressebetegnelse(row).replace(/\n/g, ', ');
  }
  return {
    tekst: adresseText(row),
    adresse: {
      id: row.e_id,
      href: BASE_URL + '/adresser/' + row.e_id
    }
  };
}

function adgangsadresseRowToAutocompleteJson(row) {
  function adresseText(row) {
    return adressebetegnelse(row, true).replace(/\n/g, ', ');
  }
  return {
    tekst: adresseText(row),
    adresse: {
      id: row.a_id,
      href: BASE_URL + '/adgangsadresser/' + row.a_id
    }
  };
}


var adresseApiSpec = {
  model: model.adresse,
  pageable: true,
  searchable: true,
  suggestable: true,
  fields: adresseFields,
  fieldMap: _.indexBy(adresseFields, 'name'),
  parameters: adresseParameters,
  mappers: {
    json: mapAddress,
    autocomplete: adresseRowToAutocompleteJson
  }
};

var adgangsadresseApiSpec = {
  model: model.adgangsadresse,
  pageable: true,
  searchable: true,
  suggestable: true,
  fields: adgangsadresseFields,
  fieldMap: _.indexBy(adgangsadresseFields, 'name'),
  parameters: adgangsadresseParameters,
  mappers: {
    json: mapAdganggsadresse,
    autocomplete: adgangsadresseRowToAutocompleteJson
  },
  baseQuery: function() {
    return {
      select: 'SELECT * from AdgangsadresserView',
      whereClauses: [],
      orderClauses: [],
      sqlParams: []
    };
  }
};


var vejnavnFields = [
  {
    name: 'navn',
    column: 'vejstykker.vejnavn'
  },
  {
    name: 'postnr',
    selectable: false,
    column: 'vp.postnr'
  },
  {
    name: 'kommunekode',
    selectable: false,
    column: 'vejstykker.kommunekode'
  },
  {
    name: 'tsv',
    selectable : false
  }
];

var vejnavnJsonMapper = function(row) {
  return {
    navn: row.navn
  };
};

function vejnavnRowToAutocompleteJson(row) {
  return {
    tekst: row.navn,
    vejnavn: {
      navn: row.navn,
      href: BASE_URL + '/vejnavne/' + encodeURIComponent(row.navn)
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
      name: 'navn'
    },
    {
      name: 'postnr',
      type: 'integer',
      schema: schema.postnr
    },
    {
      name: 'kommunekode',
      type: 'integer',
      schema: schema.kode4
    }
  ],
  mappers: {
    json: vejnavnJsonMapper,
    autocomplete: vejnavnRowToAutocompleteJson
  },
  baseQuery: function() {
    return {
      select: 'SELECT vejstykker.vejnavn as navn' +
        ' FROM vejstykker' +
        ' LEFT JOIN vejstykkerPostnumreMat  vp ON (vp.kommunekode = vejstykker.kommunekode AND vp.vejkode = vejstykker.kode)',
      whereClauses: [],
      groupBy: 'vejstykker.vejnavn',
      orderClauses: [],
      sqlParams: []
    };
  }
};

var postnummerFields = [
  {
    name: 'nr',
    column: {
      select: 'nr',
      where: 'm.nr'
    }
  },
  {name: 'navn', column: 'p.navn'},
  {name: 'kommuner'},
  {name: 'version', column: 'p.version'},
  {name: 'kommune', selectable: false, column: 'n.kode'},
  {name: 'tsv', selectable: false, column: 'p.tsv'}
];

var postnummerSpec = {
  model: model.postnummer,
  pageable: true,
  searchable: true,
  suggestable: true,
  fields: postnummerFields,
  fieldMap: _.indexBy(postnummerFields, 'name'),
  parameters: [{name: 'postnr'},
               {name: 'navn'},
               {name: 'kommune'}
              ],
  mappers: {
    json: postnummerJsonMapper,
    autocomplete: postnummerRowToAutocompleteJson
  },
  baseQuery: function() {
    return {
      select:''+
        'SELECT  p.nr, p.navn, p.version, json_agg(DISTINCT CAST((k.kode, k.navn) AS KommuneRef)) as kommuner '+
        'FROM postnumre_kommunekoder m '+
        'LEFT JOIN postnumre_kommunekoder n ON m.nr = n.nr '+
        'LEFT JOIN postnumre p ON p.nr = m.nr ' +
        ' LEFT JOIN kommuner k ON m.kode = k.kode',
      whereClauses: [],
      groupBy: 'p.nr, p.navn, p.version',
      orderClauses: [],
      sqlParams: []
    };
  }
};

function postnummerJsonMapper(row) {
  return {
    href: makeHref(BASE_URL, module.exports.postnummer, [row.nr]),
    nr:  row.nr,
    navn: row.navn,
    version: row.version,
    kommuner: _.map(row.kommuner, mapKommuneRef)
  };
}

function postnummerRowToAutocompleteJson(row) {
  return {
    tekst: row.nr + ' ' + row.navn,
    postnummer: {
      nr: row.nr,
      href: BASE_URL + '/postnumre/' + row.nr,
      navn: row.navn
    }
  };
}

var vejstykkeFields = [
  {
    name: 'kode',
    column: 'vejstykker.kode'
  },
  {
    name: 'kommunekode',
    column: 'vejstykker.kommunekode'
  },
  {
    name: 'navn',
    column: 'vejnavn'
  },
  {
    name: 'postnr',
    selectable: false,
    column: 'vp2.postnr'
  },
  {
    name: 'tsv',
    column: 'vejstykker.tsv',
    selectable: false
  }
];

function vejstykkeJsonMapper(row) {
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
    },
    {
      name: 'postnr'
    }
  ],
  mappers: {
    json: vejstykkeJsonMapper,
    autocomplete: vejstykkeRowToAutocompleteJson
  },
  baseQuery: function() {
    return {
      select: 'SELECT vejstykker.kode, vejstykker.kommunekode, vejstykker.version, vejnavn, vejstykker.tsv, max(kommuner.navn) AS kommunenavn, json_agg(PostnumreMini) AS postnumre' +
        ' FROM vejstykker' +
        ' LEFT JOIN kommuner ON vejstykker.kommunekode = kommuner.kode' +

        ' LEFT JOIN vejstykkerPostnumreMat  vp1 ON (vp1.kommunekode = vejstykker.kommunekode AND vp1.vejkode = vejstykker.kode)' +
        ' LEFT JOIN PostnumreMini ON (PostnumreMini.nr = vp1.postnr)' +
        ' LEFT JOIN vejstykkerPostnumreMat vp2 ON (vp2.kommunekode = vejstykker.kommunekode AND vp2.vejkode = vejstykker.kode)',
      whereClauses: [],
      groupBy: 'vejstykker.kode, vejstykker.kommunekode',
      orderClauses: [],
      sqlParams: []
    };
  }
};


var kommuneFields = [{name: 'kommunekode', column: 'kode'}, {name: 'navn'}, {name: 'tsv', selectable: false}];

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
    navn: row.navn
  };
}

function kommuneRowToAutocompleteJson(row) {
  return {
    tekst: row.navn,
    kommune: {
      navn: row.navn,
      href: BASE_URL + '/kommuner/' + encodeURIComponent(row.kode)
    }
  };
}

var supplerendeBynavnFields = [
  {
    name: 'navn',
    column: 'supplerendebynavn'
  },
  {
    name: 'kommunekode',
    selectable: false,
    column: 'supplerendebynavne.kommunekode'
  },
  {
    name: 'postnr',
    selectable: false,
    column: 'supplerendebynavne.postnr'
  },
  {
    name: 'tsv',
    selectable: false,
    column: 'supplerendebynavne.tsv'
  }
]

var supplerendeByavnJsonMapper = function(row) {
  return {
    href: makeHref(BASE_URL, supplerendeBynavnApiSpec, [row.supplerendebynavn]),
    navn: row.supplerendebynavn,
    postnumre: _.map(row.postnumre, mapPostnummerRef),
    kommuner: _.map(row.kommuner, mapKommuneRef)
  };
};

var supplerendeBynavnAutocompleteMapper = function(row) {
  return {
    tekst: row.supplerendebynavn,
    supplerendeBynavn: {
      href:  makeHref(BASE_URL, supplerendeBynavnApiSpec, [row.supplerendebynavn]),
      navn: row.supplerendebynavn
    }
  };
};

var supplerendeBynavnApiSpec = {
  model: model.supplerendebynavn,
  pageable: true,
  searchable: true,
  suggestable: true,
  fields: supplerendeBynavnFields,
  fieldMap: _.indexBy(supplerendeBynavnFields, 'name'),
  parameters: [
    {
      name: 'navn'
    },
    {
      name: 'kommunekode'
    },
    {
      name: 'postnr'
    }
  ],
  mappers: {
    json: supplerendeByavnJsonMapper,
    autocomplete: supplerendeBynavnAutocompleteMapper
  },
  baseQuery: function() {
    return {
      select: 'SELECT supplerendebynavn, json_agg(DISTINCT CAST((p.nr, p.navn) AS PostnummerRef)) as postnumre, json_agg(DISTINCT CAST((k.kode, k.navn) AS KommuneRef)) as kommuner' +
        ' FROM supplerendebynavne' +
        ' LEFT JOIN kommuner k ON supplerendebynavne.kommunekode = k.kode' +
        ' LEFT JOIN postnumre p ON supplerendebynavne.postnr = p.nr',
      whereClauses: [],
      groupBy: 'supplerendebynavne.supplerendebynavn',
      orderClauses: [],
      sqlParams: []
    };
  }
};


module.exports = {
  adresse: adresseApiSpec,
  adgangsadresse: adgangsadresseApiSpec,
  vejnavn: vejnavnApiSpec,
  postnummer: postnummerSpec,
  vejstykke: vejstykkeSpec,
  kommune: kommuneApiSpec,
  supplerendeBynavn: supplerendeBynavnApiSpec,

  pagingParameterSpec: [
    {
      name: 'side',
      type: 'integer',
      schema: schema.positiveInteger
    },
    {
      name: 'per_side',
      type: 'integer',
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



