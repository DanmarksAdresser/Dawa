module.exports = {
  entity: 'stednavntype',
  heading: 'Stednavntyper',
  lead: `API'et udstiller en lister over hovetyper og undertyper for stednavne.`,
  sections: [
    {
      type: 'endpoint',
      heading: 'Stednavntyper',
      anchor: 'stednavntyper',
      path: '/stednavntyper'
    },
        {
      type: 'datadescription',
      heading: 'Beskrivelse af stednavntyper',
      anchor: 'databeskrivelse',
      lead: `API'et udstiller følgende informationer:`,
      entity: 'stednavntype',
      qualifier: 'json'
    }
  ]
};
