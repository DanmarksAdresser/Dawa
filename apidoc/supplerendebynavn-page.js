module.exports = {
  entity: 'supplerendebynavn',
  heading: 'Syp',
  lead: `API'et udstiller Danmarks supplerende bynavne samt tilhørende funktionalitet.`,
  sections: [
    {
      type: 'endpoint',
      heading: 'Supplerende bynavnesøgning',
      anchor: 'søgning',
      path: '/supplerendebynavne'
    },
    {
      type: 'endpoint',
      heading: 'Supplerende bynavnopslag',
      anchor: 'opslag',
      path: '/supplerendebynavne/{navn}'
    },
    {
      type: 'endpoint',
      heading: 'Supplerende bynavn autocomplete',
      anchor: 'autocomplete',
      path: '/supplerendebynavne/autocomplete'
    },
    {
      type: 'datadescription',
      heading: 'Beskrivelse af supplerende bynavne',
      anchor: 'databeskrivelse',
      lead: `<p>Ovenstående Web API udstiller supplerende bynavne. Et supplerende bynavn – typisk landsbyens navn – eller andet lokalt stednavn der er fastsat af kommunen for at præcisere adressens beliggenhed indenfor postnummeret. Indgår som en del af den officielle adressebetegnelse. Indtil 34 tegn. Eksempel: ”Sønderholm”.</p>
<p>API'et udstiller for hver supplerende bynavn følgende informationer:</p>`,
      entity: 'supplerendebynavn',
      qualifier: 'json'
    }
  ]
};
