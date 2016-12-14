"use strict";

module.exports = {
  bygning: [
    ['AdgAdr_id'],
    ['ESREjdNr'],
    ['BYG_ANVEND_KODE'],
    ['KomKode']
  ],
  tekniskanlaeg: [
    ['AdgAdr_id'],
    ['ESREjdNr'],
    ['Bygning_id'],
    ['KomKode']
  ],
  enhed: [
    ['EnhAdr_id'],
    ['ENH_ANVEND_KODE']
  ],
  opgang: [
    ['Bygning_id']
  ]
}
