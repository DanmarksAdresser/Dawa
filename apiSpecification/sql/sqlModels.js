"use strict";

var dagiTemaer = require('../dagiTemaer');
var dbapi = require('../../dbapi');
exports.postnummer = {
  baseQuery: function() {
    return {
      select:[],
      from: ['PostnumreKommunekoderMat m '+
        'LEFT JOIN PostnumreKommunekoderMat n ON m.postnr = n.postnr '+
        'LEFT JOIN postnumre p ON p.nr = m.postnr ' +
        " LEFT JOIN DagiTemaer k ON k.tema = 'kommune' AND m.kommunekode = k.kode",
      " LEFT JOIN DagiTemaer dagi ON dagi.tema = 'postdistrikt' AND dagi.kode = m.postnr"],
      whereClauses: [],
      groupBy: 'p.nr, p.navn, p.version, dagi.tema, dagi.kode',
      orderClauses: [],
      sqlParams: []
    };
  },
  columns: {
    nr: {
      select: 'p.nr',
      where: 'm.postnr'
    },
    navn: {
      select: 'p.navn'
    },
    version: {
      select: 'p.version',
      where: 'p.version'
    },
    kommune: {
      select: null,
      where: 'n.kommunekode'
    },
    geom_json: {
      select: function(sqlParts, sqlModel, params) {
        var sridAlias = dbapi.addSqlParameter(sqlParts, params.srid || 4326);
        return 'ST_AsGeoJSON(ST_Transform(dagi.geom,' + sridAlias + '))';
      }
    },
    kommuner: {
      select: 'json_agg(DISTINCT CAST((k.kode, k.navn) AS KommuneRef))'
    },
    tsv: {
      select: null,
      where: 'p.tsv'
    }
  }
};

exports.supplerendebynavn = {
  baseQuery: function() {
    return {
      select: [],
      from: [' supplerendebynavne s' +
        ' LEFT JOIN supplerendebynavne filter ON s.supplerendebynavn = filter.supplerendebynavn' +
        " LEFT JOIN DagiTemaer k ON k.tema = 'kommune' AND s.kommunekode = k.kode" +
        ' LEFT JOIN postnumre p ON s.postnr = p.nr'],
      whereClauses: [],
      groupBy: 's.supplerendebynavn, s.tsv',
      orderClauses: [],
      sqlParams: []
    };
  },
  columns:  {
    navn: {
      select: 's.supplerendebynavn',
      where: 's.supplerendebynavn'
    },
    kommunekode: {
      select: null,
      where: 'filter.kommunekode'
    },
    postnr: {
      select: null,
      where: 'filter.postnr'
    },
    kommuner: {
      select: 'json_agg(DISTINCT CAST((k.kode, k.navn) AS KommuneRef))'
    },
    postnumre: {
      select: 'json_agg(DISTINCT CAST((p.nr, p.navn) AS PostnummerRef))'
    },
    tsv: {
      select: null,
      where: 's.tsv'
    }
  }
};

exports.vejnavn = {
  baseQuery: function() {
    return {
      select: [],
      from: [
        ' vejstykker' +
          " LEFT JOIN DagiTemaer k ON k.tema = 'kommune' AND vejstykker.kommunekode = k.kode" +
          ' LEFT JOIN vejstykkerPostnumreMat  vp1 ON (vp1.kommunekode = vejstykker.kommunekode AND vp1.vejkode = vejstykker.kode)' +
          ' LEFT JOIN Postnumre p ON (p.nr = vp1.postnr)' +
          ' LEFT JOIN vejstykkerPostnumreMat vp2 ON (vp2.kommunekode = vejstykker.kommunekode AND vp2.vejkode = vejstykker.kode)'
      ],
      whereClauses: [],
      groupBy: 'vejstykker.vejnavn, vejstykker.tsv',
      orderClauses: [],
      sqlParams: []
    };
  },
  columns: {
    navn: {
      select: 'vejstykker.vejnavn',
      where:'vejstykker.vejnavn'
    },
    postnr: {
      select: null,
      where: 'vp2.postnr'
    },
    kommunekode: {
      select: null,
      where: 'vejstykker.kommunekode'
    },
    kommuner: {
      select: 'json_agg(DISTINCT CAST((k.kode, k.navn) AS KommuneRef))'
    },
    postnumre: {
      select: 'json_agg(DISTINCT CAST((p.nr, p.navn) AS PostnummerRef))'
    },
    tsv: {
      select: null,
      where: 'vejstykker.tsv'
    }
  }
};

