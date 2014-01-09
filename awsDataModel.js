
function defRegexpType(regexp){
  return function (str){ return (str.match(regexp) == null ? false : true); };
}

function Any(_){ return true; };
exports.Any = Any;

function String(str){ return (typeof str === 'string'); }
exports.String = String;

function Number(str){ return (typeof str === 'number'); }
exports.Number = Number;

var UUID = defRegexpType(/^([0-9a-fA-F]{8}\-[0-9a-fA-F]{4}\-[0-9a-fA-F]{4}\-[0-9a-fA-F]{4}\-[0-9a-fA-F]{12})$/);
exports.UUID = UUID;

var Etage = defRegexpType(/^([1-9]|[1-9][0-9]|st|kl[0-9]?)$/);
exports.Etage = Etage;

var AdgangsAdresse =  {fields: {id:                UUID,
				version:           Any,
				husnr:             Any},
		       required: ['id', 'version', 'husnr']
		      };
exports.AdgangsAdresse = AdgangsAdresse;

var Adresse =  {fields: {id:                UUID,
			 version:           Any,
			 etage:             Etage,
			 dør:               Any,
			 adressebetegnelse: Any,
			 adgangsadressen:   AdgangsAdresse},
		required: ['id', 'version', 'adressebetegnelse']
	       };
exports.Adresse = Adresse;

exports.validate = function (data, schema){
  var result = validateType([], data, schema);
  if (result.length === 0){
    return "Success";
  }
  else {
    return "Validation error: "+result;
  }
}

function validateType(errors, data, schema){
  schema.required.forEach(function(f){
    if (data[f] === undefined){
      errors.push(" Missing required field: "+f);
    }
  });

  for (var key in data) {
    if (data.hasOwnProperty(key)) {
      var val = data[key];
      var spec = schema.fields[key];
      if ((typeof spec === 'object') && (typeof val === 'object')){
	validateType(errors, val, spec)
      } else if (typeof spec === 'function'){
	if (!spec(val)){
	  errors.push(" SpecKey="+key+" val="+val);
	}
      } else if (spec === undefined){
        errors.push(" Unknown field found: "+key);
      } else{
	throw "Schema error: "+ spec+ "  " +schema;
      }
    }
  }
  return errors;
}
