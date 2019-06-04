"use strict";

const _ = require('underscore');
const temaModels = require('../dagiImport/temaModels');
const dar10TableModels = require('../dar10/dar10TableModels');
const {
  geomColumns, geomColumn, tsvColumn, visueltCenterComputed, visueltCenterDerived,
  visueltCenterFromSource, bboxColumn, preservedColumn, offloadedGeomColumn,
  offloadedGeomBlobrefColumn
} = require('@dawadk/import-util/src/common-columns');
const {name} = require('@dawadk/import-util/src/table-diff-protocol');

const vejstykker = {
  entity: 'vejstykke',
  table: 'vejstykker',
  primaryKey: ['kommunekode', 'kode'],
  columns: [
    {
      name: 'kommunekode'
    },
    {
      name: 'kode'
    },
    {
      name: 'oprettet'
    },
    preservedColumn({
      name: 'aendret'
    }),
    {
      name: 'vejnavn'
    },
    {
      name: 'adresseringsnavn'
    },
    {
      name: 'navngivenvej_id'
    }, {
      name: 'navngivenvejkommunedel_id'
    }]
};

const vejmidter = {
  table: 'vejmidter',
  entity: 'vejmidte',
  primaryKey: ['kommunekode', 'kode'],
  columns: [
    {
      name: 'kommunekode'
    },
    {
      name: 'kode'
    },
    offloadedGeomColumn({}),
    offloadedGeomBlobrefColumn({})
  ]
};

const navngivenvejkommunedel_mat = {
  table: 'navngivenvejkommunedel_mat',
  primaryKey: ['id'],
  columns: [
    {
      name: 'id'
    },
    {
      name: 'darstatus'
    },
    {
      name: 'kommunekode'
    },
    {
      name: 'kode'
    },
    {
      name: 'oprettet'
    },
    {
      name: 'nedlagt'
    },
    {
      name: 'vejnavn'
    },
    {
      name: 'adresseringsnavn'
    },
    tsvColumn({
      deriveFn: (table) => `to_tsvector('adresser', processForIndexing(coalesce(${table}.vejnavn, '')))`
    }),
    geomColumn({}),
    {
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
  }, preservedColumn({
    name: 'kilde'
  }), preservedColumn({
    name: 'esdhreference'
  }), preservedColumn({
    name: 'journalnummer'
  })]
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
  }, preservedColumn({
    name: 'placering'
  }), {
    name: 'tekniskstandard'
  }, {
    name: 'tekstretning',
    distinctClause: (a, b) => `${a}::numeric(5,2) IS DISTINCT FROM ${b}::numeric(5,2)`
  }, {
    name: 'adressepunktaendringsdato'
  }, {
    name: 'objekttype'
  }, preservedColumn({
    name: 'husnummerkilde'
  }), preservedColumn({
    name: 'esdhreference'
  }), preservedColumn({
    name: 'journalnummer'
  }), {
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
    name: 'vejpunkt_id'
  }, {
    name: 'postnummer_id'
  }, {
    name: 'supplerendebynavn_dagi_id'
  }]
};

const ejerlav = {
  entity: 'ejerlav',
  table: 'ejerlav',
  primaryKey: ['kode'],
  columns: [
    {
      name: 'kode'
    },
    {
      name: 'navn'
    },
    ...geomColumns({offloaded: true}),
    visueltCenterComputed({}),
    tsvColumn({
      deriveFn:
        table => `to_tsvector('adresser', processForIndexing(coalesce(${table}.navn, '')))`
    })
  ]
};

