"use strict";

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
    name: 'etrs90nord'
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
    name: 'geom',
    public: false
  }, {
    name: 'tsv',
    public: false
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
    derive: (client, table, additionalWhereClauses) => {

      let sql = `UPDATE ${table} t 
      SET tsv = to_tsvector('adresser', processForIndexing(coalesce(t.navn, '')))`;
      if(additionalWhereClauses) {
        sql += ` WHERE ${additionalWhereClauses('t')}`;
      }
      return client.queryBatched(sql);
    }
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
    derive: (client, table, additionalWhereClauses) => {

      let sql = `UPDATE ${table} t 
      SET tsv = to_tsvector('adresser', coalesce(to_char(nr, '0000'), '') || ' ' || coalesce(navn, ''))`;
      if(additionalWhereClauses) {
        sql += ` WHERE ${additionalWhereClauses('t')}`;
      }
      return client.queryBatched(sql);
    }
  }, {
    name: 'stormodtager'
  }]
}

const adgangsadresser_mat = {
  table: 'adgangsadresser_mat',
  primaryKey: ['id'],
  columns: [...adgangsadresser.columns,
    {
      name: 'ejerlavnavn'
    }]
};

exports.tables = {
  adgangsadresser,
  adgangsadresser_mat,
  ejerlav,
  postnumre
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
    }]
  }
};
