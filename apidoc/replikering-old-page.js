module.exports = {
  entity: 'replikering-legacy',
  heading: 'Replikering (Legacy)',
  lead: `Gammel version af API'er til etablering af lokal kopi af adressedata.
  For en beskrivelse af hvordan dette gamle API fungerer, se <a href="/dok/guide/replikering-old">guiden til det gamle API</a>.
  For en beskrivelse af det nye replikerings-API, se <a href"/dok/guide/replikering"/>guiden til det nye API</a>.`,
  sections: [
    {
      type: 'endpoint',
      heading: 'Seneste sekvensnummer',
      anchor: 'senestesekvensnummer',
      path: '/replikering/senesteSekvensnummer'
    },
    {
      type: 'endpoint',
      anchor: 'adgangsadresse-udtræk',
      heading: 'Adgangsadresse - udtræk',
      path: '/replikering/adgangsadresser'
    },
    {
      type: 'endpoint',
      anchor: 'adgangsadresse-hændelser',
      heading: 'Adgangsadresse - hændelser',
      path: '/replikering/adgangsadresser/haendelser'
    },
    {
      type: 'endpoint',
      anchor: 'adresse-udtræk',
      heading: 'Adresse - udtræk',
      path: '/replikering/adresser'
    },
    {
      type: 'endpoint',
      anchor: 'adresse-hændelser',
      heading: 'Adresse - hændelser',
      path: '/replikering/adresser/haendelser'
    },
    {
      type: 'endpoint',
      anchor: 'ejerlav-udtræk',
      heading: 'Ejerlav - udtræk',
      path: '/replikering/ejerlav'
    },
    {
      type: 'endpoint',
      anchor: 'ejerlav-hændelser',
      heading: 'Ejerlav - hændelser',
      path: '/replikering/ejerlav/haendelser'
    },
    {
      type: 'endpoint',
      anchor: 'jordstykke-udtræk',
      heading: 'Jordstykketilknytninger - udtræk',
      path: '/replikering/jordstykketilknytninger'
    },
    {
      type: 'endpoint',
      anchor: 'jordstykke-hændelser',
      heading: 'Jordstykketilknytninger - hændelser',
      path: '/replikering/jordstykketilknytninger/haendelser'
    },
    {
      type: 'endpoint',
      anchor: 'opstillingskredstilknytninger-udtræk',
      heading: 'Opstillingskredstilknytninger - udtræk',
      path: '/replikering/opstillingskredstilknytninger'
    },
    {
      type: 'endpoint',
      anchor: 'opstillingskredstilknytninger-hændelser',
      heading: 'Opstillingskredstilknytninger - hændelser',
      path: '/replikering/opstillingskredstilknytninger/haendelser'
    },
    {
      type: 'endpoint',
      anchor: 'politikredstilknytninger-udtræk',
      heading: 'Politikredstilknytninger - udtræk',
      path: '/replikering/politikredstilknytninger'
    },
    {
      type: 'endpoint',
      anchor: 'politikredstilknytninger-hændelser',
      heading: 'Politikredstilknytninger - hændelser',
      path: '/replikering/politikredstilknytninger/haendelser'
    },
    {
      type: 'endpoint',
      anchor: 'regionstilknytninger-udtræk',
      heading: 'Regionstilknytninger - udtræk',
      path: '/replikering/regionstilknytninger'
    },
    {
      type: 'endpoint',
      anchor: 'regionstilknytninger-hændelser',
      heading: 'Regionstilknytninger - hændelser',
      path: '/replikering/regionstilknytninger/haendelser'
    },
    {
      type: 'endpoint',
      anchor: 'retskredstilknytninger-udtræk',
      heading: 'Retskredstilknytninger - udtræk',
      path: '/replikering/retskredstilknytninger'
    },
    {
      type: 'endpoint',
      anchor: 'retskredstilknytninger-hændelser',
      heading: 'Retskredstilknytninger - hændelser',
      path: '/replikering/retskredstilknytninger/haendelser'
    },
    {
      type: 'endpoint',
      anchor: 'sognetilknytninger-udtræk',
      heading: 'Sognetilknytninger - udtræk',
      path: '/replikering/sognetilknytninger'
    },
    {
      type: 'endpoint',
      anchor: 'sognetilknytninger-hændelser',
      heading: 'sognetilknytninger - hændelser',
      path: '/replikering/sognetilknytninger/haendelser'
    },
    {
      type: 'endpoint',
      anchor: 'storkredstilknytninger-udtræk',
      heading: 'Storkredstilknytninger - udtræk',
      path: '/replikering/storkredstilknytninger'
    },
    {
      type: 'endpoint',
      anchor: 'storkredstilknytninger-hændelser',
      heading: 'Storkredstilknytninger - hændelser',
      path: '/replikering/storkredstilknytninger/haendelser'
    },
    {
      type: 'endpoint',
      anchor: 'valglandsdelstilknytninger-udtræk',
      heading: 'Valglandsdelstilknytninger - udtræk',
      path: '/replikering/valglandsdelstilknytninger'
    },
    {
      type: 'endpoint',
      anchor: 'valglandsdelstilknytninger-hændelser',
      heading: 'Valglandsdelstilknytninger - hændelser',
      path: '/replikering/valglandsdelstilknytninger/haendelser'
    },
    {
      type: 'endpoint',
      anchor: 'udtræk',
      heading: 'Vejstykkepostnummerrelation - udtræk',
      path: '/replikering/vejstykkepostnummerrelationer'
    },
    {
      type: 'endpoint',
      anchor: 'hændelser',
      heading: 'Vejstykkepostnummerrelation - hændelser',
      path: '/replikering/vejstykkepostnummerrelationer/haendelser'
    },
    {
      type: 'endpoint',
      anchor: 'vejstykker-udtræk',
      heading: 'Vejstykker - udtræk',
      path: '/replikering/vejstykker'
    },
    {
      type: 'endpoint',
      anchor: 'vejstykker-hændelser',
      heading: 'Vejstykker - hændelser',
      path: '/replikering/vejstykker/haendelser'
    },
    {
      type: 'endpoint',
      anchor: 'udtræk',
      heading: 'Zonetilknytninger - udtræk',
      path: '/replikering/zonetilknytninger'
    },
    {
      type: 'endpoint',
      anchor: 'hændelser',
      heading: 'Zonetilknytninger - hændelser',
      path: '/replikering/zonetilknytninger/haendelser'
    }
  ]
};
