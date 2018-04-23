module.exports = {
  entity: 'afstemningsområde',
  heading: 'Afstemningsområder',
  lead: `API'et udstiller alle Danmarks afstemningsområder.`,
  sections: [
    {
      type: 'endpoint',
      heading: 'Afstemningsområdesøgning',
      anchor: 'søgning',
      path: '/afstemningsomraader'
    },
    {
      type: 'endpoint',
      heading: 'Afstemningsområdeopslag',
      anchor: 'opslag',
      path: '/afstemningsomraader/{kommunekode}/{nummer}'
    },
    {
      type: 'endpoint',
      heading: 'Afstemningsområde autocomplete',
      anchor: 'autocomplete',
      path: '/afstemningsomraader/autocomplete'
    },
    {
      type: 'endpoint',
      heading: 'Afstemningsområde reverse geocoding',
      anchor: 'reverse',
      path: '/afstemningsomraader/reverse'
    },
    {
      type: 'datadescription',
      heading: 'Beskrivelse af afstemningsområdedata',
      anchor: 'databeskrivelse',
      lead: `API'et udstiller for hvert afstemningsområde følgende informationer:`,
      entity: 'afstemningsområde',
      qualifier: 'json'
    }
  ]
};
