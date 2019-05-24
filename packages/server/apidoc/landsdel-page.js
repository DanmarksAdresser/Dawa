module.exports = {
  entity: 'landsdel',
  heading: 'Landsdele',
  lead: `API'et udstiller Danmarks landsdele samt tilhørende funktionalitet.`,
  sections: [
    {
      type: 'endpoint',
      heading: 'Landsdelssøgning',
      anchor: 'søgning',
      path: '/landsdele'
    },
    {
      type: 'endpoint',
      heading: 'Landsdelsopslag',
      anchor: 'opslag',
      path: '/landsdele/{nuts3}'
    },
    {
      type: 'endpoint',
      heading: 'Landsdele autocomplete',
      anchor: 'autocomplete',
      path: '/landsdele/autocomplete'
    },
    {
      type: 'datadescription',
      heading: 'Beskrivelse af landsdele',
      anchor: 'databeskrivelse',
      lead: `<p>Ovenstående Web API udstiller landsdele, eksempelvis "Østjylland".</p>
<p>API'et udstiller for hver supplerende bynavn følgende informationer:</p>`,
      entity: 'landsdel',
      qualifier: 'json'
    }
  ]
};
