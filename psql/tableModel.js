"use strict";

const _ = require('underscore');
const temaModels = require('../dagiImport/temaModels');
const geomDistinctClause = (a, b) => `${a} IS DISTINCT FROM ${b} OR NOT ST_Equals(${a}, ${b})`;
const dar10TableModels = require('../dar10/dar10TableModels');

const vejstykker = {
  entity: 'vejstykke',
  table: 'vejstykker',
  primaryKey: ['kommunekode', 'kode'],
  columns: [{
    name: 'kommunekode'
  }, {
    name: 'kode'
  }, {
    name: 'oprettet'
  }, {
    name: 'aendret'
  }, {
    name: 'vejnavn'
  }, {
    name: 'adresseringsnavn'
  }, {
    name: 'tsv',
    public: false,
    derive: (table) => {
      return `to_tsvector('adresser', processForIndexing(coalesce(${table}.vejnavn, '')))`;
    }
  }, {
    name: 'geom',
    public: false
  }, {
    name: 'navngivenvej_id'
  }, {
    name: 'navngivenvejkommunedel_id'
  }]
};

const enhedsadresser = {
  entity: 'adresse',
  table: 'enhedsadresser',
  primaryKey: ['id'],
  columns: [{
    name: 'id'
  }, {
    name: 'adgangsadresseid'
  }, {
    name: 'oprettet'
  }, {
    name: 'ikraftfra'
  }, {
    name: 'aendret'
  }, {
    name: 'etage'
  }, {
    name: 'doer'
  }, {
    name: 'objekttype'
  }, {
    name: 'kilde'
  }, {
    name: 'esdhreference'
  }, {
    name: 'journalnummer'
  }]
};

const adgangsadresser = {
  entity: 'adgangsadresse',
  table: 'adgangsadresser',
  primaryKey: ['id'],
  columns: [{
    name: 'id'
  }, {
    name: 'kommunekode'
  }, {
    name: 'vejkode'
  }, {
    name: 'husnr'
  }, {
    name: 'supplerendebynavn'
  }, {
    name: 'postnr'
  }, {
    name: 'ejerlavkode'
  }, {
    name: 'matrikelnr'
  }, {
    name: 'esrejendomsnr'
  }, {
    name: 'oprettet'
  }, {
    name: 'ikraftfra'
  }, {
    name: 'aendret'
  }, {
    name: 'adgangspunktid'
  }, {
    name: 'etrs89oest'
  }, {
    name: 'etrs89nord'
  }, {
    name: 'noejagtighed'
  }, {
    name: 'adgangspunktkilde'
  }, {
    name: 'placering'
  }, {
    name: 'tekniskstandard'
  }, {
    name: 'tekstretning'
  }, {
    name: 'adressepunktaendringsdato'
  }, {
    name: 'objekttype'
  }, {
    name: 'husnummerkilde'
  }, {
    name: 'esdhreference'
  }, {
    name: 'journalnummer'
  }, {
    name: 'hoejde'
  }, {
    name: 'navngivenvej_id'
  }, {
    name: 'navngivenvejkommunedel_id',
  }, {
    name: 'supplerendebynavn_id'
  }, {
    name: 'darkommuneinddeling_id'
  }, {
    name: 'adressepunkt_id'
  }, {
    name: 'postnummer_id'
  }]
};

const ejerlav = {
  entity: 'ejerlav',
  table: 'ejerlav',
  primaryKey: ['kode'],
  columns: [{
    name: 'kode'
  }, {
    name: 'navn'
  }, {
    name: 'tsv',
    public: false,
    derive: (table) =>
      `to_tsvector('adresser', processForIndexing(coalesce(${table}.navn, '')))`
  }]
};

const postnumre = {
  entity: 'postnummer',
  table: 'postnumre',
  primaryKey: ['nr'],
  columns: [{
    name: 'nr'
  }, {
    name: 'navn'
  }, {
    name: 'tsv',
    public: false,
    derive: (table) =>
      `to_tsvector('adresser', coalesce(to_char(${table}.nr, '0000'), '') || ' ' || coalesce(${table}.navn, ''))`
  }, {
    name: 'stormodtager'
  }]
};

const stormodtagere = {
  entity: 'stormodtager',
  table: 'stormodtagere',
  primaryKey: ['adgangsadresseid'],
  columns: [{
    name: 'nr'
  }, {
    name: 'navn'
  }, {
    name: 'adgangsadresseid'
  }]
};

