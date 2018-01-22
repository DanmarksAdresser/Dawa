module.exports = {
  entity: 'sogn',
  heading: 'Sogne',
  lead: `API'et udstiller Danmarks sogne samt tilhørende funktionalitet.`,
  sections: [
    {
      type: 'endpoint',
      heading: 'Sognesøgning',
      anchor: 'søgning',
      path: '/sogne'
    },
    {
      type: 'endpoint',
      heading: 'Sogneopslag',
      anchor: 'opslag',
      path: '/sogne/{kode}'
    },
    {
      type: 'endpoint',
      heading: 'Sogn autocomplete',
      anchor: 'autocomplete',
      path: '/sogne/autocomplete'
    },
    {
      type: 'endpoint',
      heading: 'Sogn reverse geocoding',
      anchor: 'reverse',
      path: '/sogne/reverse'
    },
    {
      type: 'datadescription',
      heading: 'Beskrivelse af sogne',
      anchor: 'databeskrivelse',
      lead: `API'et udstiller for hvert sogn følgende informationer:`,
      entity: 'sogn',
      qualifier: 'json'
    }
  ]
};
