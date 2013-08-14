var assert = require("assert")
	,	request = require("request")
	, util= require('util');

describe('Adressevalidering', function(){

  it('Alleshavevej,1,4593 er ok', function(done){
    request('http://localhost:3000/adresser/valid.json?vejnavn=Alleshavevej&husnr=1&postnr=4593', function (error, response, body) {
	    if (error || response.statusCode != 200) {
	      throw error;
	    }
	    else {
	      var adresse= JSON.parse(body);
	      line= util.format(adresse.vej.navn + " " + adresse.husnr + ', ' + adresse.postnummer.nr + ' ' + adresse.postnummer.navn + '(' + adresse.kommunekode + ')');
	      //console.log(line);
	    }
	    done();
	  })
	});

  it('Lilledal,23,3450,1,tv er ok', function(done){
    request('http://localhost:3000/adresser/valid.json?vejnavn=Lilledal&husnr=23&postnr=3450&etage=1&dør=tv', function (error, response, body) {
	    if (error || response.statusCode != 200) {
	      throw error;
	    }
	    else {
	      var adresse= JSON.parse(body);
	      line= util.format(adresse.vej.navn + " " + adresse.husnr + ', ' + adresse.postnummer.nr + ' ' + adresse.postnummer.navn + '(' + adresse.kommunekode + ')');
	      //console.log(line);
	    }
	    done();
	  });

	});

  it('Hulgårdsvej,67,2400 er ok', function(done){
    request('http://localhost:3000/adresser/valid.json?vejnavn=Hulgårdsvej&husnr=67&postnr=2400', function (error, response, body) {
	    if (error || response.statusCode != 200) {
	      throw error;
	    }
	    else {
	      var adresse= JSON.parse(body);
	      line= util.format(adresse.vej.navn + " " + adresse.husnr + ', ' + adresse.postnummer.nr + ' ' + adresse.postnummer.navn + '(' + adresse.kommunekode + ')');
	      //console.log(line);
	    }
	    done();
	  });
	});
});

describe('Adressesøgning', function(){
  it('*ødkild*, 46, 2400', function(done){
    request('http://localhost:3000/adresser.json?vejnavn=*ødkild*&husnr=46&postnr=2400', function (error, response, body) {
	    if (error || response.statusCode != 200) {
	      throw error;
	    }
	    else {
	      var adresser= JSON.parse(body);
	      var adresse= adresser[0];
	      line= util.format(adresse.vej.navn + " " + adresse.husnr + ', ' + adresse.postnummer.nr + ' ' + adresse.postnummer.navn + '(' + adresse.kommunekode + ')');
	      //console.log(line);
	    }
	    done();
	  })
	})
});

describe('Adresseopslag', function(){

  it('2f725450-a76a-11e2-9692-b7a1608861ab', function(done){
    request('http://localhost:3000/adresser/2f725450-a76a-11e2-9692-b7a1608861ab.json', function (error, response, body) {
	    if (error || response.statusCode != 200) {
	      throw error;
	    }
	    else {
	      var adresse= JSON.parse(body);
	      line= util.format(adresse.vej.navn + " " + adresse.husnr + ', ' + adresse.postnummer.nr + ' ' + adresse.postnummer.navn + '(' + adresse.kommunekode + ')');
	      //console.log(line);
	    }
	    done();
	  })
	})

  it('adresser12.546387,54.931285.json', function(done){
    request('http://localhost:3000/adresser/12.513428,54.737308.json', function (error, response, body) {
	    if (error || response.statusCode != 200) {
	      throw error;
    new RegExp('^'+req.query.etage+'$', 'gi');
	    }
	    else {
	      var adresse= JSON.parse(body);
	      line= util.format(adresse.vej.navn + " " + adresse.husnr + ', ' + adresse.postnummer.nr + ' ' + adresse.postnummer.navn + '(' + adresse.kommunekode + ')');
	      console.log(line);
	    }
	    done();
	  })
	});
});
