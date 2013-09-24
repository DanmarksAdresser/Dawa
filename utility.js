console.log('utility modul');

var util= require("util");

exports.getFormat= function (type) {
  if (type === undefined) type= 'json';
  type= type.toLocaleLowerCase();
  return (type === 'csv' || type === 'json' || type === 'html')?type:undefined;
}


exports.paginering= function(query) {
  var result= {};
  if (query.side && query.per_side) {
    result.status= 1;
    result.side= parseInt(query.side, 10);
    result.per_side= parseInt(query.per_side, 10);
    result.skip=  (result.side-1)*result.per_side;
    result.limit= result.per_side;
  }
  else if (query.side || query.per_side){
    result.status= 2;
  }
  else {
    result.status= 0;
  }
  return result;
}

exports.wildcard= function(s) {
  if (s.indexOf('*') !== -1) {
    if (s.charAt(0) !== '*') {
      s = '^' + s; // + '$';
    }
    if (s.charAt(s.length - 1) !== '*') {
      s = s + '$';
    }
    return new RegExp(s.replace(/\*/g, '(.*)'), 'i')
  }
  return s;
}