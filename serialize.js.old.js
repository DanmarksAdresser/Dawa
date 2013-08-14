console.log('serialize modul');

var util= require("util");

exports.serializeAdresser= function (type, cursor, request, response) {	
	var callback= request.query.callback;
	switch(type) {
	case 'json':		
		response.charset= 'utf-8';
		if (callback===undefined) {			
			response.type('application/json');
		}
		else {
			response.type('application/javascript');
			response.write(callback+'(');
		}
		response.write('[');
		break;
	case 'csv':
		response.charset= 'ascii';
		response.type('text/csv');
		response.write(buildOverskriftCsv(),'ascii');
		break;
	case 'html':
		response.charset= 'utf-8';
		response.type('text/html');
		response.write(overskriftHtml(decodeURIComponent(request.originalUrl)));
		break;
	}
	var first= true;
	cursor.each(function(err,adresse) {
		if (err) {
			console.log('nextObject error: '+err);
			return;
		}
		if (adresse) {
			switch(type) {
			case 'json':
				if (!first) {
					response.write(',');
				}
				else {					
					first= false;
				}
				response.write(JSON.stringify(buildAdresseJson(adresse),null,'  '));
				break;
			case 'csv':
				response.write(buildAdresseCsv(adresse),'ascii');
				break;
			case 'html':
				response.write(adresseHtml(adresse));
				break;
			}
		}	
		else {
			console.log("adresse == null");			
			switch(type) {
			case 'json':
				if (callback===undefined) {		
					response.end(']');
				}
				else {
					response.end(']);');
				}
				break;
			case 'csv':
				response.end();
				break;
			case 'html':
				response.end(endHtml());
				break;
			}
		}
	});
};

function antalLigEn(cursor, count, cb) {
	cursor.nextObject(function(err,vej) {
		console.log(util.inspect(vej));
		if (vej !== null) {
			console.log('Efter if: ' + util.inspect(vej));
			count++;
			if (count > 1) {
				cursor.rewind();
			console.log('1 count: %d',count);
				cb(false);
			}
			else {
				antalLigEn(cursor, count, cb);
			}
		}
		else {
			console.log('2 count: %d',count);
			cursor.rewind();
			cb(count===1);
		}
	});
};

exports.serializeFritekstAdresser= function (type, cursor, request, response) {	
	var callback= request.query.callback;
	switch(type) {
	case 'json':		
		response.charset= 'utf-8';
		if (callback===undefined) {			
			response.type('application/json');
		}
		else {
			response.type('application/javascript');
			response.write(callback+'(');
		}
		response.write('[');
		break;
	case 'csv':
		response.charset= 'ascii';
		response.type('text/csv');
		response.write(buildOverskriftCsv(),'ascii');
		break;
	case 'html':
		response.charset= 'utf-8';
		response.type('text/html');
		response.write(overskriftHtml(decodeURIComponent(request.originalUrl)));
		break;
	};
	var first= true;
	cursor.each(function(err,vej) {
		if (err) {
			console.log('nextObject error: '+err);
			return;
		};
		if (vej) {
			var adresse= tomDBAdresse();
			adresse.vej.navn= vej.navn;
			switch(type) {
			case 'json':
					if (!first) {
						response.write(',');
					}
					else {								
						first= false;
					}
				response.write(JSON.stringify(buildAdresseJson(adresse), null, '  '));
				break;
			case 'csv':
				response.write(buildAdresseCsv(adresse),'ascii');
				break;
			case 'html':
				response.write(adresseHtml(adresse));
				break;
			}
		}	
		else {
			console.log("adresse == null");			
			switch(type) {
			case 'json':
				if (callback===undefined) {		
					response.end(']');
				}
				else {
					response.end(']);');
				}
				break;
			case 'csv':
				response.end();
				break;
			case 'html':
				response.end(endHtml());
				break;
			}
		}
	});
};

exports.serializeAdresse= function (type, cursor, request, response) {
	cursor.nextObject(function(err,adresse) {
		if (err) {
			console.log('nextObject error: '+err);
			return;
		}
		if (adresse === null) {			       
      response.jsonp("Adresseid er ukendt", 404)
		}
		else {
			exports.serializeAdresseDoc(type, adresse, request, response);
		}
	});
};