const postnumre = {
  entity: 'postnummer',
  table: 'postnumre',
  primaryKey: ['nr'],
  columns: [{
    name: 'nr'
  }, {
    name: 'navn'
  },
    tsvColumn({
      deriveFn: (table) =>
        `to_tsvector('adresser', processForIndexing(coalesce(to_char(${table}.nr, '0000'), '') || ' ' || coalesce(${table}.navn, '')))`
    }), {
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
    {name: 'administrerendekommune'},
    {name: 'beskrivelse'},
    {name: 'retskrivningskontrol'},
    {name: 'udtaltvejnavn'},
    {name: 'beliggenhed_oprindelse_kilde'},
    {name: 'beliggenhed_oprindelse_nøjagtighedsklasse'},
    {name: 'beliggenhed_oprindelse_registrering'},
    {name: 'beliggenhed_oprindelse_tekniskstandard'}
  ]
};

const navngivenvej_mat = {
  table: 'navngivenvej_mat',
  primaryKey: ['id'],
  columns: [
    {name: 'id'},
    {name: 'darstatus'},
    {name: 'oprettet'},
    {name: 'ændret'},
    {name: 'ikrafttrædelse'},
    {name: 'nedlagt'},
    {name: 'navn'},
    {name: 'adresseringsnavn'},
    {name: 'administrerendekommune'},
    {name: 'beskrivelse'},
    {name: 'retskrivningskontrol'},
    {name: 'udtaltvejnavn'},
    {name: 'beliggenhed_oprindelse_kilde'},
    {name: 'beliggenhed_oprindelse_nøjagtighedsklasse'},
    {name: 'beliggenhed_oprindelse_registrering'},
    {name: 'beliggenhed_oprindelse_tekniskstandard'},
    geomColumn({name: 'beliggenhed_vejnavnelinje'}),
    geomColumn({name: 'beliggenhed_vejnavneområde'}),
    geomColumn({name: 'beliggenhed_vejtilslutningspunkter'}),
    geomColumn({}),
    bboxColumn({}),
    visueltCenterDerived({}),
    tsvColumn({
      deriveFn: (table) => `to_tsvector('adresser', processForIndexing(coalesce(${table}.navn, '')))`
    })
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
      name: 'tekst'
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
  primaryKey: ['stedid', 'navn'],
  columns: [
    {name: 'stedid'},
    {name: 'navn'},
    {name: 'navnestatus'},
    {name: 'brugsprioritet'},
    tsvColumn({
      deriveFn: table => `to_tsvector('adresser', ${table}.navn)`
    })
  ]
};

const bygninger = {
  table: 'bygninger',
  entity: 'bygning',
  primaryKey: ['id'],
  columns: [
    {name: 'id'},
    {name: 'ændret'},
    {name: 'bygningstype'},
    {name: 'metode3d'},
    {name: 'målested'},
    {name: 'bbrbygning_id'},
    {name: 'synlig'},
    {name: 'overlap'},
    geomColumn({}),
    bboxColumn({}),
    visueltCenterFromSource()
  ]
};

const bygningtilknytninger = {
  table: 'bygningtilknytninger',
  entity: 'bygningtilknytning',
  primaryKey: ['bygningid', 'adgangsadresseid'],
  columns: [{
    name: 'bygningid'
  }, {
    name: 'adgangsadresseid'
  }]
};

const bygning_kommune = {
  table: 'bygning_kommune',
  primaryKey: ['bygningid', 'kommunekode'],
  columns: [{
    name: 'bygningid'
  }, {
    name: 'kommunekode'
  }]
};


const steder = {
  table: 'steder',
  entity: 'sted',
  primaryKey: ['id'],
  columns: [
    {name: 'id'},
    {name: 'hovedtype'},
    {name: 'undertype'},
    {name: 'bebyggelseskode'},
    {name: 'indbyggerantal'},
    ...geomColumns({offloaded: true}),
    visueltCenterFromSource()
  ]
};

const stedtilknytninger = {
  table: 'stedtilknytninger',
  entity: 'stedtilknytning',
  primaryKey: ['stedid', 'adgangsadresseid'],
  columns: [{
    name: 'stedid'
  }, {
    name: 'adgangsadresseid'
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
      name: 'tekst'
    }
  ]
};

const postnrTsVector = (nr, navn) => `to_tsvector('adresser', coalesce(to_char(${nr}, '0000'), '') || ' ' || coalesce(${navn}, ''))`;

const adgangansadresserMatFieldsNotCopiedFromAdgangsadresser = [
  'esdhreference', 'journalnummer', 'husnummerkilde', 'objekttype', 'ejerlavkode', 'matrikelnr',
  'placering', 'esrejendomsnr'];

const postnrOrStormodtagerTsVector = (nr, navn, stormodtagernr, stormodtagernavn) =>
  `(${postnrTsVector(nr, navn)}::text || ' ' || ${postnrTsVector(stormodtagernr, stormodtagernavn)}::text)::tsvector`;
const adgangsadresser_mat = {
  table: 'adgangsadresser_mat',
  primaryKey: ['id'],
  columns: [...adgangsadresser.columns.filter(col => !adgangansadresserMatFieldsNotCopiedFromAdgangsadresser.includes(col.name)),
    {name: 'status'},
    tsvColumn({
      deriveFn: table =>
        `setweight(to_tsvector('adresser', processforindexing(${table}.vejnavn || ' ' || formatHusnr(${table}.husnr))), 'A') ||
         setweight(to_tsvector('adresser', processforindexing(COALESCE(${table}.supplerendebynavn, ''))), 'C') || 
         setweight(${postnrOrStormodtagerTsVector(`${table}.postnr`, `${table}.postnrnavn`, `${table}.stormodtagerpostnr`, `${table}.stormodtagerpostnrnavn`)}, 'D')`

    }),
    geomColumn({}),
    {name: 'vejnavn'},
    {name: 'adresseringsvejnavn'},
    {name: 'postnrnavn'},
    {name: 'stormodtagerpostnr'},
    {name: 'stormodtagerpostnrnavn'},
    {name: 'vejpunkt_kilde'},
    {name: 'vejpunkt_noejagtighedsklasse'},
    {name: 'vejpunkt_tekniskstandard'},
    {name: 'vejpunkt_ændret'},
    {name: 'vejpunkt_geom'},
    {name: "nedlagt"}]
};

const adresseMatFieldsNotCopiedFromEnhedsadresser = ['esdhreference', 'journalnummer', 'kilde', 'objekttype'];
const adresseMatFieldsNotCopiedFromAdgangsadresserMat = ['id', 'tsv', 'geom', 'status', 'oprettet', 'aendret', 'ikraftfra', 'nedlagt'];

const adresser_mat = {
  table: 'adresser_mat',
  primaryKey: ['id'],
  columns: [
    ...enhedsadresser.columns.filter(col => !adresseMatFieldsNotCopiedFromEnhedsadresser.includes(name(col))),
    ...adgangsadresser_mat.columns.filter(col => !adresseMatFieldsNotCopiedFromAdgangsadresserMat.includes(name(col))),
    {name: 'status'},
    {name: 'a_status'},
    {name: 'a_oprettet'},
    {name: 'a_aendret'},
    {name: 'a_ikraftfra'},
    {name: 'a_nedlagt'},
    {name: 'nedlagt'},
    geomColumn({}),
    tsvColumn({
      deriveFn: table =>
        `setweight(to_tsvector('adresser', processforindexing(${table}.vejnavn || ' ' || formatHusnr(${table}.husnr))), 'A') ||
         setweight(to_tsvector('adresser', processforindexing(COALESCE(etage, '') ||' ' || COALESCE(doer, ''))), 'B') || 
         setweight(to_tsvector('adresser', processforindexing(COALESCE(${table}.supplerendebynavn, ''))), 'C') || 
         setweight(${postnrOrStormodtagerTsVector(`${table}.postnr`, `${table}.postnrnavn`, `${table}.stormodtagerpostnr`, `${table}.stormodtagerpostnrnavn`)}, 'D')`

    })]
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
    geomColumn({})
  ]
};

const matrikel_jordstykker = {
  table: 'matrikel_jordstykker',
  entity: 'matrikel_jordstykke',
  primaryKey: ['ejerlavkode', 'matrikelnr'],
  columns: [
    {
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
    },
    {
      name: 'featureid'
    }, {
      name: 'moderjordstykke'
    }, {
      name: 'registreretareal'
    }, {
      name: 'arealberegningsmetode'
    }, {
      name: 'vejareal'
    }, {
      name: 'vejarealberegningsmetode'
    }, {
      name: 'vandarealberegningsmetode'
    }, {
      name: 'fælleslod'
    },
    geomColumn({})
  ]
};

const jordstykker = {
  table: 'jordstykker',
  entity: 'jordstykke',
  primaryKey: ['ejerlavkode', 'matrikelnr'],
  columns: [
    {
      name: 'ejerlavnavn'
    },
    ...matrikel_jordstykker.columns.filter((col) => name(col) !== 'geom'),
    ...geomColumns({offloaded: false}),
    visueltCenterComputed({}),
    tsvColumn({
      deriveFn: table => `to_tsvector('adresser', processForIndexing(${table}.matrikelnr || ' ' || coalesce(${table}.ejerlavnavn, '') || ' ' || ${table}.ejerlavkode))`
    })
  ]
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
    tsvColumn({
      deriveFn: table => `to_tsvector('adresser', processForIndexing(coalesce(${table}.navn, '')))`
    })
  ]
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
    }
  ]
};