const navngivenvej = {
  table: 'navngivenvej',
  entity: 'navngivenvej',
  primaryKey: ['id'],
  columns: [
    {name: 'id'},
    {name: 'darstatus'},
    {name: 'oprettet'},
    {name: 'ændret'},
    {name: 'navn'},
    {name: 'adresseringsnavn'},
    {name: 'administreresafkommune'},
    {name: 'beskrivelse'},
    {name: 'retskrivningskontrol'},
    {name: 'udtaltvejnavn'}
  ]
};

const navngivenvej_postnummer = {
  table: 'navngivenvej_postnummer',
  entity: 'navngivenvejpostnummerrelation',
  primaryKey: ['navngivenvej_id', 'postnr'],
  columns: [
    {name: 'id'},
    {name: 'navngivenvej_id'},
    {name: 'postnummer_id'},
    {name: 'postnr'},
    {
      name: 'tekst',
      public: false
    }
  ]
};

const navngivenvejkommunedel_postnr_mat = {
  table: 'navngivenvejkommunedel_postnr_mat',
  entity: 'navngivenvejkommunedel_postnummer',
  primaryKey: ['navngivenvejkommunedel_id', 'postnummer_id'],
  columns: [
    {name: 'navngivenvejkommunedel_id'},
    {name: 'postnummer_id'},
    {name: 'adgangsadresseid'}
  ]
};

const stednavne = {
  table: 'stednavne',
  entity: 'stednavn',
  primaryKey: ['id'],
  columns: [
    {name: 'id'},
    {name: 'ændret'},
    {name: 'geo_version'},
    {name: 'geo_ændret'},
    {name: 'hovedtype'},
    {name: 'undertype'},
    {name: 'navn'},
    {name: 'navnestatus'},
    {name: 'bebyggelseskode'},
    {
      name: 'tsv',
      derive: table => `to_tsvector('adresser', ${table}.navn)`
    },
    {
      name: 'visueltcenter',
      derive: table => `ST_ClosestPoint(${table}.geom, ST_Centroid(${table}.geom))`
    },
    {
      name: 'geom',
      distinctClause: geomDistinctClause
    }
  ]
};

const stednavne_adgadr = {
  table: 'stednavne_adgadr',
  entity: 'stednavntilknytning',
  primaryKey: ['stednavn_id', 'adgangsadresse_id'],
  columns: [{
    name: 'stednavn_id'
  }, {
    name: 'adgangsadresse_id'
  }]
};

const vejstykkerpostnumremat = {
  table: 'vejstykkerpostnumremat',
  entity: 'vejstykkepostnummerrelation',
  primaryKey: ['postnr', 'kommunekode', 'vejkode'],
  columns: [
    {name: 'navngivenvej_id'},
    {name: 'navngivenvejkommunedel_id'},
    {name: 'postnummer_id'},
    {name: 'kommunekode'},
    {name: 'vejkode'},
    {name: 'postnr'},
    {
      name: 'tekst',
      public: false
    }
  ]
};

const postnrTsVector = (nr, navn) => `to_tsvector('adresser', coalesce(to_char(${nr}, '0000'), '') || ' ' || coalesce(${navn}, ''))`;

const postnrOrStormodtagerTsVector = (nr, navn, stormodtagernr, stormodtagernavn) =>
  `(${postnrTsVector(nr, navn)}::text || ' ' || ${postnrTsVector(stormodtagernr, stormodtagernavn)}::text)::tsvector`
const adgangsadresser_mat = {
  table: 'adgangsadresser_mat',
  primaryKey: ['id'],
  columns: [...adgangsadresser.columns,
    {name: 'ejerlavnavn'},
    {
      name: 'tsv',
      public: false,
      derive: table =>
        `setweight(to_tsvector('adresser', processforindexing(${table}.vejnavn || ' ' || formatHusnr(${table}.husnr))), 'A') ||
         setweight(to_tsvector('adresser', processforindexing(COALESCE(${table}.supplerendebynavn, ''))), 'C') || 
         setweight(${postnrOrStormodtagerTsVector(`${table}.postnr`, `${table}.postnrnavn`, `${table}.stormodtagerpostnr`, `${table}.stormodtagerpostnrnavn`)}, 'D')`
    },
    {
      name: 'geom',
      public: false,
      derive: table =>
        `ST_SetSRID(ST_MakePoint(${table}.etrs89oest, ${table}.etrs89nord), 25832)`
    },
    {name: 'vejnavn'},
    {name: 'adresseringsvejnavn'},
    {name: 'postnrnavn'},
    {name: 'stormodtagerpostnr'},
    {name: 'stormodtagerpostnrnavn'},
    {name: 'vejpunkt_id'},
    {name: 'vejpunkt_kilde'},
    {name: 'vejpunkt_noejagtighedsklasse'},
    {name: 'vejpunkt_tekniskstandard'},
    {name: 'vejpunkt_geom'}]
};

