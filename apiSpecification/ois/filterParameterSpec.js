"use strict";
const leftPad = (str, char, len) => {
  while(str.length < len) {
    str = char + str;
  }
  return str;
}

const processEsr = esr => leftPad(esr, '0', 6);

module.exports = {
  grund: [{
    name: 'id',
    field: 'Grund_id'
  }],
  bygning: [{
    name: 'id',
    field: 'Bygning_id'
  }, {
    name: 'adgangsadresseid',
    field: 'AdgAdr_id'
  }, {
    name: 'esrejendomsnr',
    field: 'ESREjdNr',
    schema: {
      type: 'string'
    },
    process: processEsr
  }, {
    name: 'anvendelseskode',
    field: 'BYG_ANVEND_KODE'
  }, {
    name: 'kommunekode',
    field: 'KomKode'
  }],
  opgang: [{
    name: 'id',
    field: 'Opgang_id'
  }, {
    name: 'bygningsid',
    field: 'Bygning_id'
  }],
  enhed: [{
    name: 'id',
    field: 'Enhed_id'
  }, {
    name: 'adresseid',
    field: 'EnhAdr_id'
  }, {
    name: 'anvendelseskode',
    field: 'ENH_ANVEND_KODE'
  }, {
    name: 'bygningsid',
    field: 'bygning_Bygning_id'
  }, {
    name: 'kommunekode',
    field: 'bygning_KomKode'
  }],
  etage: [{
    name: 'id',
    field: 'Etage_id'
  }, {
    name: 'bygningsid',
    field: 'Bygning_id'
  }],
  tekniskanlaeg: [{
    name: 'id',
    field: 'Tekniskanlaeg_id'
  }, {
    name: 'adgangsadresseid',
    field: 'AdgAdr_id'
  }, {
    name: 'esrejendomsnr',
    field: 'ESREjdNr',
    schema: {
      type: 'string'
    },
    process: processEsr
  }, {
    name: 'bygningsid',
    field: 'Bygning_id'
  }, {
    name: 'kommunekode',
    field: 'KomKode'
  }],
  ejerskab: [{
    name: 'id',
    field: 'Ejerskab_id'
  }, {
    name: 'bbrid',
    field: 'BbrId'
  }, {
    name: 'esrejendomsnr',
    field: 'ESREjdNr',
    schema: {
      type: 'string'
    },
    process: processEsr
  }],
  bygningspunkt: [{
    name: 'id',
    field: 'BygPkt_id'
  }],
  matrikelreference: [{
    name: 'grundid',
    field: 'Grund_id'
  }, {
    name: 'ejerlavkode',
    field: 'LandsejerlavKode'
  }, {
    name: 'matrikelnr',
    field: 'MatrNr'
  }]
};