"use strict";

module.exports = {
  adgangsadresser_mat: {
    primaryKey: ['a_id'],
    view: 'adgangsadresser_mat_view',
    dependents: [
      {
        table: 'adgangsadresser',
        columns: ['id']
      },
      {
        table: 'ejerlav',
        columns: ['ejerlavkode']
      },
      {
        table: 'ejerlav',
        columns: ['jordstykke_ejerlavkode']
      }
    ]
  }
}
