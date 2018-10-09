module.exports = {
  entity: 'adgangsadresse',
  heading: 'Adgangsadresser',
  lead: `API'et udstiller Danmarks adgangsadresser samt tilhørende funktionalitet.`,
  sections: [
    {
      type: 'endpoint',
      heading: 'Adgangsadressesøgning',
      anchor: 'søgning',
      path: '/adgangsadresser'
    },
    {
      type: 'endpoint',
      heading: 'Adgangsadresseopslag',
      anchor: 'opslag',
      path: '/adgangsadresser/{id}'
    },
    {
      type: 'endpoint',
      heading: 'Adgangsadresse autocomplete',
      anchor: 'autocomplete',
      path: '/adgangsadresser/autocomplete',
    },
    {
      type: 'endpoint',
      heading: 'Adgangsadresse reverse geocoding',
      anchor: 'reverse',
      path: '/adgangsadresser/reverse'
    },
    {
      type: 'datadescription',
      heading: 'Beskrivelse af adgangsadressedata',
      anchor: 'databeskrivelse',
      lead: `<p>Ovenstående Web API udstiller adgangsadresser. En <em>adgangsadresse</em> er en struktureret betegnelse som angiver en særskilt adgang til et areal eller en bygning efter reglerne i adressebekendtgørelsen.</p>
            <p> Forskellen på en adresse og en adgangsadresse er at adressen rummer eventuel etage- og/eller dørbetegnelse. Det gør adgangsadressen ikke.</p>
            <p>Web API'et udstiller for hver adgangsadresse følgende informationer:</p>`,
      entity: 'adgangsadresse',
      qualifier: 'json'
    },
    {
      type: 'endpoint',
      heading: 'Adgangsadresse datavask',
      anchor: 'datavask',
      path: '/datavask/adgangsadresser',
      sections: [
        {
          type: 'datadescription',
          heading: 'Datavask svar',
          lead: '<p>Ved anvendelse af datavask-APIet modtages følgende svarstruktur:</p>',
          entity: 'adgangsadresse_datavask',
          qualifier: 'json'
        }
      ]
    },
    {
      type: 'endpoint',
      anchor: 'historik',
      heading: 'Adgangsadresse historik',
      path: '/historik/adgangsadresser'
    }
  ]
};