exports.serializeAdresseDoc= function (type, adresse, request, response) {
	switch(type) {
	case 'json':
		response.jsonp(buildAdresseJson(adresse));
		break;
	case 'csv':
		response.charset= 'ascii';
		response.type('text/csv');
		response.write(buildOverskriftCsv(),'ascii');
		response.end(buildAdresseCsv(adresse),'ascii');
		break;
	case 'html':
		response.charset= 'utf-8';
		response.type('text/html');
		response.write(overskriftHtml(decodeURIComponent(request.originalUrl)));
		response.write(adresseHtml(adresse));
		response.end(endHtml());
		break;
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

function overskriftHtml(url) {
	return "<!doctype html><html lang='da'><body><h1>"+url+"</h1><table border='1'><thead>"+
		"<th>id</th>"+
		"<th>vejkode</th>"+
		"<th>vejnavn</th>"+
		"<th>husnr</th>"+
		"<th>etage</th>"+
		"<th>dør</th>"+
		"<th>bygningsnavn</th>"+
		"<th>supplerendebynavn</th>"+
		"<th>postnummer</th>"+
		"<th>postnummernavn</th>"+
		"<th>kommunekode</th>"+
		"<th>ejerlav nr</th>"+
		"<th>ejerlav navn</th>"+
		"<th>landsejerlav</th>"+
		"<th>matrikelnr</th>"+
		"<th>adgangsadresseid</th>"+
		"<th>etrs89koordinatøst</th>"+
		"<th>etrs89koordinatnord</th>"+
		"<th>wgs84koordinatlængde</th>"+
		"<th>wgs84koordinatbredde</th>"+
		"<th>nøjagtighed</th>"+
		"<th>kilde</th>"+
		"<th>tekniskstandard</th>"+
		"<th>tekstretning</th>"+
		"<th>adressepunkt ændret</th>"+
		"<th>oprettet</th>"+
		"<th>gyldig</th>"+	
		"<th>ændret</th>"+
		"<th>KN100mDK</th>"+
		"<th>KN1kmDK</th>"+
		"<th>KN10kmDK</th>"+
		"<th>sognnr</th>"+
		"<th>sognnavn</th>"+		
		"</thead><tbody>"
};

function adresseHtml(adresse) {
	return util.format("<tr>"+
		"<td>%s</td><td>%s</td><td>%s</td><td>%s</td><td>%s</td><td>%s</td><td>%s</td><td>%s</td><td>%s</td><td>%s</td><td>%s</td><td>%s</td><td>%s</td><td>%s</td><td>%s</td><td>%s</td><td>%s</td><td>%s</td><td>%s</td><td>%s</td><td>%s</td><td>%s</td><td>%s</td><td>%s</td><td>%s</td><td>%s</td><td>%s</td><td>%s</td><td>%s</td><td>%s</td><td>%s</td><td>%s</td><td>%s</td>"+
		"</tr>",
		adresse.id,
		adresse.vej.kode,
		adresse.vej.navn,
		adresse.husnr,
		adresse.etage,
		adresse.dør,
		adresse.bygningsnavn,
		adresse.supplerendebynavn,
		adresse.postnummer.nr,
		adresse.postnummer.navn,
		adresse.kommunekode,
		adresse.ejerlav.nr,
		adresse.ejerlav.navn,
		adresse.landsejerlav,
		adresse.matrikelnr,
		adresse.adgangsadresseid,
		adresse.adressepunkt.etrs89koordinat.coordinates[0],
		adresse.adressepunkt.etrs89koordinat.coordinates[1],
		adresse.adressepunkt.wgs84koordinat.coordinates[0],
		adresse.adressepunkt.wgs84koordinat.coordinates[1],		
		adresse.adressepunkt.nøjagtighed,
		adresse.adressepunkt.kilde,
		adresse.adressepunkt.tekniskstandard,
		adresse.adressepunkt.tekstretning,
		adresse.adressepunkt.ændret,
		adresse.oprettet,
		adresse.gyldig,
		adresse.ændret,
		adresse.DDKN.m100,
		adresse.DDKN.km1,
		adresse.DDKN.km10,
		adresse.sogn.nr,
		adresse.sogn.navn
	);
};

function endHtml() {
	return util.format("</tbody></table></body></html>");
}

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

function buildOverskriftCsv() {
	return util.format(
		"id;"+
		"vejkode;"+
		"vejnavn;"+
		"husnr;"+
		"etage;"+
		"dør;"+
		"bygningsnavn;"+
		"supplerendebynavn;"+
		"postnummer;"+
		"postnummernavn;"+
		"kommunekode;"+
		"ejerlav nr;"+
		"ejerlav navn;"+
		"landsejerlav;"+
		"matrikelnr;"+
		"adgangsadresseid;"+
		"etrs89koordinatøst;"+
		"etrs89koordinatnord;"+
		"wgs84koordinatlængde;"+
		"wgs84koordinatbredde;"+
		"nøjagtighed;"+
		"kilde;"+
		"tekniskstandard;"+
		"tekstretning;"+
		"adressepunkt ændret;"+
		"oprettet;"+
		"gyldig;"+
		"ændret;"+
		"KN100mDK;"+
		"KN1kmDK;"+
		"KN10kmDK;"+
		"sognnr;"+
		"sognnavn"+
		"\r\n"
	);
};

function buildAdresseCsv(adresse) {
	console.log('Koordinat: '+ adresse.adressepunkt.wgs84koordinat.coordinates[0] + ', ' + adresse.adressepunkt.wgs84koordinat.coordinates[1]);
	return util.format("%s;%s;%s;%s;%s;%s;%s;%s;%s;%s;%s;%s;%s;%s;%s;%s;%s;%s;%s;%s;%s;%s;%s;%s;%s;%s;%s;%s;%s;%s;%s;%s;%s\r\n",
		adresse.id,
		adresse.vej.kode,
		adresse.vej.navn,
		adresse.husnr,
		adresse.etage,
		adresse.dør,
		adresse.bygningsnavn,
		adresse.supplerendebynavn,
		adresse.postnummer.nr,
		adresse.postnummer.navn,
		adresse.kommunekode,
		adresse.ejerlav.nr,
		adresse.ejerlav.navn,
		adresse.landsejerlav,
		adresse.matrikelnr,
		adresse.adgangsadresseid,
		adresse.adressepunkt.etrs89koordinat.coordinates[0],
		adresse.adressepunkt.etrs89koordinat.coordinates[1],
		adresse.adressepunkt.wgs84koordinat.coordinates[0],
		adresse.adressepunkt.wgs84koordinat.coordinates[1],	
		adresse.adressepunkt.nøjagtighed,
		adresse.adressepunkt.kilde,
		adresse.adressepunkt.tekniskstandard,
		adresse.adressepunkt.tekstretning,
		adresse.adressepunkt.ændret,
		adresse.oprettet,
		adresse.gyldig,
		adresse.ændret,
		adresse.DDKN.m100,
		adresse.DDKN.km1,
		adresse.DDKN.km10,
		adresse.sogn.nr,
		adresse.sogn.navn
	);
};