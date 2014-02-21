

var BBRAdresse =
  {
    schema: 'BBR-datamodel for adresser',
    properties:
    [
      { name: 'id',
	type: 'UUID-String'}, // regexp: /[0-9a-fA-F]{8}\-[0-9a-fA-F]{4}\-[0-9a-fA-F]{4}\-[0-9a-fA-F]{4}\-[0-9a-fA-F]{12}/

      { name: 'version', // Better name given it's a date-time?
	type: 'DateTime-String'}, // What is the format?
      // Would a counter be better (it avoids issues with timezones and clock drift)?

      { name: 'etage',
	type: 'String'}, // regexp: /[1-9]|[1-9][0-9]|st|kl[0-9]?/
      // What about numbers: -9, -8, ..., 0, 1, ... ,98, 99?
      // Why upper and lowel bounds on floors?  They seem rather rescrictive.

      { name: 'dør',
	type: 'String'}, // regexp: not really sure? Quote: 'tal fra 1 til 9999, små og store bogstaver samt tegnene / og -.

      { name: 'AAD id',
	type: 'UUID-String'},
      // What is the difference to id?
      // Why the space in the name?

      { name: 'vej',
	type: [{ name: 'kode',
		 type: 'String' // regexp: /\d{4}/
	       },
	       { name: 'navn',
		 type: 'String' // max 40 characters
	       }]},

      { name: 'husnr',
	type: 'String'}, // regexp: /([1-9]|[1-9]\d|[1-9]\d{2})[A-Z]/
      // Seems rescrictive, only up to 999, and only upper case letters?

      { name: 'supplerendebynavn',
	type: 'String'}, // Max 34 characters
      // If this is directly related to zipcodes, then maybe it should be under 'postnummer'

      { name: 'postnummer',
	type: [{ name: 'nr',
		 type: 'String' // regexp: /\d{4}/
	       },
	       { name: 'navn',
		 type: 'String' // Max 20 characters
	       }]},

      { name: 'kommune',
	type: [{ name: 'kode',
		 type: 'String' // regexp: /\d{4}/
	       },
	       { name: 'navn',
		 type: 'String' // How many characters?
	       }]},

      { name: 'ejerlav',
	type: [{ name: 'kode',
		 type: 'String' // How many characters?
	       },
	       {name: 'navn',
		type: 'String'  // How many characters?
	       }]},

      { name: 'matrikelnr',
	type: 'String'}, // regexp: /???????/ AND /\w*\d?\w*\d?\w*\d?\w*\d?|\w*/ AND /\d*\w?\d*\w?\d*\w?\d*/
      // A better regexp should be found

      { name: 'esrejendomsnr',
	type: 'String'}, // regexp: /\d{6}/
      // Could the type be integer?

      { name: 'historik',
	type: [{ name: 'oprettet',
		 type: 'DateTime-String'}, // Format?
	       { name: 'ændret',
		 type: 'DateTime-String'}]}, // Format?

      { name: 'adgangspunkt',
	type: [{ name: 'etrs89koordinat',
		 type: [{ name: 'øst',
			  type: 'Integer'}, // Ranges?  Greenland?
			{ name: 'nord',
			  type: 'Integer'}]}, // Ranges?
	       { name: 'wgs84koordinat',
		 type: [{ name: 'bredde',
			  type: 'Float'},
			{ name: 'længde',
			  type: 'Float'}]},
	       { name: 'nøjagtighed',
		 type: 'String'}, // regexp: /A|B|U/
	       { name: 'kilde',
		 type: 'Integer'}, // 1 <= x <= 5
	       { name: 'tekniskstandard',
		 type: 'String'}, // regexp: /TD|TK|TN|UF/
	       { name: 'tekstretning', // Hvad kommer dette navn af?
		 type: 'float'}, // 0.00 <= x <= 400.00, 2 decimaler
	       { name: 'ændret',
		 type: 'DateTime-String'}]}, // Format?

      { name: 'DDKN',
	type: [{ name: 'm100',
		 type: 'String'}, // regexp: /100m_(\d{5})_(\d{4})/, $1 range?, $2 range?
	       { name: 'km1',
		 type: 'String'}, // regexp: /1km_(\d{4})_(\d{3})/, $1 range?, $2 range?
	       { name: 'km10',
		 type: 'String'}, // regexp: /10km_(\d{3})_(\d{2})/, $1 range?, $2 range?
	      ]},

      { name: 'Objekttype',
	type: 'Integer'} // range: ?
    ]
  };
