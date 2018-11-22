module.exports = {
  entity: 'valglandsdel',
  heading: 'Valglandsdele',
  lead: `API'et udstiller Danmarks valglandsdele samt tilhørende funktionalitet.`,
  sections: [
    {
      type: 'endpoint',
      heading: 'Valglandsdelssøgning',
      anchor: 'søgning',
      path: '/valglandsdele'
    },
    {
      type: 'endpoint',
      heading: 'Valglandsdelsopslag',
      anchor: 'opslag',
      path: '/valglandsdele/{bogstav}'
    },
    {
      type: 'endpoint',
      heading: 'Valglandsdel autocomplete',
      anchor: 'autocomplete',
      path: '/valglandsdele/autocomplete'
    },
    {
      type: 'endpoint',
      heading: 'Valglandsdel reverse geocoding',
      anchor: 'reverse',
      path: '/valglandsdele/reverse'
    },
    {
      type: 'datadescription',
      heading: 'Beskrivelse af valglandsdele',
      anchor: 'databeskrivelse',
      lead: `API'et udstiller for hver valglandsdel følgende informationer:`,
      entity: 'valglandsdel',
      qualifier: 'json'
    }
  ]
};
