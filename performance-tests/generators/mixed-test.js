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
//   {
//   name: 'adresseudtræk',
//   type: 'fixedConcurrency',
//   url: '/adresser',
//   concurrency: 1,
//   clientCount: 4,
//   rampUpDelay: 100,
// },
  {
  name: 'autocomplete',
  type: 'fixedRps',
  url: () => {
    const params = {q: randomString(8) + ' ' + Math.floor(Math.random() * 100)};
    if(Math.random() * 10 < 1) {
      params.fuzzy = '';
    }
    return '/autocomplete?' + querystring.stringify(params);
  },
  initial: 1,
  increase: 1,
  max: 80,
  clientCount: 250,
  increasePeriod: 1000,
  increaseDelay: 10000
}];
