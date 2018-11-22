module.exports = {
  entity: 'kommune',
  heading: 'Kommuner',
  lead: `API'et udstiller alle Danmarks kommuner.`,
  sections: [
    {
      type: 'endpoint',
      heading: 'Kommunesøgning',
      anchor: 'søgning',
      path: '/kommuner'
    },
    {
      type: 'endpoint',
      heading: 'Kommuneopslag',
      anchor: 'opslag',
      path: '/kommuner/{kode}'
    },
    {
      type: 'endpoint',
      heading: 'Kommune autocomplete',
      anchor: 'autocomplete',
      path: '/kommuner/autocomplete'
    },
    {
      type: 'endpoint',
      heading: 'Kommune reverse geocoding',
      anchor: 'reverse',
      path: '/kommuner/reverse'
    },
    {
      type: 'datadescription',
      heading: 'Beskrivelse af kommunedata',
      anchor: 'databeskrivelse',
      lead: `API'et udstiller for hver kommune følgende informationer:`,
      entity: 'kommune',
      qualifier: 'json'
    }
  ]
};