const supplerendebynavn2_postnr = {
  table: 'supplerendebynavn2_postnr',
  primaryKey: ['supplerendebynavn_dagi_id', 'postnr'],
  columns: [
    {name: 'supplerendebynavn_dagi_id'},
    {name: 'postnr'}
  ]
};

const postnumre_kommunekoder_mat = {
  table: 'postnumre_kommunekoder_mat',
  primaryKey: ['postnr', 'kommunekode'],
  columns: [
    {name: 'postnr'},
    {name: 'kommunekode'}
  ]
};

const dagiTables = temaModels.modelList.reduce((memo, temaModel) => {
  memo[temaModel.table] = temaModels.toTableModel(temaModel);
  if (!temaModel.withoutTilknytninger) {
    memo[temaModel.tilknytningTable] = temaModels.toTilknytningTableModel(temaModel);
  }
  return memo;
}, {});

const dagiMaterializations = temaModels.modelList.reduce((memo, temaModel) => {
  if (!temaModel.withoutTilknytninger) {
    memo[temaModel.tilknytningTable] = temaModels.toTilknytningMaterialization(temaModel);
  }
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
    {name: 'afstemningsområdenummer'},
    {name: 'afstemningsområde_dagi_id'},
    {name: 'afstemningsområdenavn'},
    {name: 'opstillingskredskode'},
    {name: 'opstillingskredsnavn'},
    {name: 'valglandsdelsbogstav'},
    {name: 'valglandsdelsnavn'},
    {name: 'storkredsnummer'},
    {name: 'storkredsnavn'},
    {name: 'zone'},
    {name: 'menighedsrådsafstemningsområdenummer'},
    {name: 'menighedsrådsafstemningsområdenavn'},
    {name: 'landsdelsnuts3'},
    {name: 'landsdelsnavn'}
  ]
};