const adresseMatFieldsNotCopiedFromAdgangsadresserMat = ['id', 'tsv', 'geom', 'objekttype', 'oprettet', 'aendret', 'ikraftfra', 'esdhreference', 'journalnummer'];

const adresser_mat = {
  table: 'adresser_mat',
  primaryKey: ['id'],
  columns: [
    ...enhedsadresser.columns,
    ...adgangsadresser_mat.columns.filter(col => !adresseMatFieldsNotCopiedFromAdgangsadresserMat.includes(col.name)),
    {name: 'a_objekttype'},
    {name: 'a_oprettet'},
    {name: 'a_aendret'},
    {name: 'a_ikraftfra'},
    {name: 'geom', public: false},
    {
      name: 'tsv',
      public: false,
      derive: table =>
        `setweight(to_tsvector('adresser', processforindexing(${table}.vejnavn || ' ' || formatHusnr(${table}.husnr))), 'A') ||
         setweight(to_tsvector('adresser', processforindexing(COALESCE(etage, '') ||' ' || COALESCE(doer, ''))), 'B') || 
         setweight(to_tsvector('adresser', processforindexing(COALESCE(${table}.supplerendebynavn, ''))), 'C') || 
         setweight(${postnrOrStormodtagerTsVector(`${table}.postnr`, `${table}.postnrnavn`, `${table}.stormodtagerpostnr`, `${table}.stormodtagerpostnrnavn`)}, 'D')`
    }]
};

const vejpunkter = {
  table: 'vejpunkter',
  entity: 'vejpunkt',
  primaryKey: ['id'],
  columns: [
    {name: 'id'},
    {name: 'husnummerid'},
    {name: 'kilde'},
    {name: 'noejagtighedsklasse'},
    {name: 'tekniskstandard'},
    {name: 'geom'}
  ]
};
const jordstykker = {
  table: 'jordstykker',
  entity: 'jordstykke',
  primaryKey: ['ejerlavkode', 'matrikelnr'],
  columns: [{
    name: 'ejerlavkode'
  }, {
    name: 'matrikelnr'
  }, {
    name: 'kommunekode'
  }, {
    name: 'sognekode'
  }, {
    name: 'regionskode'
  }, {
    name: 'retskredskode'
  }, {
    name: 'esrejendomsnr'
  }, {
    name: 'udvidet_esrejendomsnr'
  }, {
    name: 'sfeejendomsnr'
  }, {
    name: 'geom',
    distinctClause: geomDistinctClause
  }]
};

const jordstykker_adgadr = {
  table: 'jordstykker_adgadr',
  entity: 'jordstykketilknytning',
  primaryKey: ['ejerlavkode', 'matrikelnr', 'adgangsadresse_id'],
  columns: [
    {name: 'ejerlavkode'},
    {name: 'matrikelnr'},
    {name: 'adgangsadresse_id'}
  ]
};

const supplerendebynavne_mat = {
  table: 'supplerendebynavne_mat',
  primaryKey: ['navn'],
  columns: [
    {
      name: 'navn'
    },
    {
      name: 'adgangsadresseid'
    },
    {
      name: 'tsv',
      derive: table => `to_tsvector('adresser', processForIndexing(coalesce(${table}.navn, '')))`
    }]
};

const supplerendebynavn_postnr_mat = {
  table: 'supplerendebynavn_postnr_mat',
  primaryKey: ['supplerendebynavn', 'postnr'],
  columns: [
    {
      name: 'supplerendebynavn'
    },
    {
      name: 'postnr'
    },
    {
      name: 'adgangsadresseid',
      public: false
    }
  ]
};

const supplerendebynavn_kommune_mat = {
  table: 'supplerendebynavn_kommune_mat',
  primaryKey: ['supplerendebynavn', 'kommunekode'],
  columns: [
    {
      name: 'supplerendebynavn'
    },
    {
      name: 'kommunekode'
    },
    {
      name: 'adgangsadresseid',
      public: false
    }
  ]
};

const dagiTables = temaModels.modelList.reduce((memo, temaModel) => {
  memo[temaModel.table] = temaModels.toTableModel(temaModel);
  memo[temaModel.tilknytningTable] = temaModels.toTilknytningTableModel(temaModel);
  return memo;
}, {});

const dagiMaterializations = temaModels.modelList.reduce((memo, temaModel) => {
  memo[temaModel.tilknytningTable] = temaModels.toTilknytningMaterialization(temaModel);
  return memo;
}, {});

