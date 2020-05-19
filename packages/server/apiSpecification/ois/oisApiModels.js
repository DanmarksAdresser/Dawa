"use strict";

module.exports = {
  grund: {
    primaryRelation: 'grund',
    alias: 'g',
    secondaryRelations: []
  },
  bygning: {
    primaryRelation: 'bygning',
    alias: 'b',
    secondaryRelations: [{
      relationName: 'ejerskab',
      alias: 'es',
      method: 'LEFT JOIN',
      clauses: [['es.BbrId', 'b.Bygning_id']],
      aggregate: true
    }, {
      relationName: 'bygningspunkt',
      alias: 'bp',
      method: 'LEFT JOIN',
      clauses: [['b.BygPkt_id', 'bp.BygPkt_id']]
    }],
    geojson: {
      relation: 'bygningspunkt',
      field: 'geom'
    }
  },
  etage: {
    primaryRelation: 'etage',
    alias: 'et',
    secondaryRelations: []
  },
  tekniskanlaeg: {
    primaryRelation: 'tekniskanlaeg',
    alias: 't',
    secondaryRelations: [{
      relationName: 'bygning',
      alias: 'b',
      method: 'LEFT JOIN',
      clauses: [['b.Bygning_id', 't.Bygning_id']]
    }, {
      relationName: 'ejerskab',
      alias: 'es',
      method: 'LEFT JOIN',
      clauses: [['es.BbrId', 't.Tekniskanlaeg_id']],
      aggregate: true
    }, {
      relationName: 'bygningspunkt',
      alias: 'bp',
      method: 'LEFT JOIN',
      clauses: [['t.BygPkt_id', 'bp.BygPkt_id']]
    }],
    geojson: {
      relation: 'bygningspunkt',
      field: 'geom'
    }
  },
  ejerskab:{
    primaryRelation: 'ejerskab',
    alias: 'es',
    secondaryRelations: [{
      relationName: 'bygning',
      alias: 'b',
      method: 'LEFT JOIN',
      clauses: [['es.BbrId', 'b.Bygning_id']]
    }, {
      relationName: 'tekniskanlaeg',
      alias: 't',
      method: 'LEFT JOIN',
      clauses: [['es.BbrId', 't.Tekniskanlaeg_id']]
    }, {
      relationName: 'grund',
      alias: 'g',
      method: 'LEFT JOIN',
      clauses: [['es.BbrId', 'g.Grund_id']]
    }, {
      relationName: 'enhed',
      alias: 'e',
      method: 'LEFT JOIN',
      clauses: [['es.BbrId', 'e.Enhed_id']]
    }, {
      relationName: 'kommune',
      alias: 'k',
      method: 'LEFT JOIN',
      clauses: [['es.Kommune_id', 'k.Kommune_id']]
    }]
  },
  kommune: {
    primaryRelation: 'kommune',
    alias: 'k',
    secondaryRelations: []
  },
  opgang: {
    primaryRelation: 'opgang',
    alias: 'o',
    secondaryRelations: []
  },
  bygningspunkt: {
    primaryRelation: 'bygningspunkt',
    alias: 'bp',
    secondaryRelations: [],
    geojson: {
      relation: 'bygningspunkt',
      field: 'geom'
    }

  },
  enhed: {
    primaryRelation: 'enhed',
    alias: 'e',
    secondaryRelations: [{
      relationName: 'ejerskab',
      alias: 'es',
      method: 'LEFT JOIN',
      clauses: [['es.BbrId', 'e.Enhed_id']],
      aggregate: true
    }, {
      relationName: 'opgang',
      alias: 'o',
      method: 'JOIN',
      clauses: [['e.opgang_id', 'o.opgang_id']]
    }, {
      relationName: 'bygning',
      alias: 'b',
      method: 'JOIN',
      clauses: [['b.bygning_id', 'o.bygning_id']]
    }]
  },
  matrikelreference: {
    primaryRelation: 'matrikelreference',
    alias: 'mr',
    secondaryRelations: []
  }
};
