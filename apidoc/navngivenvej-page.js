module.exports = {
  entity: 'navngivenvej',
  heading: 'Navngivne veje',
  lead: `API'et udstiller alle Danmarks navngivne veje.`,
  sections: [
    {
      type: 'endpoint',
      heading: 'Navngiven vej søgning',
      anchor: 'søgning',
      path: '/navngivneveje'
    },
    {
      type: 'endpoint',
      heading: 'Navngiven vej opslag',
      anchor: 'opslag',
      path: '/navngivneveje/{id}'
    },
    {
      type: 'endpoint',
      heading: 'Navngiven vejs naboer',
      anchor: 'naboer',
      path: '/navngivneveje/{id}/naboer'
    },
    {
      type: 'datadescription',
      heading: 'Beskrivelse af navngiven vej',
      anchor: 'databeskrivelse',
      lead: `API'et udstiller for hver navngiven vej følgende informationer:`,
      entity: 'navngivenvej',
      qualifier: 'json'
    }
  ]
};
