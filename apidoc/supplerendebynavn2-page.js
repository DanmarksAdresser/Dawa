module.exports = {
  entity: 'supplerendebynavn2',
  heading: 'Supplerende bynavne',
  lead: `API'et udstiller Danmarks supplerende bynavne samt tilhørende funktionalitet.`,
  sections: [
    {
      type: 'endpoint',
      heading: 'Supplerende bynavnesøgning',
      anchor: 'søgning',
      path: '/supplerendebynavne2'
    },
    {
      type: 'endpoint',
      heading: 'Supplerende bynavnopslag',
      anchor: 'opslag',
      path: '/supplerendebynavne2/{dagi_id}'
    },
    {
      type: 'endpoint',
      heading: 'Supplerende bynavn autocomplete',
      anchor: 'autocomplete',
      path: '/supplerendebynavne2/autocomplete'
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
