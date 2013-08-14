console.log('serialize modul');

var util= require("util");

exports.serializeAdresser= function (cursor, request, response) {	
	var callback= request.query.callback;
	response.charset= 'utf-8';
	if (callback===undefined) {			
		response.type('application/json');
	}
	else {
		response.type('application/javascript');
		response.write(callback+'(');
	}
	response.write('[');
	var first= true;
	cursor.each(function(err,adresse) {
		if (err) {
			console.log('nextObject error: '+err);
			return;
		}
		if (adresse) {
			if (!first) {
				response.write(',');
			}
			else {					
				first= false;
			}
			response.write(JSON.stringify(buildAdresseJson(adresse),null,'  '));
		}	
		else {
			console.log("adresse == null");	
			if (callback===undefined) {		
				response.end(']');
			}
			else {
				response.end(']);');
			}
		}
	});
};

exports.serializeFritekstAdresser= function (cursor, request, response) {	
	var callback= request.query.callback;
	response.charset= 'utf-8';
	if (callback===undefined) {			
		response.type('application/json');
	}
	else {
		response.type('application/javascript');
		response.write(callback+'(');
	}
	response.write('[');
	
	var first= true;
	cursor.each(function(err,vej) {
		if (err) {
			console.log('nextObject error: '+err);
			return;
		};
		if (vej) {
			var adresse= tomDBAdresse();
			adresse.vej.navn= vej.navn;
			if (!first) {
				response.write(',');
			}
			else {								
				first= false;
			}
			response.write(JSON.stringify(buildAdresseJson(adresse), null, '  '));
		}	
		else {
			console.log("adresse == null");	
			if (callback===undefined) {		
				response.end(']');
			}
			else {
				response.end(']);');
			}
		}
	});
};

exports.serializeAdresse= function (cursor, request, response) {
	cursor.nextObject(function(err,adresse) {
		if (err) {
			console.log('nextObject error: '+err);
			return;
		}
		if (adresse === null) {			       
      response.jsonp("Adresseid er ukendt", 404)
		}
		else {
			exports.serializeAdresseDoc(adresse, request, response);
		}
	});
};

exports.serializeAdresseDoc= function (adresse, request, response) {	
	var callback= request.query.callback;
	response.charset= 'utf-8';
	if (callback===undefined) {			
		response.type('application/json');
	}
	else {
		response.type('application/javascript');
		response.write(callback+'(');
	};
	response.write(JSON.stringify(buildAdresseJson(adresse), null, '  '));
	if (callback===undefined) {		
		response.end();
	}
	else {
		response.end(');');
	}
};

function tomDBAdresse() {	
	var adresse= {};
	adresse.id= '';
	adresse.vej= {kode: '', navn: ''};
	adresse.husnr= '';
	adresse.etage= '';
	adresse.dør= '';
	adresse.bygningsnavn= '';
	adresse.supplerendebynavn= '';
	adresse.postnummer= {nr: '', navn: ''};
	adresse.kommunekode= {kode: ''};
	adresse.adgangsadresseid= '';
	adresse.adressepunkt= {};
	adresse.adressepunkt.etrs89koordinat= {};
	adresse.adressepunkt.etrs89koordinat.coordinates= ['',''];
	adresse.adressepunkt.wgs84koordinat= {};
	adresse.adressepunkt.wgs84koordinat.coordinates= ['',''];
	adresse.adressepunkt.nøjagtighed= '';
	adresse.adressepunkt.kilde= '';
	adresse.adressepunkt.tekniskstandard= '';
	adresse.adressepunkt.tekstretning= '';
	adresse.adressepunkt.ændret= '';
	adresse.historik= {};
	adresse.historik.oprettet= '';
	adresse.historik.gyldig= '';
	adresse.historik.ændret= '';
  adresse.DDKN= {};
  adresse.DDKN.m100= '';
  adresse.DDKN.km1= '';
  adresse.DDKN.km10= '';
	adresse.sogn= {};
	adresse.sogn.nr= '';
	adresse.sogn.navn= '';
	return adresse;
};


function buildAdresseJson(adresse) {	
	var nyadresse= {};
	nyadresse.id= adresse.id;
	nyadresse.vej= adresse.vej;
	nyadresse.husnr= adresse.husnr;
	nyadresse.etage= adresse.etage;
	nyadresse.dør= adresse.dør;
	nyadresse.bygningsnavn= adresse.bygningsnavn;
	nyadresse.supplerendebynavn= adresse.supplerendebynavn;
	nyadresse.postnummer= adresse.postnummer;
	nyadresse.kommune= {};
	nyadresse.kommune.kode= adresse.kommunekode;
	nyadresse.ejerlav= adresse.ejerlav;
	nyadresse.landsejerlav= adresse.landsejerlav;
	nyadresse.matrikelnr= adresse.matrikelnr;
	nyadresse.adgangsadresse= {};
	nyadresse.adgangsadresse.id= adresse.adgangsadresseid;
	nyadresse.adressepunkt= {};
	nyadresse.adressepunkt.etrs89koordinat= {};
	nyadresse.adressepunkt.etrs89koordinat.øst= adresse.adressepunkt.etrs89koordinat.coordinates[0];
	nyadresse.adressepunkt.etrs89koordinat.nord= adresse.adressepunkt.etrs89koordinat.coordinates[1];
	nyadresse.adressepunkt.wgs84koordinat= {};
	nyadresse.adressepunkt.wgs84koordinat.længde= adresse.adressepunkt.wgs84koordinat.coordinates[0];
	nyadresse.adressepunkt.wgs84koordinat.bredde= adresse.adressepunkt.wgs84koordinat.coordinates[1];
	nyadresse.adressepunkt.nøjagtighed= adresse.adressepunkt.nøjagtighed;
	nyadresse.adressepunkt.kilde= adresse.adressepunkt.kilde;
	nyadresse.adressepunkt.tekniskstandard= adresse.adressepunkt.tekniskstandard;
	nyadresse.adressepunkt.tekstretning= adresse.adressepunkt.tekstretning;
	nyadresse.adressepunkt.ændret= adresse.adressepunkt.ændret;
	nyadresse.historik= {};
	nyadresse.historik.oprettet= adresse.oprettet;
	nyadresse.historik.gyldig= adresse.gyldig;
	nyadresse.historik.ændret= adresse.ændret;	
	nyadresse.DDKN= adresse.DDKN;
	nyadresse.sogn= adresse.sogn;
	return nyadresse;
};
