"use strict";
const _ = require('underscore');
const replikeringDataModels = require('../apiSpecification/replikering/datamodel');
const dar10TableModels = require('../dar10/dar10TableModels');

const adresseEntities = ['adgangsadresse', 'adresse', 'navngivenvej', 'vejstykke', 'postnummer'];
const darEntities = Object.keys(dar10TableModels.historyTableModels);
const darReplikeringEntities =[
  ...darEntities.map(entityName => `dar_${entityName.toLowerCase()}_aktuel`),
  ...darEntities.map(entityName => `dar_${entityName.toLowerCase()}_historik`)];
const otherEntities = _.difference(Object.keys(replikeringDataModels), adresseEntities, darReplikeringEntities);

adresseEntities.sort();
darReplikeringEntities.sort();
otherEntities.sort();

module.exports = [{
  title: 'Adressedata',
  lead: 'Adressedata omfatter de entiter, som indgår i adressebetegnelsen: adgangsadresser, adresser, vejstykker samt postnumre.',
  entities: adresseEntities,
}, {
  title: 'Relaterede data',
  lead: 'Data som relaterer sig til adresser, eksempelvis deres beliggenhed i DAGI-inddelingerne samt hvilket jordstykke adressen er placeret på.',
  entities: otherEntities
}, {
  title: 'DAR data',
  lead: `DAWA modtager adressedata fra DAR (Danmarks Adresse Register). Vi udstiller rådata fra DAR \
på replikerings-API'et, når DAR 1.0 tages i produktion (forventet ultimo maj 2018). DAR 1.0 anvender en lidt anden \
datamodel og begreber end DAWA. Der er endnu ikke udarbejdet dokumentation for de udstillede attributter - der henvises til <a href="http://data.gov.dk/model/">grunddatamodellen.</a> \
Vær opmærksom på, at struktur, indhold og feltnavne på DAR data er af en intern karakter. Såfremt DAR ændrer i disse, vil \ 
replikerings-API'et følge disse ændringer, og dette vil ske uden varsel. Nedenstående strukturer er altså <em>ikke</em> omfattet af
DAWAs sædvanlige garantier om bagudkompatibiletet.`,
  entities: darReplikeringEntities
}];