const tilknytninger_mat = {
  table: 'tilknytninger_mat',
  primaryKey: ['adgangsadresseid'],
  columns: [
    {name: 'adgangsadresseid'},
    {name: 'kommunekode'},
    {name: 'kommunenavn'},
    {name: 'regionskode'},
    {name: 'regionsnavn'},
    {name: 'sognekode'},
    {name: 'sognenavn'},
    {name: 'politikredskode'},
    {name: 'politikredsnavn'},
    {name: 'retskredskode'},
    {name: 'retskredsnavn'},
    {name: 'opstillingskredskode'},
    {name: 'opstillingskredsnavn'},
    {name: 'valglandsdelsbogstav'},
    {name: 'valglandsdelsnavn'},
    {name: 'storkredsnummer'},
    {name: 'storkredsnavn'},
    {name: 'zone'},
  ]
};

const dar10RawTables = _.indexBy(Object.values(dar10TableModels.rawTableModels), 'table');
const dar10HistoryTables = _.indexBy(Object.values(dar10TableModels.historyTableModels), 'table');
const dar10CurrentTables = _.indexBy(Object.values(dar10TableModels.currentTableModels), 'table');
exports.tables = Object.assign({
    adgangsadresser,
    enhedsadresser,
    adgangsadresser_mat,
    ejerlav,
    postnumre,
    stormodtagere,
    adresser_mat,
    supplerendebynavne_mat,
    supplerendebynavn_postnr_mat,
    supplerendebynavn_kommune_mat,
    vejpunkter,
    navngivenvej,
    navngivenvej_postnummer,
    navngivenvejkommunedel_postnr_mat,
    vejstykker,
    vejstykkerpostnumremat,
    stednavne,
    stednavne_adgadr,
    jordstykker,
    jordstykker_adgadr,
    tilknytninger_mat
  }, dagiTables,
  dar10RawTables,
  dar10HistoryTables,
  dar10CurrentTables);

exports.materializations = Object.assign({

  adgangsadresser_mat: {
    table: 'adgangsadresser_mat',
    view: 'adgangsadresser_mat_view',
    dependents: [{
      table: 'adgangsadresser',
      columns: ['id']
    }, {
      table: 'ejerlav',
      columns: ['ejerlavkode']
    }, {
      table: 'postnumre',
      columns: ['postnr']
    }, {
      table: 'vejstykker',
      columns: ['kommunekode', 'vejkode']
    }, {
      table: 'stormodtagere',
      columns: ['id']
    }, {
      table: 'vejpunkter',
      columns: ['vejpunkt_id']
    }]
  },
  adresser_mat: {
    table: 'adresser_mat',
    view: 'adresser_mat_view',
    dependents: [{
      table: 'enhedsadresser',
      columns: ['id']
    }, {
      table: 'adgangsadresser_mat',
      columns: ['adgangsadresseid']
    }]
  },
  jordstykker_adgadr: {
    table: 'jordstykker_adgadr',
    view: 'jordstykker_adgadr_view',
    dependents: [
      {
        table: 'adgangsadresser_mat',
        columns: ['adgangsadresse_id']
      }
      // also depends on jordstykker, but we don't have history on these and
      // therefore don't support incremental updates of these, so they are updated separately.
    ]
  },
  stednavne_adgadr: {
    table: 'stednavne_adgadr',
    view: 'stednavne_adgadr_view',
    dependents: [
      {
        table: 'adgangsadresser_mat',
        columns: ['adgangsadresse_id']
      }
    ]
  },
  tilknytninger_mat: {
    table: 'tilknytninger_mat',
    view: 'tilknytninger_mat_view',
    dependents: [
      {
        table: 'adgangsadresser_mat',
        columns: ['adgangsadresseid']
      }
    ]
  },
  supplerendebynavne: {
    table: 'supplerendebynavne',
    view: 'supplerendebynavne_view',
    dependents: [
      {
        table: 'adgangsadresser',
        columns: ['adgangsadresseid']
      }
    ]
  },
  supplerendebynavn_postnr: {
    table: 'supplerendebynavn_postnr',
    view: 'supplerendebynavn_postnr_view',
    dependents: [
      {
        table: 'adgangsadresser',
        columns: ['adgangsadresseid']
      }
    ]
  },
  supplerendebynavn_kommune: {
    table: 'supplerendebynavn_kommune',
    view: 'supplerendebynavn_kommune_view',
    dependents: [
      {
        table: 'adgangsadresser',
        columns: ['adgangsadresseid']
      }
    ]
  }

}, dagiMaterializations);