const brofasthed = {
  table: 'brofasthed',
  primaryKey: ['stedid'],
  columns: [
    {name: 'stedid'},
    {name: 'brofast'}
  ]
};
const ikke_brofaste_adresser = {
  table: 'ikke_brofaste_adresser',
  entity: 'ikke_brofast_husnummer',
  primaryKey: ['adgangsadresseid'],
  columns: [
    {name: 'adgangsadresseid'},
    {name: 'stedid'}
  ]
};

const hoejder = {
  entity: 'højde',
  table: 'hoejder',
  primaryKey: ['husnummerid'],
  columns: [
    {name: 'husnummerid'},
    {name: 'hoejde'}]
};

const hoejde_importer_resultater = {
  table: 'hoejde_importer_resultater',
  primaryKey: ['husnummerid'],
  columns: [
    {name: 'husnummerid'},
    {name: 'hoejde'},
    {name: 'position'}]
};

const hoejde_importer_afventer = {
  table: 'hoejde_importer_afventer',
  primaryKey: ['husnummerid'],
  columns: [
    {name: 'husnummerid'},
    {name: 'adgangspunktid'}]
};

const vask_adgangsadresser = {
  table: 'vask_adgangsadresser',
  primaryKey: ['rowkey'],
  columns: [
    {name: 'rowkey'},
    {name: 'id'},
    {name: 'ap_statuskode'},
    {name: 'hn_statuskode'},
    {name: 'kommunekode'},
    {name: 'vejkode'},
    {name: 'vejnavn'},
    {name: 'adresseringsvejnavn'},
    {name: 'husnr'},
    {name: 'supplerendebynavn'},
    {name: 'postnr'},
    {name: 'postnrnavn'},
    {name: 'virkning'}
  ]
};

