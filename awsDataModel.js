
function Any(_){ return true; };
exports.Any = Any;

function String(str){ return (typeof str === 'string'); }
exports.String = String;

function Number(str){ return (typeof str === 'number'); }
exports.Number = Number;

function UUID(str){
  var r = /^([0-9a-fA-F]{8}\-[0-9a-fA-F]{4}\-[0-9a-fA-F]{4}\-[0-9a-fA-F]{4}\-[0-9a-fA-F]{12})$/;
  return (str.match(r) == null ? false : true);
}
exports.UUID = UUID;

function Etage(str){ return (str.match(/^([1-9]|[1-9][0-9]|st|kl[0-9]?)$/) === null ? false : true); }
exports.Etage = Etage;

var AdresseBetegnelse = Any;
var DateTime = Any;
var Doer     = Any;
var Husnr    = Any;


var AdgangsAdresse =  {fields: {id:                UUID,
				version:           DateTime,
				husnr:             Husnr},
		       required: ['id', 'version', 'husnr']
		      };


var Adresse =  {fields: {id:                UUID,
			 version:           DateTime,
			 etage:             Etage,
			 dør:               Doer,
			 adressebetegnelse: AdresseBetegnelse,
			 adgangsadressen:   Any},
		required: ['id', 'version', 'adressebetegnelse', 'adgangsadresse']
	       };


var ex1 =  {id: '83292397-2397-2397-2397-239723972397',
	    version: 'satneoh',
	    etage:'kl3',
	    dør:'satneoh',
	    adressebetegnelse:'satneoh',
	    adgangsadressen: {id: '23482348-2348-2348-2348-234823482348',
			      version: 'saoethu',
			      husnr: 'soaeut'}
	   };

function validate(adr, schema){
  var result = validateType([], adr, schema);
  if (result.length === 0){
    return "Success";
  }
  else {
    return "Validation error: "+result;
  }
}

function validateType(errors, adr, schema){
  for (var key in adr) {
    if (adr.hasOwnProperty(key)) {
      var val = adr[key];
      var spec = schema.fields[key];
      if ((typeof spec === 'object') && (typeof val === 'object')){
	validateType(errors, val, spec)
      } else if (typeof spec === 'function'){
	if (!spec(val)){
	  errors.push("specKey="+key+" val="+val);
	}
      } else {
	throw "Schema error: "+ schema;
      }
    }
  }
  return errors;
}
