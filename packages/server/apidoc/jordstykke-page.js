module.exports = {
  entity: 'jordstykke',
  heading: 'Jordstykker',
  lead: `API'et udstiller alle Danmarks jordstykker.`,
  sections: [
    {
      type: 'endpoint',
      heading: 'Jordstykkesøgning',
      anchor: 'søgning',
      path: '/jordstykker'
    },
    {
      type: 'endpoint',
      heading: 'Jordstykkeopslag',
      anchor: 'opslag',
      path: '/jordstykker/{ejerlavkode}/{matrikelnr}'
    },
    {
      type: 'endpoint',
      heading: 'Jordstykke autocomplete',
      anchor: 'autocomplete',
      path: '/jordstykker/autocomplete'
    },

    {
      type: 'datadescription',
      heading: 'Beskrivelse af jordstykkedata',
      anchor: 'databeskrivelse',
      lead: `API'et udstiller for hvert jordstykke følgende informationer:`,
      entity: 'jordstykke',
      qualifier: 'json'
    }
  ]
};