const vask_adresser = {
  table: 'vask_adresser',
  primaryKey: ['rowkey'],
  columns: [
    ...vask_adgangsadresser.columns,
    {
      name: 'adgangsadresseid'
    },
    {
      name: 'statuskode'
    },
    {
      name: 'etage'
    },
    {
      name: 'doer'
    }
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
    supplerendebynavn2_postnr,
    vejpunkter,
    matrikel_jordstykker,
    navngivenvej,
    navngivenvej_mat,
    navngivenvejkommunedel_mat,
    navngivenvej_postnummer,
    navngivenvejkommunedel_postnr_mat,
    vejmidter,
    vejstykker,
    vejstykkerpostnumremat,
    steder,
    stednavne,
    stedtilknytninger,
    bygninger,
    bygningtilknytninger,
    bygning_kommune,
    jordstykker,
    jordstykker_adgadr,
    tilknytninger_mat,
    brofasthed,
    ikke_brofaste_adresser,
    hoejder,
    hoejde_importer_resultater,
    hoejde_importer_afventer,
    postnumre_kommunekoder_mat,
    vask_adgangsadresser,
    vask_adresser
  }, dagiTables,
  dar10RawTables,
  dar10HistoryTables,
  dar10CurrentTables);

exports.materializations = Object.assign({
  navngivenvej_mat: {
    table: 'navngivenvej_mat',
    view: 'navngivenvej_mat_view',
    dependents: [{
      table: 'dar1_NavngivenVej_current',
      columns: ['id']
    }, {
      table: 'dar1_NavngivenVej_history',
      columns: ['id'],
      references: ['id']
    }]
  },
  navngivenvejkommunedel_mat: {
    table: 'navngivenvejkommunedel_mat',
    view: 'navngivenvejkommunedel_mat_view',
    dependents: [{
      table: 'dar1_NavngivenVej_current',
      columns: ['navngivenvej_id']
    },
      {
        table: 'dar1_NavngivenVejKommunedel_history',
        columns: ['id'],
        references: ['id']
      }, {
        table: 'dar1_NavngivenVejKommunedel_current',
        columns: ['id']
      }]
  },
  navngivenvej: {
    table: 'navngivenvej',
    view: 'navngivenvej_view',
    dependents: [
      {
        table: 'navngivenvej_mat',
        columns: ['id']
      }]
  },
  adgangsadresser_mat: {
    table: 'adgangsadresser_mat',
    view: 'adgangsadresser_mat_view',
    dependents: [
      {
        table: 'dar1_Husnummer_current',
        columns: ['id']
      },
      {
        table: 'dar1_DARKommuneinddeling_current',
        columns: ['darkommuneinddeling_id']
      },
      {
        table: 'dar1_NavngivenVej_current',
        columns: ['navngivenvej_id']
      },
      {
        table: 'dar1_NavngivenVejKommunedel_current',
        columns: ['navngivenvejkommunedel_id']
      },
      {
        table: 'dar1_Postnummer_current',
        columns: ['postnummer_id']
      },
      {
        table: 'dar1_Adressepunkt_current',
        columns: ['adgangspunktid']
      },
      {
        table: 'dar1_SupplerendeBynavn_current',
        columns: ['supplerendebynavn_id']
      }, {
        table: 'stormodtagere',
        columns: ['id']
      }, {
        table: 'hoejder',
        columns: ['id']
      }
    ]
  },
  adgangsadresser: {
    table: 'adgangsadresser',
    view: 'adgangsadresser_view',
    dependents: [
      {
        table: 'adgangsadresser_mat',
        columns: ['id']
      }, {
        table: 'jordstykker_adgadr',
        columns: ['id'],
        references: ['adgangsadresse_id']
      }, {
        table: 'jordstykker',
        columns: ['ejerlavkode', 'matrikelnr']
      }, {
        table: 'ejerlav',
        columns: ['ejerlavkode']
      }]
  },
  adresser_mat: {
    table: 'adresser_mat',
    view: 'adresser_mat_view',
    dependents: [{
      table: 'dar1_Adresse_current',
      columns: ['id']
    }, {
      table: 'dar1_Adresse_history',
      columns: ['id'],
      references: ['id']
    }, {
      table: 'adgangsadresser_mat',
      columns: ['adgangsadresseid']
    }]
  },
  enhedsadresser: {
    table: 'enhedsadresser',
    view: 'enhedsadresser_view',
    dependents: [{
      table: 'adresser_mat',
      columns: ['id']
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
    ],
    nonIncrementalDependents: ['jordstykker']
  },
  stedtilknytninger: {
    table: 'stedtilknytninger',
    view: 'stedtilknytninger_view',
    dependents: [
      {
        table: 'adgangsadresser_mat',
        columns: ['adgangsadresseid']
      }
    ],
    nonIncrementalDependents: ['steder']
  },
  steder_geom: {
    table: 'steder_geom',
    view: 'steder_geom_view',
    dependents: [
      {
        table: 'steder',
        columns: ['id']
      }
    ]
  },
  bygningtilknytninger: {
    table: 'bygningtilknytninger',
    view: 'bygningtilknytninger_view',
    dependents: [
      {
        table: 'adgangsadresser_mat',
        columns: ['adgangsadresseid']
      }
    ],
    nonIncrementalDependents: ['bygninger']
  },
  bygning_kommune: {
    table: 'bygning_kommune',
    view: 'bygning_kommune_view',
    dependents: [],
    nonIncrementalDependents: ['bygninger', 'kommuner']
  },
  tilknytninger_mat: {
    table: 'tilknytninger_mat',
    view: 'tilknytninger_mat_view',
    dependents: [
      {
        table: 'adgangsadresser_mat',
        columns: ['adgangsadresseid']
      }, {
        table: 'dar1_Husnummer_current',
        columns: ['adgangsadresseid']
      },
      {
        table: 'dar1_DARSogneinddeling_current',
        columns: ['sognekode'],
        references: ['sognekode']
      },
      {
        table: 'dar1_DARMenighedsrådsafstemningsområde_current',
        columns: ['menighedsrådsafstemningsområdenummer'],
        references: ['mrafstemningsområdenummer']
      },
      {
        table: 'dar1_DARAfstemningsområde_current',
        columns: ['afstemningsområde_dagi_id'],
        references: ['afstemningsområde']
      }],
    nonIncrementalDependents: [
      'politikredstilknytninger', 'politikredse',
      'retskredstilknytninger', 'retskredse',
      'kommuner',
      'regioner',
      'afstemningsomraader',
      'opstillingskredse',
      'storkredse',
      'valglandsdele',
      'landsdelstilknytninger',
      'landsdele',
      'zonetilknytninger'
    ]
  },
  supplerendebynavn2_postnr: {
    table: 'supplerendebynavn2_postnr',
    view: 'supplerendebynavn2_postnr_view',
    dependents: [],
    nonIncrementalDependents: ['dar1_Husnummer_current, dar1_SupplerendeBynavn_current', 'dar1_Postnummer_current']
  },
  ikke_brofaste_adresser: {
    table: 'ikke_brofaste_adresser',
    view: 'ikke_brofaste_adresser_view',
    dependents: [
      {
        table: 'stedtilknytninger',
        columns: ['adgangsadresseid', 'stedid']
      },
      {
        table: 'brofasthed',
        columns: ['stedid']
      }
    ]
  },
  hoejder: {
    table: 'hoejder',
    view: 'hoejder_view',
    dependents: [
      {
        table: 'dar1_Husnummer_current',
        columns: ['husnummerid']
      },
      {
        table: 'hoejde_importer_resultater',
        columns: ['husnummerid']
      }
    ]
  },
  hoejde_importer_afventer: {
    table: 'hoejde_importer_afventer',
    view: 'hoejde_importer_afventer_view',
    dependents: [
      {
        table: 'dar1_Husnummer_current',
        columns: ['husnummerid']
      },
      {
        table: 'dar1_Adressepunkt_current',
        columns: ['adgangspunktid']
      },
      {
        table: 'hoejde_importer_resultater',
        columns: ['husnummerid']
      }
    ]
  },
  vejstykker: {
    table: 'vejstykker',
    view: 'vejstykker_view',
    dependents: [
      {
        table: 'navngivenvejkommunedel_mat',
        columns: ['navngivenvejkommunedel_id']
      }
    ]
  },
  postnumre: {
    table: 'postnumre',
    view: 'postnumre_view',
    dependents: [
      {
        table: 'dar1_Postnummer_current',
        columns: ['nr'],
        references: ['postnr']
      },
      {
        table: 'stormodtagere',
        columns: ['nr'],
        references: ['nr']
      }
    ]
  },
  postnumre_kommunekoder_mat: {
    table: 'postnumre_kommunekoder_mat',
    view: 'postnumre_kommunekoder_mat_view',
    dependents: [],
    nonIncrementalDependents: [
      'dar1_DARKommuneinddeling_current', 'dar1_Husnummer_current', 'dar1_Postnummer_current'
    ]
  },
  supplerendebynavne_mat: {
    table: 'supplerendebynavne_mat',
    view: 'supplerendebynavne_mat_view',
    dependents: [],
    nonIncrementalDependents: [
      'adgangsadresser'
    ]
  },
  supplerendebynavn_kommune_mat: {
    table: 'supplerendebynavn_kommune_mat',
    view: 'supplerendebynavn_kommune_mat_view',
    dependents: [],
    nonIncrementalDependents: [
      'adgangsadresser'
    ]
  },
  supplerendebynavn_postnr_mat: {
    table: 'supplerendebynavn_postnr_mat',
    view: 'supplerendebynavn_postnr_mat_view',
    dependents: [],
    nonIncrementalDependents: [
      'adgangsadresser'
    ]
  },
  navngivenvejkommunedel_postnr_mat: {
    table: 'navngivenvejkommunedel_postnr_mat',
    view: 'navngivenvejkommunedel_postnr_mat_view',
    nonIncrementalDependents: [
      'dar1_Husnummer_current',
      'dar1_NavngivenVejKommunedel_current',
      'dar1_DARKommuneinddeling_current'
    ],
    dependents: []
  },
  vejstykkerpostnumremat: {
    table: 'vejstykkerpostnumremat',
    view: 'vejstykkerpostnumremat_view',
    nonIncrementalDependents: [
      'navngivenvejkommunedel_postnr_mat',
      'dar1_NavngivenVej_current',
      'dar1_NavngivenVejKommunedel_current',
      'dar1_Postnummer_current'
    ],
    dependents: []
  },
  jordstykker: {
    table: 'jordstykker',
    view: 'jordstykker_view',
    dependents: [
      {
        table: 'matrikel_jordstykker',
        columns: ['ejerlavkode', 'matrikelnr']
      }
    ]
  }

}, dagiMaterializations);

for (let dawaMaterialization of Object.values(dar10TableModels.dawaMaterializations)) {
  exports.materializations[dawaMaterialization.table] = dawaMaterialization;
}