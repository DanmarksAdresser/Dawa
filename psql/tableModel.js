"use strict";

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

// incomplete, just for deriving TSV column when reindexing
const temaer = {
  table: 'temaer',
  primaryKey: ['id'],
  columns: [
    {name: 'id'},
    {
      name: 'tsv',
      derive: table => `to_tsvector('adresser', coalesce(${table}.fields->>'kode', '') || ' ' || coalesce(${table}.fields->>'navn', ''))`
    }
  ]
};

const supplerendebynavne = {
  table: 'supplerendebynavne',
  primaryKey: ['supplerendebynavn', 'kommunekode', 'postnr'],
  columns: [
    {name: 'supplerendebynavn'},
    {name: 'kommunekode'},
    {name: 'postnr'},
    {
      name: 'tsv',
      derive: table => ` to_tsvector('adresser', ${table}.supplerendebynavn)`
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
    {name: 'stormodtagerpostnrnavn'}]
};

const adresseMatFieldsNotCopiedFromAdgangsadresserMat = ['id', 'tsv', 'geom', 'objekttype', 'oprettet', 'aendret', 'ikraftfra', 'esdhreference', 'journalnummer'];

const adresser_mat = {
  table: 'adresser_mat',
  primaryKey: ['id'],
  columns: [
    ...enhedsadresser.columns,
    ...adgangsadresser_mat.columns.filter( col => !adresseMatFieldsNotCopiedFromAdgangsadresserMat.includes(col.name)),
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

exports.tables = {
  vejstykker,
  adgangsadresser,
  enhedsadresser,
  adgangsadresser_mat,
  ejerlav,
  postnumre,
  stormodtagere,
  adresser_mat,
  temaer,
  supplerendebynavne
};

exports.materializations = {
  adgangsadresser_mat: {
    table: 'adgangsadresser_mat',
    view: 'adgangsadresser_mat_view',
    primaryKey: ['id'],
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
    }]
  },
  adresser_mat: {
    table: 'adresser_mat',
    view: 'adresser_mat_view',
    primaryKey: ['id'],
    dependents: [{
      table: 'enhedsadresser',
      columns: ['id']
    }, {
      table: 'adgangsadresser_mat',
      columns: ['adgangsadresseid']
    }]
  }
};
