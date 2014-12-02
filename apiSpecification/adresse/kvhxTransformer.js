"use strict";

var kvhTransformer = require('../adgangsadresse/kvhTransformer');

exports.format = function(rs) {
  return kvhTransformer.format(rs) +
         pad(rs.etage, 3);
};

function pad(val, length) {
  return ("____" + val).slice(-1 * length);
}

exports.kvhxFieldsDts = kvhTransformer.kvhFieldsDts +
'<dt>Index 12-14: Etage</dt><dd>Adressens etage (TODO her mangler link. Hvis etageangivelsen fylder mindre end 3 tegn, foranstilles med underscore, ‘st’ repræsenteres altså som "_st"</dd>' +
'<dt>Index 15-18: Dør</dt><dd>Angivelse af dør. Hvis dørbetegnelsen fylder mindre end 3 tegn, foranstilles med underscore, 2 repræsenteres altså som "___2"';
