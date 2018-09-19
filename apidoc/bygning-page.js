module.exports = {
  entity: 'bygning',
  heading: 'bygninger',
  lead: `API'et udstiller alle Danmarks bygninger.`,
  sections: [
    {
      type: 'endpoint',
      heading: 'bygningsøgning',
      anchor: 'søgning',
      path: '/bygninger'
    },
    {
      type: 'endpoint',
      heading: 'bygningopslag',
      anchor: 'opslag',
      path: '/bygninger/{id}'
    },
    {
      type: 'datadescription',
      heading: 'Beskrivelse af bygningdata',
      anchor: 'databeskrivelse',
      lead: `API'et udstiller for hver bygning følgende informationer:`,
      entity: 'bygning',
      qualifier: 'json'
    }
  ]
};
