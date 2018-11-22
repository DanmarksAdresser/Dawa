const querystring = require('querystring');
const chars = 'abcdefghijklmnopqrstuvwxyzæøåé';

function randomString(length) {
  length = length ? length : 32;

  var string = '';

  for (var i = 0; i < length; i++) {
    var randomNumber = Math.floor(Math.random() * chars.length);
    string += chars.substring(randomNumber, randomNumber + 1);
  }

  return string;
}

module.exports = [
  // {
  // name: 'adresseudtræk',
  // type: 'fixedConcurrency',
  // url: '/adresser',
  // concurrency: 100,
  // clientCount: 20,
  // rampUpDelay: 100,
  // }
  // ,
  // {
  // name: 'postnumre',
  // type: 'fixedConcurrency',
  // url: '/postnumre',
  // concurrency: 10,
  // clientCount: 20,
  // rampUpDelay: 100,
  // }
  // ,
  // {
  //   name: 'adgangsadresseAutocomplete',
  //   type: 'fixedRps',
  //   url: () => {
  //     const params = {q: randomString(8) + ' ' + Math.floor(Math.random() * 100)};
  //     return '/adgangsadresser/autocomplete?' + querystring.stringify(params);
  //   },
  //   initial: 1,
  //   increase: 10,
  //   max: 100,
  //   clientCount: 50,
  //   increasePeriod: 1000,
  //   increaseDelay: 10000
  // }
  // ,
  {
    name: 'datavask',
    type: 'fixedRps',
    url: () => {
      const params = {betegnelse: randomString(8) + ' ' + Math.floor(Math.random() * 100)};
      return '/datavask/adresser?' + querystring.stringify(params);
    },
    initial: 1,
    increase: 10,
    max: 5,
    clientCount: 50,
    increasePeriod: 1000,
    increaseDelay: 10000
  }
  // ,
  // {
  //   name: 'autocomplete',
  //   type: 'fixedRps',
  //   url: () => {
  //     const params = {q: randomString(8) + ' ' + Math.floor(Math.random() * 100)};
  //     if (Math.random() * 10 < 1) {
  //       params.fuzzy = '';
  //     }
  //     return '/autocomplete?' + querystring.stringify(params);
  //   },
  //   initial: 1,
  //   increase: 10,
  //   max: 250,
  //   clientCount: 250,
  //   increasePeriod: 1000,
  //   increaseDelay: 10000
  // }
];