exports.vejstykke = {
  baseQuery: function() {
    return {
      select: [],
      from: ['vejstykker' +
        " LEFT JOIN DagiTemaer kommuner ON kommuner.tema = 'kommune' AND vejstykker.kommunekode = kommuner.kode" +
        ' LEFT JOIN vejstykkerPostnumreMat  vp1 ON (vp1.kommunekode = vejstykker.kommunekode AND vp1.vejkode = vejstykker.kode)' +
        ' LEFT JOIN Postnumre p ON (p.nr = vp1.postnr)' +
        ' LEFT JOIN vejstykkerPostnumreMat vp2 ON (vp2.kommunekode = vejstykker.kommunekode AND vp2.vejkode = vejstykker.kode)'],
      whereClauses: [],
      groupBy: 'vejstykker.kode, vejstykker.kommunekode',
      orderClauses: [],
      sqlParams: []
    };
  },
  columns: {
    kode: {
      column: 'vejstykker.kode'
    },
    kommunekode: {
      column: 'vejstykker.kommunekode'
    },
    kommunenavn: {
      select: 'max(kommuner.navn)',
      where: null
    },
    version: {
      column: 'vejstykker.version'
    },
    navn: {
      column: 'vejstykker.vejnavn'
    },
    postnr: {
      select: null,
      where: 'vp2.postnr'
    },
    postnumre: {
      select: 'json_agg(DISTINCT CAST((p.nr, p.navn) AS PostnummerRef))'
    },
    tsv: {
      select: null,
      where: 'vejstykker.tsv'
    }
  }
};

exports.adgangsadresse = {
  baseQuery: function() {
    return {
      select: [],
      from: ['AdgangsadresserView'],
      whereClauses: [],
      orderClauses: [],
      sqlParams: []
    };
  },
  columns: {
    id: {
      column: 'a_id'
    },
    etrs89koordinat_øst: {
      column: 'oest'
    },
    etrs89koordinat_nord: {
      column: 'nord'
    },
    wgs84koordinat_bredde: {
      column: 'lat'
    },
    wgs84koordinat_længde: {
      column: 'long'
    },
    nøjagtighed: {
      column: 'noejagtighed'
    },
    ddkn_m100: {
      column: 'kn100mdk'
    },
    ddkn_km1: {
      column: 'kn1kmdk'
    },
    ddkn_km10: {
      column: 'kn10kmdk'
    },
    adressepunktændringsdato: {
      column: 'adressepunktaendringsdato'
    },
    geom_json: {
      select: function(sqlParts, sqlModel, params) {
        var sridAlias = dbapi.addSqlParameter(sqlParts, params.srid || 4326);
        return 'ST_AsGeoJSON(ST_Transform(AdgangsadresserView.geom,' + sridAlias + '))';
      }
    },
    oprettet: {
      select: 'a_oprettet'
    },
    ændret: {
      select: 'a_aendret'
    },
    ikrafttrædelse: {
      select: 'a_ikraftfra'
    },
    tsv: {
      select: null,
      where: 'tsv'
    }
  }
};

exports.adresse = {
  baseQuery: function() {
    return {
      select: [],
        from: ['Adresser'],
      whereClauses: [],
      orderClauses: [],
      sqlParams: []
    };
  },
  columns: {
    id: {
      column: 'e_id'
    },
    adgangsadresseid: {
      column: 'a_id'
    },
    dør: {
      column: 'doer'
    },
    tsv: {
      select: null,
      where: 'e_tsv'
    },
    etrs89koordinat_øst: {
      column: 'oest'
    },
    etrs89koordinat_nord: {
      column: 'nord'
    },
    wgs84koordinat_bredde: {
      column: 'lat'
    },
    wgs84koordinat_længde: {
      column: 'long'
    },
    nøjagtighed: {
      column: 'noejagtighed'
    },
    ddkn_m100: {
      column: 'kn100mdk'
    },
    ddkn_km1: {
      column: 'kn1kmdk'
    },
    ddkn_km10: {
      column: 'kn10kmdk'
    },
    adressepunktændringsdato: {
      column: 'adressepunktaendringsdato'
    },
    geom_json: {
      select: function(sqlParts, sqlModel, params) {
        var sridAlias = dbapi.addSqlParameter(sqlParts, params.srid || 4326);
        return 'ST_AsGeoJSON(ST_Transform(geom,' + sridAlias + '))';
      }
    },
    adgangsadresse_oprettet: {
      select: 'a_oprettet'
    },
    adgangsadresse_ændret: {
      select: 'a_aendret'
    },
    adgangsadresse_ikrafttrædelse: {
      select: 'a_ikraftfra'
    }
  }
};

// no column mappings necessary for dagi temaer.
dagiTemaer.forEach(function(tema) {
  exports[tema.singular] = {
    baseQuery: function(parameters) {
      return {
        select: [],
        from: ['DagiTemaer'],
        whereClauses: ['tema = $1'],
        orderClauses: [],
        sqlParams: [tema.singular]
      };
    },
    columns: {
      geom_json: {
        select: function(sqlParts, sqlModel, params) {
          var sridAlias = dbapi.addSqlParameter(sqlParts, params.srid || 4326);
          return 'ST_AsGeoJSON(ST_Transform(geom,' + sridAlias + '))';
        }
      }
    }
  };
});
