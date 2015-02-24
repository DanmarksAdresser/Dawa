module.exports = [{
  name: 'ddkn_m100',
    description: 'Angiver betegnelsen for den 100 m celle som adressen er beliggende i.' +
  ' 15 tegn. Eksempel: ”100m_61768_6435”.',
    schema: {
    type: 'string',
      pattern: '^100m_(\\d{5})_(\\d{4})$'
  }
}, {
  name: 'ddkn_km1',
    description: 'Angiver betegnelsen for den 1 km celle som adressen er beliggende i.' +
  ' 12 tegn. Eksempel: ”1km_6176_643”.',
    schema: {
    type: 'string',
      pattern:  '^1km_(\\d{4})_(\\d{3})$'
  }
}, {
  name: 'ddkn_km10',
    description: 'Angiver betegnelsen for den 10 km celle som adressen er beliggende i.' +
  ' 11 tegn. Eksempel: ”10km_617_64”.',
    schema: {
    type: 'string',
      pattern: '^10km_(\\d{3})_(\\d{2})$'
  }
}];