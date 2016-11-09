"use strict";

var assert = require("assert")
	,	request = require("request")
	, util= require('util')
  , csv = require('csv')
  , rp = require('request-promise')
  , Q= require('Q')
  , http= require('http');

//var host= "http://localhost:3000";
var host= "http://dawa.aws.dk";
console.log(host);

describe('Adressevalidering', function(){

  it('Alleshavevej,11,4593 er ok', function(done){
    request(encodeURI(host+'/adresser?vejnavn=Alleshavevej&husnr=11&postnr=4593&cache=no-cache'), function (error, response, body) {    	
    	assert.equal(error,null);
    	assert.equal(response.statusCode,200);
	    var adresser= JSON.parse(body);
	    assert.equal(adresser.length,1);
	    done();
	  })
	});

  it('Lilledal,23,3450,1,tv er ok', function(done){
    request(encodeURI(host+'/adresser?vejnavn=Lilledal&husnr=23&postnr=3450&etage=1&dør=tv&cache=no-cache'), function (error, response, body) {  	
    	assert.equal(error,null);
    	assert.equal(response.statusCode,200);
	    var adresser= JSON.parse(body);
	    assert.equal(adresser.length,1);
	    done();
	  });
	});

  it('Hulgårdsvej,67,2400 er ok', function(done){
    request(encodeURI(host+'/adresser?vejnavn=Hulgårdsvej&husnr=67&postnr=2400&etage=&dør=&cache=no-cache'), function (error, response, body) {  	
    	assert.equal(error,null);
    	assert.equal(response.statusCode,200);
	    var adresser= JSON.parse(body);
	    assert.equal(adresser.length,1);
	    done();
	  });
	});

});

describe('Adressesøgning', function(){

  it('rødkild*, 46, 2400', function(done){
    request(encodeURI(host+'/adresser?q=rødkild*&husnr=46&postnr=2400&cache=no-cache'), function (error, response, body) {  	
    	assert.equal(error,null);
    	assert.equal(response.statusCode,200);
	    var adresser= JSON.parse(body);
	    assert.equal(adresser.length,1);
	    done();
	  })
	})

	 it('vejnavn=Rødkildevej', function(done){
    request(encodeURI(host+'/adresser?vejnavn=Rødkildevej&cache=no-cache'), function (error, response, body) {  	
    	assert.equal(error,null);
    	assert.equal(response.statusCode,200);
	    var adresser= JSON.parse(body);
	    assert(adresser.length>1);
	    done();
	  })
	})


  it('regionskode=1083&husnr=77', function(done){
    request(encodeURI(host+'/adgangsadresser?regionskode=1083&husnr=77&cache=no-cache'), function (error, response, body) {    
      assert.equal(error,null);
      assert.equal(response.statusCode,200);
      var adresser= JSON.parse(body);
      assert(adresser.length>1);
      done();
    })
  })

  it('nøjagtighed=U', function(done){
    request(encodeURI(host+'/adgangsadresser?nøjagtighed=U&cache=no-cache'), function (error, response, body) {    
      assert.equal(error,null);
      assert.equal(response.statusCode,200);
      var adresser= JSON.parse(body);
      assert(adresser.length>1);
      done();
    })
  })

  it('ejerlavkode=2000162&matrikelnr=381', function(done){
    request(encodeURI(host+'/adresser?ejerlavkode=2000162&matrikelnr=381&cache=no-cache'), function (error, response, body) {    
      assert.equal(error,null);
      assert.equal(response.statusCode,200);
      var adresser= JSON.parse(body);
      assert(adresser.length>1);
      done();
    })
  })

});

describe('Adresseopslag', function(){

  it('2f725450-a76a-11e2-9692-b7a1608861ab', function(done){
    request(encodeURI(host+'/adresser/0a3f50a0-73ca-32b8-e044-0003ba298018?cache=no-cache'), function (error, response, body) {  	
    	assert.equal(error,null);
    	assert.equal(response.statusCode,200);
	    done();
	  })
	})

  it("korrekt indhold", function(done){

    var options= {};
    options.baseUrl= host;
    options.url='adresser';
    options.qs= {};
    options.qs.cache= 'no-cache';
    options.qs.id= '0a3f50a0-73ca-32b8-e044-0003ba298018';
    options.resolveWithFullResponse= true;
    rp(options).then((response) => {
      assert(response.statusCode===200, "Http status code != 200 (" + response.statusCode + ")"); 
      var adresser= JSON.parse(response.body);
      assert(adresser.length===1, "Flere forekomster. Antal: " + adresser.length);
      var adresse= adresser[0];
      assert(adresse.id==="0a3f50a0-73ca-32b8-e044-0003ba298018", 'Id forskellig: ' + adresse.id);
      assert(adresse.status===1, 'Status forskellig:' + adresse.status);
      assert(adresse.kvhx==="01016100__46_______", 'kvhx forskellig: ' + adresse.kvhx);
      assert(adresse.historik.oprettet==="2000-02-05T20:25:16.000", 'oprettet forskellig:' + adresse.historik.oprettet);
      assert(adresse.historik.ændret==="2000-02-05T20:25:16.000", 'ændret forskellig: ' + adresse.historik.ændret);
      assert(adresse.etage===null, 'etage forskellig: ' + adresse.etage);
      assert(adresse.dør===null, 'dør forskellig: ' + adresse.dør);
      assert(adresse.adgangsadresse.vejstykke.navn==="Rødkildevej", 'adresse.vejstykke.navn: ' + adresse.adgangsadresse.vejstykke.navn);
      assert(adresse.adgangsadresse.vejstykke.kode==="6100", 'adresse.vejstykke.kodeforskellig: ' + adresse.adgangsadresse.vejstykke.kode);
      assert(adresse.adgangsadresse.vejstykke.adresseringsnavn==="Rødkildevej", 'adresse.vejstykke.adresseringsnavn forskellig: ' + adresse.adgangsadresse.vejstykke.adresseringsnavn);
      assert(adresse.adgangsadresse.husnr==="46", 'adresse.husnr: ' + adresse.adgangsadresse.husnr);
      assert(adresse.adgangsadresse.supplerendebynavn===null, 'adresse.supplerendebynavn forskellig: ' + adresse.adgangsadresse.supplerendebynavn);
      assert(adresse.adgangsadresse.postnummer.nr==="2400", 'adresse.postnummer.nr forskellig: ' + adresse.adgangsadresse.postnummer.nr);
      assert(adresse.adgangsadresse.postnummer.navn==="København NV", 'adresse.postnummer.navn forskellig: ' + adresse.adgangsadresse.postnummer.navn);
      assert(adresse.adgangsadresse.stormodtagerpostnummer===null, 'adresse.stormodtagerpostnummer forskellig: ' + adresse.adgangsadresse.stormodtagerpostnummer);
      assert(adresse.adgangsadresse.kommune.kode==="0101", 'adresse.kommune.nr forskellig: ' + adresse.adgangsadresse.kommune.kode);
      assert(adresse.adgangsadresse.kommune.navn==="København", 'adresse.kommune.navn forskellig: ' + adresse.adgangsadresse.kommune.navn);
      assert(adresse.adgangsadresse.ejerlav.kode==2000175, 'adresse.ejerlav.nr forskellig: ' + adresse.adgangsadresse.ejerlav.kode);
      assert(adresse.adgangsadresse.ejerlav.navn==="Utterslev, København", 'adresse.ejerlav.navn forskellig: ' + adresse.adgangsadresse.ejerlav.navn);
      assert(adresse.adgangsadresse.sogn.kode==="7060", 'adresse.sogn.nr forskellig: ' + adresse.adgangsadresse.sogn.kode);
      assert(adresse.adgangsadresse.sogn.navn==="Grøndal", 'adresse.sogn.navn i json og csv format forskellig. json: ' + adresse.adgangsadresse.sogn.navn);
      assert(adresse.adgangsadresse.region.kode==="1084", 'adresse.region.n forskellig: ' + adresse.adgangsadresse.region.kode);
      assert(adresse.adgangsadresse.region.navn==="Region Hovedstaden", 'adresse.region.navn forskellig: ' + adresse.adgangsadresse.region.navn);
      assert(adresse.adgangsadresse.retskreds.kode==="1102", 'adresse.retskreds.nr forskellig: ' + adresse.adgangsadresse.retskreds.kode);
      assert(adresse.adgangsadresse.retskreds.navn==="Retten på Frederiksberg", 'adresse.retskreds.navn forskellig: ' + adresse.adgangsadresse.retskreds.navn);
      assert(adresse.adgangsadresse.politikreds.kode==="1470", 'adresse.politikreds.nr forskellig: ' + adresse.adgangsadresse.politikreds.kode);
      assert(adresse.adgangsadresse.politikreds.navn==="Københavns Politi", 'adresse.politikreds.navn forskellig: ' + adresse.adgangsadresse.politikreds.navn);
      assert(adresse.adgangsadresse.opstillingskreds.kode==="0007", 'adresse.opstillingskreds.nr forskellig: ' + adresse.adgangsadresse.opstillingskreds.kode);
      assert(adresse.adgangsadresse.opstillingskreds.navn==="Brønshøj", 'adresse.opstillingskreds.navn forskellig: ' + adresse.adgangsadresse.opstillingskreds.navn);
      assert(adresse.adgangsadresse.esrejendomsnr==="242358", 'adresse.esrejendomsnr forskellig: ' + adresse.adgangsadresse.esrejendomsnr);
      assert(adresse.adgangsadresse.matrikelnr==="663", 'adresse.matrikelnr forskellig: ' + adresse.adgangsadresse.matrikelnr);
      
      assert(adresse.adgangsadresse.adgangspunkt.koordinater[0]==12.5108572474172, 'punkt.koordinater[0] forskellig: ' + adresse.adgangsadresse.adgangspunkt.koordinater[0]);
      assert(adresse.adgangsadresse.adgangspunkt.koordinater[1]==55.6983973831476, 'punkt.koordinater[1] forskellig: ' + adresse.adgangsadresse.adgangspunkt.koordinater[1]);
      assert(adresse.adgangsadresse.adgangspunkt.nøjagtighed==="A", 'punkt.nøjagtighed forskellig: ' + adresse.adgangsadresse.adgangspunkt.nøjagtighed);
      assert(adresse.adgangsadresse.adgangspunkt.kilde==5, 'punkt.kilde forskellig: ' + adresse.adgangsadresse.adgangspunkt.kilde);
      assert(adresse.adgangsadresse.adgangspunkt.tekniskstandard==="TD", 'punkt.tekniskstandard forskellig: ' + adresse.adgangsadresse.adgangspunkt.tekniskstandard);
      assert(adresse.adgangsadresse.adgangspunkt.tekstretning==200, 'punkt.tekstretning forskellig: ' + adresse.adgangsadresse.adgangspunkt.tekstretning);
      assert(adresse.adgangsadresse.adgangspunkt.ændret==="2002-04-05T00:00:00.000", 'punkt.adressepunktændringsdato forskellig: ' + adresse.adgangsadresse.adgangspunkt.ændret);
      assert(adresse.adgangsadresse.jordstykke.ejerlav.kode==2000175, 'jordstykke.ejerlav.kode forskellig: ' + adresse.adgangsadresse.jordstykke.ejerlav.kode);
      assert(adresse.adgangsadresse.jordstykke.matrikelnr==="663", 'jordstykke.matrikelnr forskellig: ' + adresse.adgangsadresse.jordstykke.matrikelnr);
      assert(adresse.adgangsadresse.jordstykke.esrejendomsnr==="242358", 'jordstykke.esrejendomsnr forskellig: ' + adresse.adgangsadresse.jordstykke.esrejendomsnr);
      assert(adresse.adgangsadresse.zone==="Byzone", 'Zone forskellig: ' + adresse.adgangsadresse.zone);
      assert(adresse.adgangsadresse.adgangspunkt.højde==24.1, 'Højde forskellig: ' + adresse.adgangsadresse.adgangspunkt.højde);
      
      var vejopt= {};
      vejopt.url=adresse.adgangsadresse.vejstykke.href;
      vejopt.qs= {};
      vejopt.qs.cache= 'no-cache';
      vejopt.resolveWithFullResponse= true;
      var vejrequest= rp(vejopt);

      var postopt= {};
      postopt.url=adresse.adgangsadresse.postnummer.href;
      postopt.qs= {};
      postopt.qs.cache= 'no-cache';
      postopt.resolveWithFullResponse= true;
      var postrequest= rp(postopt);

      var komopt= {};
      komopt.url=adresse.adgangsadresse.kommune.href;
      komopt.qs= {};
      komopt.qs.cache= 'no-cache';
      komopt.resolveWithFullResponse= true;
      var komrequest= rp(komopt);

      var sognopt= {};
      sognopt.url=adresse.adgangsadresse.sogn.href;
      sognopt.qs= {};
      sognopt.qs.cache= 'no-cache';
      sognopt.resolveWithFullResponse= true;
      var sognrequest= rp(sognopt);

      var regionopt= {};
      regionopt.url=adresse.adgangsadresse.region.href;
      regionopt.qs= {};
      regionopt.qs.cache= 'no-cache';
      regionopt.resolveWithFullResponse= true;
      var regionrequest= rp(regionopt);

      var retsopt= {};
      retsopt.url=adresse.adgangsadresse.retskreds.href;
      retsopt.qs= {};
      retsopt.qs.cache= 'no-cache';
      retsopt.resolveWithFullResponse= true;
      var retsrequest= rp(retsopt);

      var polopt= {};
      polopt.url=adresse.adgangsadresse.politikreds.href;
      polopt.qs= {};
      polopt.qs.cache= 'no-cache';
      polopt.resolveWithFullResponse= true;
      var polrequest= rp(polopt);

      var opsopt= {};
      opsopt.url=adresse.adgangsadresse.opstillingskreds.href;
      opsopt.qs= {};
      opsopt.qs.cache= 'no-cache';
      opsopt.resolveWithFullResponse= true;
      var opsrequest= rp(opsopt);

      var jordopt= {};
      jordopt.url=adresse.adgangsadresse.jordstykke.href;
      jordopt.qs= {};
      jordopt.qs.cache= 'no-cache';
      jordopt.resolveWithFullResponse= true;
      var jordrequest= rp(jordopt);

      Promise.all([vejrequest, postrequest, komrequest, sognrequest, regionrequest, retsrequest, polrequest, opsrequest, jordrequest]).then((responses) => {
        for (let i= 0; i<responses.length; i++) {
          assert(response.statusCode===200, "Http status code != 200 (" + response.statusCode + ")");
          //console.log(responses[i].body);
          let obj= JSON.parse(responses[i].body); 
          switch (i) {
          case 0:
            assert(adresse.adgangsadresse.vejstykke.kode===obj.kode,"Uoverenstemmelse i vejstykke")
            break;
          case 1:
            assert(adresse.adgangsadresse.postnummer.nr===obj.nr,"Uoverenstemmelse i postnummer")
            break;
          case 2:
            assert(adresse.adgangsadresse.kommune.kode===obj.kode,"Uoverenstemmelse i kommune")
            break;
          case 3:
            assert(adresse.adgangsadresse.sogn.kode===obj.kode,"Uoverenstemmelse i sogn")
            break;
          case 4:
            assert(adresse.adgangsadresse.region.kode===obj.kode,"Uoverenstemmelse i region")
            break;
          case 5:
            assert(adresse.adgangsadresse.retskreds.kode===obj.kode,"Uoverenstemmelse i retskreds")
            break;
          case 6:
            assert(adresse.adgangsadresse.politikreds.kode===obj.kode,"Uoverenstemmelse i politikreds")
            break;
          case 7:
            assert(adresse.adgangsadresse.opstillingskreds.kode===obj.kode,"Uoverenstemmelse i opstillingskreds")
            break;
          case 8:
            assert(adresse.adgangsadresse.jordstykke.matrikelnr===obj.matrikelnr,"Uoverenstemmelse i jordstykke (" + adresse.adgangsadresse.jordstykke.matrikelnr + ", " + obj.matrikelnr + ")");
            break;
          }
        }
      })
      .then(() => {

        function findBebyggelse(navn,type) {
          return function findBebyggelse(bebyggelse) { 
            return bebyggelse.navn === navn && bebyggelse.type === type;
          }
        }

        let bydel= adresse.adgangsadresse.bebyggelser.find(findBebyggelse('Grøndal','bydel'));
        let by= adresse.adgangsadresse.bebyggelser.find(findBebyggelse('København', 'by'));
        let storby= adresse.adgangsadresse.bebyggelser.find(findBebyggelse('Storkøbenhavn', 'storby'));

        assert(adresse.adgangsadresse.bebyggelser.length === 3, "Antal bebyggelsestyper != 3");
        assert(bydel, 'Mangler bydel Grøndal');
        assert(by, 'Mangler by København');
        assert(storby, 'Mangler storby Storkøbenhavn');

        var bydelopt= {};
        bydelopt.url= bydel.href;
        bydelopt.qs= {};
        bydelopt.qs.cache= 'no-cache';
        bydelopt.resolveWithFullResponse= true;
        var bydelrequest= rp(bydelopt);

        var byopt= {};
        byopt.url= by.href;
        byopt.qs= {};
        byopt.qs.cache= 'no-cache';
        byopt.resolveWithFullResponse= true;
        var byrequest= rp(byopt);

        var storbyopt= {};
        storbyopt.url= storby.href;
        storbyopt.qs= {};
        storbyopt.qs.cache= 'no-cache';
        storbyopt.resolveWithFullResponse= true;
        var storbyrequest= rp(storbyopt);

        Promise.all([bydelrequest, byrequest, storbyrequest]).then((responses) => {
          for (let i= 0; i<responses.length; i++) {
            assert(response.statusCode===200, "Http status code != 200 (" + response.statusCode + ")");
            //console.log(responses[i].body);
            let obj= JSON.parse(responses[i].body); 
            switch (i) {
            case 0:
              assert(bydel.navn===obj.navn,"Uoverenstemmelse i bydel")
              break;
            case 1:
              assert(by.navn===obj.navn,"Uoverenstemmelse i by")
              break;
            case 2:
              assert(storby.navn===obj.navn,"Uoverenstemmelse i storby")
              break;
            }
          }
          done();
        })        
        .catch((err) => {
          done(err);
        });
      })
    })
    .catch((err) => {
      done(err);
    });

  });

   it("Samme indhold json og csv format", function(done){

    var optjson= {};
    optjson.baseUrl= host;
    optjson.url='adresser';
    optjson.qs= {};
    optjson.qs.cache= 'no-cache';
    optjson.qs.vejnavn= 'Rådhuspladsen';
    optjson.qs.husnr= '1';
    optjson.qs.postnr= '1550';
    var jsonrequest= rp(optjson);

    var optcsv= {};
    optcsv.baseUrl= host;
    optcsv.url=optjson.url;
    optcsv.qs= {};
    optcsv.qs.cache= optjson.qs.cache;
    optcsv.qs.vejnavn= optjson.qs.vejnavn;
    optcsv.qs.husnr= optjson.qs.husnr;
    optcsv.qs.postnr= optjson.qs.postnr;
    optcsv.qs.format= 'csv';
    var csvrequest= rp(optcsv);

    Promise.all([jsonrequest, csvrequest]).then(function (bodies) {
      var adresserjson= JSON.parse(bodies[0]);
      var adressejson= adresserjson[0];
      //console.log(adressejson);      
      csv.parse(bodies[1], {columns: true}, function (err, adressercsv) {
        var adressecsv= adressercsv[0];
        //console.log(adgangsadressecsv);
        assert(adressejson.id===adressecsv.id, 'Id i json og csv format forskellig. json: ' + adressejson.id + ', csv: ' + adressecsv.id);
        assert(adressejson.status==adressecsv.status, 'Status i json og csv format forskellig. json: |' + adressejson.status + '|, csv: |' + adressecsv.status + '|');
        assert(adressejson.kvhx===adressecsv.kvhx, 'kvh i json og csv format forskellig. json: ' + adressejson.kvhx + ', csv: ' + adressecsv.kvhx);
        assert(adressejson.historik.oprettet===adressecsv.oprettet, 'oprettet i json og csv format forskellig. json: |' + adressejson.historik.oprettet + '|, csv: |' + adressecsv.oprettet + '|');
        assert(adressejson.historik.ændret===adressecsv.ændret, 'ændret i json og csv format forskellig. json: ' + adressejson.historik.ændret + ', csv: ' + adressecsv.ændret);
        assert(adressejson.etage?adressejson.etage===adressecsv.etage:adressecsv.etage.length===0, 'etage i json og csv format forskellig. json: ' + adressejson.etage + ', csv: ' + adressecsv.etage);
        assert(adressejson.dør?adressejson.dør===adressecsv.dør:adressecsv.dør.length===0, 'dør i json og csv format forskellig. json: ' + adressejson.dør + ', csv: ' + adressecsv.dør);
        assert(adressejson.adgangsadresse.vejstykke.navn===adressecsv.vejnavn, 'adresse.vejstykke.navn i json og csv format forskellig. json: ' + adressejson.adgangsadresse.vejstykke.navn + ', csv: ' + adressecsv.vejnavn);
        assert(adressejson.adgangsadresse.vejstykke.navn===optjson.qs.vejnavn, 'adresse.vejstykke.navn i json og søgekriterie forskellig. json: ' + adressejson.adgangsadresse.vejstykke.navn + ', søgekriterie: ' + optjson.qs.vejnavn);
        assert(adressejson.adgangsadresse.vejstykke.kode===adressecsv.vejkode, 'adresse.vejstykke.kode i json og csv format forskellig. json: ' + adressejson.adgangsadresse.vejstykke.kode + ', csv: ' + adressecsv.vejkode);
        assert(adressejson.adgangsadresse.vejstykke.adresseringsnavn===adressecsv.adresseringsvejnavn, 'adresse.vejstykke.adresseringsnavn i json og csv format forskellig. json: ' + adressejson.adgangsadresse.vejstykke.adresseringsnavn + ', csv: ' + adressecsv.adresseringsvejnavn);
        assert(adressejson.adgangsadresse.husnr===adressecsv.husnr, 'adresse.husnr i json og csv format forskellig. json: ' + adressejson.adgangsadresse.husnr + ', csv: ' + adressecsv.husnr);
        assert(adressejson.adgangsadresse.husnr===optjson.qs.husnr, 'adresse.husnr i json og søgekriterie forskellig. json: ' + adressejson.adgangsadresse.husnr + ', søgekriterie: ' + optjson.qs.husnr);
        assert(adressejson.adgangsadresse.supplerendebynavn==adressecsv.supplerendebynavn||adressejson.adgangsadresse.supplerendebynavn===null&&adressecsv.supplerendebynavn=="", 'adresse.supplerendebynavn i json og csv format forskellig. json: ' + adressejson.adgangsadresse.supplerendebynavn + ', csv: ' + adressecsv.supplerendebynavn);
        assert(adressejson.adgangsadresse.postnummer.nr===adressecsv.postnr, 'adresse.postnummer.nr i json og csv format forskellig. json: ' + adressejson.adgangsadresse.postnummer.nr + ', csv: ' + adressecsv.postnr);
        assert(adressejson.adgangsadresse.postnummer.nr===optjson.qs.postnr, 'adresse.postnummer.nr i json og søgekriterie er forskellig. json: ' + adressejson.adgangsadresse.postnummer.nr + ', søgekriterie: ' + optjson.qs.postnr);
        assert(adressejson.adgangsadresse.postnummer.navn===adressecsv.postnrnavn, 'adresse.postnummer.navn i json og csv format forskellig. json: ' + adressejson.adgangsadresse.postnummer.navn + ', csv: ' + adressecsv.postnrnavn);
        if (adressejson.adgangsadresse.stormodtagerpostnr) {
          assert(adressejson.adgangsadresse.stormodtagerpostnummer.nr===adressecsv.stormodtagerpostnr, 'adresse.stormodtagerpostnummer.nr i json og csv format forskellig. json: ' + adressejson.adgangsadresse.stormodtagerpostnummer.nr + ', csv: ' + adressecsv.stormodtagerpostnr);
          assert(adressejson.adgangsadresse.stormodtagerpostnummer.navn===adressecsv.stormodtagerpostnrnavn, 'adresse.stormodtagerpostnummer.navn i json og csv format forskellig. json: ' + adressejson.adgangsadresse.stormodtagerpostnummer.navn + ', csv: ' + adressecsv.stormodtagerpostnrnavn);
        }
        assert(adressejson.adgangsadresse.kommune.kode===adressecsv.kommunekode, 'adresse.kommune.nr i json og csv format forskellig. json: ' + adressejson.adgangsadresse.kommune.kode + ', csv: ' + adressecsv.kommunekode);
        assert(adressejson.adgangsadresse.kommune.navn===adressecsv.kommunenavn, 'adresse.kommune.navn i json og csv format forskellig. json: ' + adressejson.adgangsadresse.kommune.navn + ', csv: ' + adressecsv.kommunenavn);
        assert(adressejson.adgangsadresse.ejerlav.kode==adressecsv.ejerlavkode, 'adresse.ejerlav.nr i json og csv format forskellig. json: ' + adressejson.adgangsadresse.ejerlav.kode + ', csv: ' + adressecsv.ejerlavkode);
        assert(adressejson.adgangsadresse.ejerlav.navn===adressecsv.ejerlavnavn, 'adresse.ejerlav.navn i json og csv format forskellig. json: ' + adressejson.adgangsadresse.ejerlav.navn + ', csv: ' + adressecsv.ejerlavnavn);
        assert(adressejson.adgangsadresse.sogn.kode===adressecsv.sognekode, 'adresse.sogn.nr i json og csv format forskellig. json: ' + adressejson.adgangsadresse.sogn.kode + ', csv: ' + adressecsv.sognekode);
        assert(adressejson.adgangsadresse.sogn.navn===adressecsv.sognenavn, 'adresse.sogn.navn i json og csv format forskellig. json: ' + adressejson.adgangsadresse.sogn.navn + ', csv: ' + adressecsv.sognenavn);
        assert(adressejson.adgangsadresse.region.kode===adressecsv.regionskode, 'adresse.region.nr i json og csv format forskellig. json: ' + adressejson.adgangsadresse.region.kode + ', csv: ' + adressecsv.regionskode);
        assert(adressejson.adgangsadresse.region.navn===adressecsv.regionsnavn, 'adresse.region.navn i json og csv format forskellig. json: ' + adressejson.adgangsadresse.region.navn + ', csv: ' + adressecsv.regionsnavn);
        assert(adressejson.adgangsadresse.retskreds.kode===adressecsv.retskredskode, 'adresse.retskreds.nr i json og csv format forskellig. json: ' + adressejson.adgangsadresse.retskreds.kode + ', csv: ' + adressecsv.retskredskode);
        assert(adressejson.adgangsadresse.retskreds.navn===adressecsv.retskredsnavn, 'adresse.retskreds.navn i json og csv format forskellig. json: ' + adressejson.adgangsadresse.retskreds.navn + ', csv: ' + adressecsv.retskredsnavn);
        assert(adressejson.adgangsadresse.politikreds.kode===adressecsv.politikredskode, 'adresse.politikreds.nr i json og csv format forskellig. json: ' + adressejson.adgangsadresse.politikreds.kode + ', csv: ' + adressecsv.politikredskode);
        assert(adressejson.adgangsadresse.politikreds.navn===adressecsv.politikredsnavn, 'adresse.politikreds.navn i json og csv format forskellig. json: ' + adressejson.adgangsadresse.politikreds.navn + ', csv: ' + adressecsv.politikredsnavn);
        assert(adressejson.adgangsadresse.opstillingskreds.kode===adressecsv.opstillingskredskode, 'adresse.opstillingskreds.nr i json og csv format forskellig. json: ' + adressejson.adgangsadresse.opstillingskreds.kode + ', csv: ' + adressecsv.opstillingskredskode);
        assert(adressejson.adgangsadresse.opstillingskreds.navn===adressecsv.opstillingskredsnavn, 'adresse.opstillingskreds.navn i json og csv format forskellig. json: ' + adressejson.adgangsadresse.opstillingskreds.navn + ', csv: ' + adressecsv.retskredsnavn);
        assert(adressejson.adgangsadresse.opstillingskreds.kode===adressecsv.opstillingskredskode, 'adresse.opstillingskreds.nr i json og csv format forskellig. json: ' + adressejson.adgangsadresse.opstillingskreds.kode + ', csv: ' + adressecsv.opstillingskredskode);
        assert(adressejson.adgangsadresse.opstillingskreds.navn===adressecsv.opstillingskredsnavn, 'adresse.opstillingskreds.navn i json og csv format forskellig. json: ' + adressejson.adgangsadresse.opstillingskreds.navn + ', csv: ' + adressecsv.retskredsnavn);
        assert(adressejson.adgangsadresse.esrejendomsnr===adressecsv.esrejendomsnr, 'adresse.esrejendomsnr i json og csv format forskellig. json: ' + adressejson.adgangsadresse.esrejendomsnr + ', csv: ' + adressecsv.esrejendomsnr);
        assert(adressejson.adgangsadresse.matrikelnr===adressecsv.matrikelnr, 'adresse.matrikelnr i json og csv format forskellig. json: ' + adressejson.adgangsadresse.matrikelnr + ', csv: ' + adressecsv.matrikelnr);
        
        assert(adressejson.adgangsadresse.adgangspunkt.koordinater[0]==adressecsv.wgs84koordinat_længde, 'punkt.koordinater[0] i json og csv format forskellig. json: ' + adressejson.adgangsadresse.adgangspunkt.koordinater[0] + ', csv: ' + adressecsv.wgs84koordinat_længde);
        assert(adressejson.adgangsadresse.adgangspunkt.koordinater[1]==adressecsv.wgs84koordinat_bredde, 'punkt.koordinater[1] i json og csv format forskellig. json: ' + adressejson.adgangsadresse.adgangspunkt.koordinater[1] + ', csv: ' + adressecsv.wgs84koordinat_bredde);
        assert(adressejson.adgangsadresse.adgangspunkt.nøjagtighed===adressecsv.nøjagtighed, 'punkt.nøjagtighed i json og csv format forskellig. json: ' + adressejson.adgangsadresse.adgangspunkt.nøjagtighed + ', csv: ' + adressecsv.nøjagtighed);
        assert(adressejson.adgangsadresse.adgangspunkt.kilde==adressecsv.kilde, 'punkt.kilde i json og csv format forskellig. json: ' + adressejson.adgangsadresse.adgangspunkt.kilde + ', csv: ' + adressecsv.kilde);
        assert(adressejson.adgangsadresse.adgangspunkt.tekniskstandard===adressecsv.tekniskstandard, 'punkt.tekniskstandard i json og csv format forskellig. json: ' + adressejson.adgangsadresse.adgangspunkt.tekniskstandard + ', csv: ' + adressecsv.tekniskstandard);
        assert(adressejson.adgangsadresse.adgangspunkt.tekstretning==adressecsv.tekstretning, 'punkt.tekstretning i json og csv format forskellig. json: ' + adressejson.adgangsadresse.adgangspunkt.tekstretning + ', csv: ' + adressecsv.tekstretning);
        assert(adressejson.adgangsadresse.adgangspunkt.ændret===adressecsv.adressepunktændringsdato, 'punkt.adressepunktændringsdato i json og csv format forskellig. json: ' + adressejson.adgangsadresse.adgangspunkt.ændret + ', csv: ' + adressecsv.adressepunktændringsdato);
        assert(adressejson.adgangsadresse.jordstykke.ejerlav.kode==adressecsv.jordstykke_ejerlavkode, 'jordstykke.ejerlav.kode i json og csv format forskellig. json: ' + adressejson.adgangsadresse.jordstykke.ejerlav.kode + ', csv: ' + adressecsv.jordstykke_ejerlavkode);
        assert(adressejson.adgangsadresse.jordstykke.matrikelnr===adressecsv.jordstykke_matrikelnr, 'jordstykke.matrikelnr i json og csv format forskellig. json: ' + adressejson.adgangsadresse.jordstykke.matrikelnr + ', csv: ' + adressecsv.jordstykke_matrikelnr);
        assert(adressejson.adgangsadresse.jordstykke.esrejendomsnr===adressecsv.jordstykke_esrejendomsnr, 'jordstykke.esrejendomsnr i json og csv format forskellig. json: ' + adressejson.adgangsadresse.jordstykke.esrejendomsnr + ', csv: ' + adressecsv.jordstykke_esrejendomsnr);
        assert(adressejson.adgangsadresse.zone===adressecsv.zone, 'Zone i json og csv format forskellig. json: ' + adressejson.adgangsadresse.zone + ', csv: ' + adressecsv.zone);
        assert(adressejson.adgangsadresse.adgangspunkt.højde==adressecsv.højde, 'Højde i json og csv format forskellig. json: ' + adressejson.adgangsadresse.adgangspunkt.højde + ', csv: ' + adressecsv.højde);
        done();
      });
    });

  })

});

describe('Vejnavnesøgning', function(){

  it('q=a.*', function(done){
    request(encodeURI(host+'/vejnavne?q=a.*&cache=no-cache'), function (error, response, body) {
    	assert.equal(error,null);
    	assert.equal(response.statusCode,200);
      var vejnavne= JSON.parse(body);
      var vejnavn= vejnavne[0];
      let line= util.format("Vejnavn: %s", vejnavn);
      //console.log(line);
	    done();
	  })
	})


  it("Kan håndtere ë", function(done){
    request(encodeURI(host+"/vejnavne?navn=Tove Maës Vej&cache=no-cache"), function (error, response, body) {
      assert.equal(error,null);
      assert.equal(response.statusCode,200);
      console.log(body);
      var vejnavne= JSON.parse(body);
      assert.equal(vejnavne.length,1);   
      done();
    })
  })

});

describe('Vejstykkesøgning', function(){

  it("q=ro'*", function(done){
    request(encodeURI(host+"/vejstykker?q=ro'*&cache=no-cache"), function (error, response, body) {
    	assert.equal(error,null);
    	assert.equal(response.statusCode,200);
      var vejnavne= JSON.parse(body);
      var vejnavn= vejnavne[0];
      let line= util.format("Vejnavn: %s", vejnavn);
      //console.log(line);
	    done();
	  })
	})

  it("Fuzzy søgning", function(done){
    var options= {};
    options.baseUrl= host;
    options.url='/vejstykker';
    options.qs= {};
    options.qs.cache= 'no-cache';
    options.qs.q= 'rante mester vaj';
    options.qs.fuzzy= 'true';
    options.resolveWithFullResponse= true;
    var jsonrequest= rp(options).then((response) => {
      assert(response.statusCode===200, "Http status code != 200");
      var vejstykker= JSON.parse(response.body);
      assert(vejstykker.length > 0, "Antal vejstykker = 0 (" + vejstykker.length + ")");
      assert(vejstykker[0].navn === 'Rentemestervej', 'Finder ikke Rentemestervej');
      done();
    })
    .catch((err) => {
      done(err);
    });
  });


  it("Naboer", function(done){
    var options= {};
    options.baseUrl= host;
    options.url='/vejstykker/101/6100/naboer';
    options.qs= {};
    options.qs.cache= 'no-cache';
    options.qs.format= 'geojson';
    options.resolveWithFullResponse= true;
    var jsonrequest= rp(options).then((response) => {
      assert(response.statusCode===200, "Http status code != 200");
      var vejstykker= JSON.parse(response.body);
      done();
    })
    .catch((err) => {
      done(err);
    });
  });

});

describe('Unik vejstykke', function(){

  it("Finsensvej, Frederiksberg", function(done){
    request(encodeURI(host+"/vejstykker?kommunekode=0147&kode=0238&cache=no-cache"), function (error, response, body) {
      assert.equal(error,null);
      assert.equal(response.statusCode,200);
      var vejnavne= JSON.parse(body);
      assert.equal(vejnavne.length,1); 
      done();
    })
  })

});


describe('Supplerendebynavnsøgning', function(){

  it("q=lille*", function(done){
    request(encodeURI(host+"/supplerendebynavne?q=lille*&cache=no-cache"), function (error, response, body) {
      assert.equal(error,null);
      assert.equal(response.statusCode,200);
      var bynavne= JSON.parse(body);
      //console.log(util.inspect(bynavne));
      var bynavn= bynavne[0].navn;

      //console.log(bynavn);
      assert(bynavn.search('Lille')!=-1||bynavn.search('Ll')!=-1,"Navn indeholder ikke lille")
      done();
    })
  })

});

describe('Postnummersøgning', function(){

  it("q=Eske*", function(done){
    request(encodeURI(host+"/postnumre?q=eske*&cache=no-cache"), function (error, response, body) {
      assert.equal(error,null);
      assert.equal(response.statusCode,200);
      var bynavne= JSON.parse(body);
      var bynavn= bynavne[0].navn;

      //console.log(util.inspect(bynavne[0]));
      //console.log(bynavn);
      assert(bynavn.search('Eske')!=-1,"Navn indeholder ikke ekse")
      done();
    })
  })

  it("cirkel=12.5816211914473,55.6812196135705,10", function(done){
    request(encodeURI(host+"/postnumre?cirkel=12.5816211914473,55.6812196135705,10&cache=no-cache"), function (error, response, body) {
      assert.equal(error,null);
      assert.equal(response.statusCode,200);
      var postnumre= JSON.parse(body);
      assert(postnumre.length==2,"Skulle rumme 2 postnumre")
      done();
    })
  })

  it("autocomplete nr", function(done){
    var options= {};
    options.baseUrl= host;
    options.url= 'postnumre/autocomplete';
    options.qs= {cache: 'no-cache'};
    options.qs.q= '34';
    request(options, function (error, response, body) {
      assert.equal(error,null);
      assert.equal(response.statusCode,200);
      var postnumre= JSON.parse(body);
      assert(postnumre.length > 0, 'Der burde være postnumre, som starter med 34')
      // postnumre.forEach(function (adgangsadresse, index) {
      //   assert(husnrstørreogligmed(adgangsadresse.husnr,'14C'));
      // });
      //assert(adgangsadresse.zone==='Landzone', 'Zone er ikke Landzone, men ' + adgangsadresse.zone);
      done();
    })
  })

  it("autocomplete navn", function(done){
    var options= {};
    options.baseUrl= host;
    options.url= 'postnumre/autocomplete';
    options.qs= {cache: 'no-cache'};
    options.qs.q= 'all';
    request(options, function (error, response, body) {
      assert.equal(error,null);
      assert.equal(response.statusCode,200);
      var postnumre= JSON.parse(body);
      assert(postnumre.length > 0, 'Der burde være postnumre, som starter med all')
      // postnumre.forEach(function (adgangsadresse, index) {
      //   assert(husnrstørreogligmed(adgangsadresse.husnr,'14C'));
      // });
      //assert(adgangsadresse.zone==='Landzone', 'Zone er ikke Landzone, men ' + adgangsadresse.zone);
      done();
    })
  })
});

describe('Kommunesøgning', function(){

  it("q=alle*", function(done){
    request(encodeURI(host+"/kommuner?q=alle*&cache=no-cache"), function (error, response, body) {
      assert.equal(error,null);
      assert.equal(response.statusCode,200);
      var bynavne= JSON.parse(body);
      var bynavn= bynavne[0].navn;

      //console.log(util.inspect(bynavne[0]));
      //console.log(bynavn);
      assert(bynavn.search('Alle')!=-1,"Navn indeholder ikke Alle")
      done();
    })
  })

  it("autocomplete nr", function(done){
    var options= {};
    options.baseUrl= host;
    options.url= 'kommuner/autocomplete';
    options.qs= {cache: 'no-cache'};
    options.qs.q= '1';
    request(options, function (error, response, body) {
      assert.equal(error,null);
      assert.equal(response.statusCode,200);
      var kommuner= JSON.parse(body);
      assert(kommuner.length > 0, 'Der burde være kommuner, som starter med 1')
      // kommuner.forEach(function (adgangsadresse, index) {
      //   assert(husnrstørreogligmed(adgangsadresse.husnr,'14C'));
      // });
      //assert(adgangsadresse.zone==='Landzone', 'Zone er ikke Landzone, men ' + adgangsadresse.zone);
      done();
    })
  })

  it("autocomplete navn", function(done){
    var options= {};
    options.baseUrl= host;
    options.url= 'kommuner/autocomplete';
    options.qs= {cache: 'no-cache'};
    options.qs.q= 'kø';
    request(options, function (error, response, body) {
      assert.equal(error,null);
      assert.equal(response.statusCode,200);
      var kommuner= JSON.parse(body);
      assert(kommuner.length > 0, 'Der burde være kommuner, som starter med kø')
      // postnumre.forEach(function (adgangsadresse, index) {
      //   assert(husnrstørreogligmed(adgangsadresse.husnr,'14C'));
      // });
      //assert(adgangsadresse.zone==='Landzone', 'Zone er ikke Landzone, men ' + adgangsadresse.zone);
      done();
    })
  })

});

describe('Regionssøgning', function(){

  it("q=syd*", function(done){
    request(encodeURI(host+"/regioner?q=syd*&cache=no-cache"), function (error, response, body) {
      assert.equal(error,null);
      assert.equal(response.statusCode,200);
      var bynavne= JSON.parse(body);
      var bynavn= bynavne[0].navn;

      //console.log(util.inspect(bynavne[0]));
      //console.log(bynavn);
      assert(bynavn.search('Syd')!=-1,"Navn indeholder ikke Syd")
      done();
    })
  })


it("autocomplete nr", function(done){
    var options= {};
    options.baseUrl= host;
    options.url= 'regioner/autocomplete';
    options.qs= {cache: 'no-cache'};
    options.qs.q= '10';
    request(options, function (error, response, body) {
      assert.equal(error,null);
      assert.equal(response.statusCode,200);
      var regioner= JSON.parse(body);
      assert(regioner.length > 0, 'Der burde være regioner, som starter med 10')
      // regioner.forEach(function (adgangsadresse, index) {
      //   assert(husnrstørreogligmed(adgangsadresse.husnr,'14C'));
      // });
      //assert(adgangsadresse.zone==='Landzone', 'Zone er ikke Landzone, men ' + adgangsadresse.zone);
      done();
    })
  })

  it("autocomplete navn", function(done){
    var options= {};
    options.baseUrl= host;
    options.url= 'regioner/autocomplete';
    options.qs= {cache: 'no-cache'};
    options.qs.q= 'ho';
    request(options, function (error, response, body) {
      assert.equal(error,null);
      assert.equal(response.statusCode,200);
      var regioner= JSON.parse(body);
      assert(regioner.length > 0, 'Der burde være regioner, som starter med ho')
      // postnumre.forEach(function (adgangsadresse, index) {
      //   assert(husnrstørreogligmed(adgangsadresse.husnr,'14C'));
      // });
      //assert(adgangsadresse.zone==='Landzone', 'Zone er ikke Landzone, men ' + adgangsadresse.zone);
      done();
    })
  })

});

describe('Sognesøgning', function(){

  it("q=grøn*", function(done){
    request(encodeURI(host+"/sogne?q=grøn*&cache=no-cache"), function (error, response, body) {
      assert.equal(error,null);
      assert.equal(response.statusCode,200);
      var bynavne= JSON.parse(body);
      var bynavn= bynavne[0].navn;

      //console.log(util.inspect(bynavne[0]));
      //console.log(bynavn);
      assert(bynavn.search('Grøn')!=-1,"Navn indeholder ikke Grøn")
      done();
    })
  })


it("autocomplete nr", function(done){
    var options= {};
    options.baseUrl= host;
    options.url= 'sogne/autocomplete';
    options.qs= {cache: 'no-cache'};
    options.qs.q= '70';
    request(options, function (error, response, body) {
      assert.equal(error,null);
      assert.equal(response.statusCode,200);
      var sogne= JSON.parse(body);
      assert(sogne.length > 0, 'Der burde være sogne, som starter med 70')
      // sogne.forEach(function (adgangsadresse, index) {
      //   assert(husnrstørreogligmed(adgangsadresse.husnr,'14C'));
      // });
      //assert(adgangsadresse.zone==='Landzone', 'Zone er ikke Landzone, men ' + adgangsadresse.zone);
      done();
    })
  })

  it("autocomplete navn", function(done){
    var options= {};
    options.baseUrl= host;
    options.url= 'sogne/autocomplete';
    options.qs= {cache: 'no-cache'};
    options.qs.q= 'gr';
    request(options, function (error, response, body) {
      assert.equal(error,null);
      assert.equal(response.statusCode,200);
      var sogne= JSON.parse(body);
      assert(sogne.length > 0, 'Der burde være sogne, som starter med gr')
      // postnumre.forEach(function (adgangsadresse, index) {
      //   assert(husnrstørreogligmed(adgangsadresse.husnr,'14C'));
      // });
      //assert(adgangsadresse.zone==='Landzone', 'Zone er ikke Landzone, men ' + adgangsadresse.zone);
      done();
    })
  })

});

describe('Retskredssøgning', function(){

  it("q=hil*", function(done){
    request(encodeURI(host+"/retskredse?q=hil*&cache=no-cache"), function (error, response, body) {
      assert.equal(error,null);
      assert.equal(response.statusCode,200);
      var bynavne= JSON.parse(body);
      var bynavn= bynavne[0].navn;

      //console.log(util.inspect(bynavne[0]));
      //console.log(bynavn);
      assert(bynavn.search('Hil')!=-1,"Navn indeholder ikke Hil")
      done();
    })
  })

  it("autocomplete nr", function(done){
      var options= {};
      options.baseUrl= host;
      options.url= 'retskredse/autocomplete';
      options.qs= {cache: 'no-cache'};
      options.qs.q= '1';
      request(options, function (error, response, body) {
        assert.equal(error,null);
        assert.equal(response.statusCode,200);
        var retskredse= JSON.parse(body);
        assert(retskredse.length > 0, 'Der burde være retskredse, som starter med 1')
        // retskredse.forEach(function (adgangsadresse, index) {
        //   assert(husnrstørreogligmed(adgangsadresse.husnr,'14C'));
        // });
        //assert(adgangsadresse.zone==='Landzone', 'Zone er ikke Landzone, men ' + adgangsadresse.zone);
        done();
      })
    })

    it("autocomplete navn", function(done){
      var options= {};
      options.baseUrl= host;
      options.url= 'retskredse/autocomplete';
      options.qs= {cache: 'no-cache'};
      options.qs.q= 'ho';
      request(options, function (error, response, body) {
        assert.equal(error,null);
        assert.equal(response.statusCode,200);
        var retskredse= JSON.parse(body);
        assert(retskredse.length > 0, 'Der burde være retskredse, som starter med ho')
        // postnumre.forEach(function (adgangsadresse, index) {
        //   assert(husnrstørreogligmed(adgangsadresse.husnr,'14C'));
        // });
        //assert(adgangsadresse.zone==='Landzone', 'Zone er ikke Landzone, men ' + adgangsadresse.zone);
        done();
      })
    })
});

describe('Politikredssøgning', function(){

  it("q=fyn*", function(done){
    request(encodeURI(host+"/politikredse?q=fyn*&cache=no-cache"), function (error, response, body) {
      assert.equal(error,null);
      assert.equal(response.statusCode,200);
      var bynavne= JSON.parse(body);
      var bynavn= bynavne[0].navn;

      //console.log(util.inspect(bynavne[0]));
      //console.log(bynavn);
      assert(bynavn.search('Fyn')!=-1,"Navn indeholder ikke Fyn")
      done();
    })
  })


it("autocomplete nr", function(done){
    var options= {};
    options.baseUrl= host;
    options.url= 'politikredse/autocomplete';
    options.qs= {cache: 'no-cache'};
    options.qs.q= '14';
    request(options, function (error, response, body) {
      assert.equal(error,null);
      assert.equal(response.statusCode,200);
      var politikredse= JSON.parse(body);
      assert(politikredse.length > 0, 'Der burde være politikredse, som starter med 14')
      // politikredse.forEach(function (adgangsadresse, index) {
      //   assert(husnrstørreogligmed(adgangsadresse.husnr,'14C'));
      // });
      //assert(adgangsadresse.zone==='Landzone', 'Zone er ikke Landzone, men ' + adgangsadresse.zone);
      done();
    })
  })

  it("autocomplete navn", function(done){
    var options= {};
    options.baseUrl= host;
    options.url= 'politikredse/autocomplete';
    options.qs= {cache: 'no-cache'};
    options.qs.q= 'kø';
    request(options, function (error, response, body) {
      assert.equal(error,null);
      assert.equal(response.statusCode,200);
      var politikredse= JSON.parse(body);
      assert(politikredse.length > 0, 'Der burde være politikredse, som starter med kø')
      // postnumre.forEach(function (adgangsadresse, index) {
      //   assert(husnrstørreogligmed(adgangsadresse.husnr,'14C'));
      // });
      //assert(adgangsadresse.zone==='Landzone', 'Zone er ikke Landzone, men ' + adgangsadresse.zone);
      done();
    })
  })

});

describe('Opstillingskredssøgning', function(){

  it("q=nør*", function(done){
    request(encodeURI(host+"/opstillingskredse?q=nør*&cache=no-cache"), function (error, response, body) {
      assert.equal(error,null);
      assert.equal(response.statusCode,200);
      var bynavne= JSON.parse(body);
      var bynavn= bynavne[0].navn;

      //console.log(util.inspect(bynavne[0]));
      //console.log(bynavn);
      assert(bynavn.search('Nør')!=-1,"Navn indeholder ikke Nør")
      done();
    })
  })

it("autocomplete nr", function(done){
    var options= {};
    options.baseUrl= host;
    options.url= 'opstillingskredse/autocomplete';
    options.qs= {cache: 'no-cache'};
    options.qs.q= '4';
    request(options, function (error, response, body) {
      assert.equal(error,null);
      assert.equal(response.statusCode,200);
      var opstillingskredse= JSON.parse(body);
      assert(opstillingskredse.length > 0, 'Der burde være opstillingskredse, som starter med 4')
      // opstillingskredse.forEach(function (adgangsadresse, index) {
      //   assert(husnrstørreogligmed(adgangsadresse.husnr,'14C'));
      // });
      //assert(adgangsadresse.zone==='Landzone', 'Zone er ikke Landzone, men ' + adgangsadresse.zone);
      done();
    })
  })

  it("autocomplete navn", function(done){
    var options= {};
    options.baseUrl= host;
    options.url= 'opstillingskredse/autocomplete';
    options.qs= {cache: 'no-cache'};
    options.qs.q= 'ho';
    request(options, function (error, response, body) {
      assert.equal(error,null);
      assert.equal(response.statusCode,200);
      var opstillingskredse= JSON.parse(body);
      assert(opstillingskredse.length > 0, 'Der burde være opstillingskredse, som starter med ho')
      // postnumre.forEach(function (adgangsadresse, index) {
      //   assert(husnrstørreogligmed(adgangsadresse.husnr,'14C'));
      // });
      //assert(adgangsadresse.zone==='Landzone', 'Zone er ikke Landzone, men ' + adgangsadresse.zone);
      done();
    })
  })

});

describe('Adgangsadressesøgning', function(){

  it('rødkild*, 46, 2400', function(done){
    request(encodeURI(host+'/adgangsadresser?q=rødkild*&husnr=46&postnr=2400&cache=no-cache'), function (error, response, body) {  	
    	assert.equal(error,null);
    	assert.equal(response.statusCode,200);
	    var adresser= JSON.parse(body);
	    assert.equal(adresser.length,1);
	    done();
	  })
	})

	 it('vejnavn=Rødkildevej', function(done){
    request(encodeURI(host+'/adgangsadresser?vejnavn=Rødkildevej&cache=no-cache'), function (error, response, body) {  	
    	assert.equal(error,null);
    	assert.equal(response.statusCode,200);
	    var adresser= JSON.parse(body);
	    assert(adresser.length>1);
	    done();
	  })
	})

   function husnrmindreogligmed(a,b) {
    var regex= /(\d{1,3})([A-ZÆØÅa-zæøå]{0,1})/;
    var r= regex.exec(a);
    var anr= parseInt(r[1]);
    let abogstav= r.length>2?r[2]:"";
    r= regex.exec(b);
    let bnr= parseInt(r[1]);
    let bbogstav= r.length>2?r[2]:"";
    //console.log('a: nr: %s, bogstav: %s. b: nr: %s, bogstav: %s.',anr, abogstav, bnr, bbogstav);
    return (anr <= bnr) || (anr === bnr & abogstav.localeCompare(bbogstav)<=0);
   }

   function husnrstørreogligmed(a,b) {
    var regex= /(\d{1,3})([A-ZÆØÅa-zæøå]{0,1})/;
    var r= regex.exec(a);
    var anr= parseInt(r[1]);
    let abogstav= r.length>2?r[2]:"";
    r= regex.exec(b);
    let bnr= parseInt(r[1]);
    let bbogstav= r.length>2?r[2]:"";
    //console.log('a: nr: %s, bogstav: %s. b: nr: %s, bogstav: %s.',anr, abogstav, bnr, bbogstav);
    return (anr >= bnr) || (anr === bnr & abogstav.localeCompare(bbogstav)>=0);
   }


  it("husnrfra", function(done){
    var options= {};
    options.baseUrl= host;
    options.url='adgangsadresser';
    options.qs= {cache: 'no-cache'};
    options.qs.vejnavn= 'Næsbyholmvej';
    options.qs.postnr= '2700';
    options.qs.husnrfra= '14C';
    request(options, function (error, response, body) {
      assert.equal(error,null);
      assert.equal(response.statusCode,200);
      var adgangsadresser= JSON.parse(body);
      adgangsadresser.forEach(function (adgangsadresse, index) {
        assert(husnrstørreogligmed(adgangsadresse.husnr,'14C'));
      });
      //assert(adgangsadresse.zone==='Landzone', 'Zone er ikke Landzone, men ' + adgangsadresse.zone);
      done();
    })
  })

   it("husnrtil", function(done){
    var options= {};
    options.baseUrl= host;
    options.url='adgangsadresser';
    options.qs= {cache: 'no-cache'};
    options.qs.vejnavn= 'Næsbyholmvej';
    options.qs.postnr= '2700';
    options.qs.husnrtil= '16B';
    request(options, function (error, response, body) {
      assert.equal(error,null);
      assert.equal(response.statusCode,200);
      var adgangsadresser= JSON.parse(body);
      adgangsadresser.forEach(function (adgangsadresse, index) {
        assert(husnrmindreogligmed(adgangsadresse.husnr,'16B'));
      });
      //assert(adgangsadresse.zone==='Landzone', 'Zone er ikke Landzone, men ' + adgangsadresse.zone);
      done();
    })
  })

   it("husnrfra og husnrtil", function(done){
    var options= {};
    options.baseUrl= host;
    options.url='adgangsadresser';
    options.qs= {cache: 'no-cache'};
    options.qs.vejnavn= 'Næsbyholmvej';
    options.qs.postnr= '2700';
    options.qs.husnrfra= '14C';
    options.qs.husnrtil= '16B';
    request(options, function (error, response, body) {
      assert.equal(error,null);
      assert.equal(response.statusCode,200);
      var adgangsadresser= JSON.parse(body);
      adgangsadresser.forEach(function (adgangsadresse, index) {
        assert(husnrmindreogligmed(adgangsadresse.husnr,'16B'));
        assert(husnrstørreogligmed(adgangsadresse.husnr,'14C'));
      });
      //assert(adgangsadresse.zone==='Landzone', 'Zone er ikke Landzone, men ' + adgangsadresse.zone);
      done();
    })
  })

});

describe('Adgangsadresseautocomplete', function(){

  it("Indeholder adgangsadresse", function(done){
    request(encodeURI(host+"/adgangsadresser/autocomplete?q=Lilledal 1&cache=no-cache"), function (error, response, body) {
      assert.equal(error,null);
      assert.equal(response.statusCode,200);
      //console.log(body);
      var adadresser= JSON.parse(body);
      var adadresse= adadresser[0];
      //console.log(util.inspect(adadresse));  
      assert("adgangsadresse" in adadresse,"Property adgangsadresse mangler");
      done();
    })
  })

  it("Kan håndtere ë", function(done){
    request(encodeURI(host+"/adgangsadresser/autocomplete?q=Tove Maës Vej&cache=no-cache"), function (error, response, body) {
      assert.equal(error,null);
      assert.equal(response.statusCode,200);
      var adadresser= JSON.parse(body);
      var adadresse= adadresser[0]; assert.equal(error,null);
      assert(adadresser.length>1,"Der er flere adgangsadresser på Tove Maës vej end en");      
      assert('adgangsadresse' in adadresse,"Property adgangsadresse mangler");
      done();
    })
  })

  it('reverse geokodning', function(done){
    request(encodeURI(host+'/adgangsadresser/reverse?y=55.737308&x=12.513428&cache=no-cache'), function (error, response, body) {
      assert.equal(error,null);
      assert.equal(response.statusCode,200);
      var adresse= JSON.parse(body);
      let line= util.format(adresse.vejstykke.navn + " " + adresse.husnr + ', ' + adresse.postnummer.nr + ' ' + adresse.postnummer.navn + '(' + adresse.kommune.kode + ')');
      //console.log(line);
      done();
    })
  });
  
});

describe('Ejerlav', function(){

  // it("autocomplete nr", function(done){
  //   var options= {};
  //   options.baseUrl= host;
  //   options.url= 'opstillingskredse/autocomplete';
  //   options.qs= {cache: 'no-cache'};
  //   options.qs.q= '4';
  //   request(options, function (error, response, body) {
  //     assert.equal(error,null);
  //     assert.equal(response.statusCode,200);
  //     var opstillingskredse= JSON.parse(body);
  //     assert(opstillingskredse.length > 0, 'Der burde være opstillingskredse, som starter med 4')
  //     // opstillingskredse.forEach(function (adgangsadresse, index) {
  //     //   assert(husnrstørreogligmed(adgangsadresse.husnr,'14C'));
  //     // });
  //     //assert(adgangsadresse.zone==='Landzone', 'Zone er ikke Landzone, men ' + adgangsadresse.zone);
  //     done();
  //   })
  // })

  it("autocomplete navn", function(done){
    var options= {};
    options.baseUrl= host;
    options.url= 'ejerlav/autocomplete';
    options.qs= {cache: 'no-cache'};
    options.qs.q= 'ho';
    request(options, function (error, response, body) {
      assert.equal(error,null);
      assert.equal(response.statusCode,200);
      var ejerlav= JSON.parse(body);
      assert(ejerlav.length > 0, 'Der burde være ejerlav, som starter med ho')
      // postnumre.forEach(function (adgangsadresse, index) {
      //   assert(husnrstørreogligmed(adgangsadresse.husnr,'14C'));
      // });
      //assert(adgangsadresse.zone==='Landzone', 'Zone er ikke Landzone, men ' + adgangsadresse.zone);
      done();
    })
  })

});

describe('Jordstykker', function(){

  it("I ejerlav", function(done){
    request(encodeURI(host+"/jordstykker?ejerlavkode=80652&cache=no-cache"), function (error, response, body) {
      assert.equal(error,null);
      assert.equal(response.statusCode,200);
      var jordstykker= JSON.parse(body);
      assert(jordstykker.length>50,"Jordstykker mangler i ejelav");
      done();
    })
  })

  it("opslag", function(done){
    request(encodeURI(host+"/jordstykker/100453/8bd?cache=no-cache"), function (error, response, body) {
      assert.equal(error,null);
      assert.equal(response.statusCode,200);
      var jordstykke= JSON.parse(body);    
      assert(jordstykke.ejerlav.kode===100453,"Forkert jordstykke");
      done();
    })
  })

  it('reverse geokodning', function(done){
    request(encodeURI(host+'/jordstykker/reverse?y=55.737308&x=12.513428&cache=no-cache'), function (error, response, body) {
      assert.equal(error,null);
      assert.equal(response.statusCode,200);
      var jordstykke= JSON.parse(body); 
      //console.log('jordstykke: %s %s (10251 22a)', jordstykke.ejerlav.kode, jordstykke.matrikelnr);     
      assert(jordstykke.ejerlav.kode===10251&&jordstykke.matrikelnr==="22ia","Forkert jordstykke");
      done();
    })
  });
  
});

describe('Adressevask', function(){

  it("rentemestervej 4, 2400 københavn NV", function(done){
    var options= {};
    options.baseUrl= host;
    options.url='/datavask/adresser';
    options.qs= {cache: 'no-cache'};
    options.qs.betegnelse= 'rentemestervej 4, 2400 københavn NV';
    request(options, function (error, response, body) {
      assert.equal(error,null);
      assert.equal(response.statusCode,200);
      var resultat= JSON.parse(body);
      //console.log(resultat);
      assert(resultat.kategori==='A', 'Adressevaskresultat ikke kategori B');
      done();
    })
  })

  it("rentemester vej 4, 2400 københavn NV", function(done){
    var options= {};
    options.baseUrl= host;
    options.url='/datavask/adresser';
    options.qs= {cache: 'no-cache'};
    options.qs.betegnelse= 'rentemester vej 4, 2400 københavn NV';
    request(options, function (error, response, body) {
      assert.equal(error,null);
      assert.equal(response.statusCode,200);
      var resultat= JSON.parse(body);
      //console.log(resultat);
      assert(resultat.kategori==='B', 'Adressevaskresultat ikke kategori B');
      done();
    })
  })

  it("rente mester vej 4, 2400 københavn NV", function(done){
    var options= {};
    options.baseUrl= host;
    options.url='/datavask/adresser';
    options.qs= {cache: 'no-cache'};
    options.qs.betegnelse= 'rente mester vej 4, 2400 københavn NV';
    request(options, function (error, response, body) {
      assert.equal(error,null);
      assert.equal(response.statusCode,200);
      var resultat= JSON.parse(body);
      //console.log(resultat);
      assert(resultat.kategori==='B', 'Adressevaskresultat ikke kategori B');
      done();
    })
  })

  it("rante mester vej 4, 2400 københavn NV", function(done){
    var options= {};
    options.baseUrl= host;
    options.url='/datavask/adresser';
    options.qs= {cache: 'no-cache'};
    options.qs.betegnelse= 'rante mester vej 4, 2400 københavn NV';
    request(options, function (error, response, body) {
      assert.equal(error,null);
      assert.equal(response.statusCode,200);
      var resultat= JSON.parse(body);
      //console.log(resultat);
      assert(resultat.kategori==='B', 'Adressevaskresultat ikke kategori B');
      done();
    })
  })

  it("rante mester vej 4, 2400", function(done){
    var options= {};
    options.baseUrl= host;
    options.url='/datavask/adresser';
    options.qs= {cache: 'no-cache'};
    options.qs.betegnelse= 'rante mester vej 4, 2400';
    request(options, function (error, response, body) {
      assert.equal(error,null);
      assert.equal(response.statusCode,200);
      var resultat= JSON.parse(body);
      //console.log(resultat);
      assert(resultat.kategori==='B', 'Adressevaskresultat ikke kategori B');
      done();
    })
  })

   it("Rådhusstrædet 4, 3650 Ølstykke", function(done){
    var options= {};
    options.baseUrl= host;
    options.url='/datavask/adresser';
    options.qs= {};
    options.qs.cache= 'no-cache';
    options.qs.betegnelse= 'Rådhusstrædet 4, 3650 Ølstykke';
    options.resolveWithFullResponse= true;
    var jsonrequest= rp(options).then((response) => {
      assert(response.statusCode===200, "Http status code != 200");
      var resultat= JSON.parse(response.body);
      assert(resultat.kategori==='A', 'Adressevaskresultat ikke kategori A');
      assert(resultat.resultater[0].aktueladresse.adresseringsvejnavn==='Rådhusstrædet', 'Det fundne vejnavn er ikke Rådhusstrædet');
      done();
    })
    .catch((err) => {
      done(err);
    });
  });

  it("Neder-Holluf-Vej 3, Neder Holluf, 5220 Odense SØ", function(done){
    var options= {};
    options.baseUrl= host;
    options.url='/datavask/adresser';
    options.qs= {cache: 'no-cache'};
    options.qs.betegnelse= 'Neder-Holluf-Vej 3, Neder Holluf, 5220 Odense SØ';
    request(options, function (error, response, body) {
      assert.equal(error,null);
      assert.equal(response.statusCode,200);
      var resultat= JSON.parse(body);
      //console.log(resultat);
      assert(resultat.kategori==='A', 'Adressevaskresultat ikke kategori A, men ' + resultat.kategori);
      done();
    })
  })

  it("Neder-Holluf-Vej 3, 5220 Odense SØ", function(done){
    var options= {};
    options.baseUrl= host;
    options.url='/datavask/adresser';
    options.qs= {cache: 'no-cache'};
    options.qs.betegnelse= 'Neder-Holluf-Vej 3, 5220 Odense SØ';
    request(options, function (error, response, body) {
      assert.equal(error,null);
      assert.equal(response.statusCode,200);
      var resultat= JSON.parse(body);
      //console.log(resultat);
      assert(resultat.kategori==='A', 'Adressevaskresultat ikke kategori A, men ' + resultat.kategori);
      done();
    })
  })
  
  it("rådhus pladsen 75, 1550", function(done){
    var options= {};
    options.baseUrl= host;
    options.url='/datavask/adgangsadresser';
    options.qs= {cache: 'no-cache'};
    options.qs.betegnelse= 'rådhus pladsen 75, 1550';
    request(options, function (error, response, body) {
      assert.equal(error,null);
      assert.equal(response.statusCode,200);
      var resultat= JSON.parse(body);
      //console.log(resultat);
      assert(resultat.kategori==='B', 'Adressevaskresultat ikke kategori B, men ' + resultat.kategori);
      assert(resultat.resultater[0].aktueladresse.vejnavn==='Regnbuepladsen', 'Burde være Regnbuepladsen, men er ' + resultat.resultater[0].aktueladresse.vejnavn);
      assert(resultat.resultater[0].aktueladresse.husnr==='5', 'Burde være 5, men er ' + resultat.resultater[0].aktueladresse.husnr);
      done();
    })
  })

  it("rådhus pladsen 1, 1599 - stormodtagerpostnummer", function(done){
    var options= {};
    options.baseUrl= host;
    options.url='/datavask/adgangsadresser';
    options.qs= {cache: 'no-cache'};
    options.qs.betegnelse= 'rådhus pladsen 1, 1599';
    request(options, function (error, response, body) {
      assert.equal(error,null);
      assert.equal(response.statusCode,200);
      var resultat= JSON.parse(body);
      //console.log(resultat);
      assert(resultat.kategori==='B', 'Adressevaskresultat ikke kategori B, men ' + resultat.kategori);
      assert(resultat.resultater[0].aktueladresse.postnr==='1550', 'Burde være 1550, men er ' + resultat.resultater[0].aktueladresse.vejnavn);
      done();
    })
  })

  it("hf arb bol kolonih 1, 2500 - adresseringsnavn", function(done){
    var options= {};
    options.baseUrl= host;
    options.url='/datavask/adgangsadresser';
    options.qs= {cache: 'no-cache'};
    options.qs.betegnelse= 'hf arb bol kolonih 1, 2500';
    request(options, function (error, response, body) {
      assert.equal(error,null);
      assert.equal(response.statusCode,200);
      var resultat= JSON.parse(body);
      //console.log(resultat);
      assert(resultat.kategori==='B', 'Adressevaskresultat ikke kategori B, men ' + resultat.kategori);
      assert(resultat.resultater[0].aktueladresse.vejnavn==='Høffdingsvej', 'Burde være Høffdingsvej, men er ' + resultat.resultater[0].aktueladresse.vejnavn);
      done();
    })
  })
  
}); 

describe('Zone', function(){

  it("Rosenlundsvej 3, 2791 Dragør", function(done){
    var options= {};
    options.baseUrl= host;
    options.url='/adgangsadresser';
    options.qs= {cache: 'no-cache'};
    options.qs.q= 'Rosenlundsvej 3, 2791 Dragør';
    request(options, function (error, response, body) {
      assert.equal(error,null);
      assert.equal(response.statusCode,200);
      var adgangsadresser= JSON.parse(body);
      var adgangsadresse= adgangsadresser[0];
      //console.log(adgangsadresse);
      assert(adgangsadresse.zone==='Sommerhusområde', 'Zone er ikke Sommerhusområde, men ' + adgangsadresse.zone);
      done();
    })
  })

  it("Kalvebodvej 1, 2791 Dragør", function(done){
    var options= {};
    options.baseUrl= host;
    options.url='adgangsadresser';
    options.qs= {cache: 'no-cache'};
    options.qs.q= 'Kalvebodvej 30, 2791 Dragør';
    request(options, function (error, response, body) {
      assert.equal(error,null);
      assert.equal(response.statusCode,200);
      var adgangsadresser= JSON.parse(body);
      var adgangsadresse= adgangsadresser[0];
      //console.log(adgangsadresse);
      assert(adgangsadresse.zone==='Landzone', 'Zone er ikke Landzone, men ' + adgangsadresse.zone);
      done();
    })
  })

  it("q=Kalvebodvej 1, 2791 Dragør&zone=Landzone", function(done){
    var options= {};
    options.baseUrl= host;
    options.url='adgangsadresser';
    options.qs= {cache: 'no-cache'};
    options.qs.q= 'Kalvebodvej 30, 2791 Dragør';
    options.qs.zone='Landzone';
    request(options, function (error, response, body) {
      assert.equal(error,null);
      assert.equal(response.statusCode,200);
      var adgangsadresser= JSON.parse(body);
      assert(adgangsadresser.length===1, 'Adressen burde ligge i landzonen')
      var adgangsadresse= adgangsadresser[0];
      //console.log(adgangsadresse);
      assert(adgangsadresse.zone==='Landzone', 'Zone er ikke Landzone, men ' + adgangsadresse.zone);
      done();
    })
  })

  it("Ahornvej 16, 2791 Dragør", function(done){
    var options= {};
    options.baseUrl= host;
    options.url='adgangsadresser';
    options.qs= {cache: 'no-cache'};
    options.qs.q= 'Ahornvej 16, 2791 Dragør';
    request(options, function (error, response, body) {
      assert.equal(error,null);
      assert.equal(response.statusCode,200);
      var adgangsadresser= JSON.parse(body);
      var adgangsadresse= adgangsadresser[0];
      //console.log(adgangsadresse);
      assert(adgangsadresse.zone==='Byzone', 'Zone er ikke Byzone, men ' + adgangsadresse.zone);
      done();
    })
  })


  it("Samme zone i json og csv format", function(done){

    var optjson= {};
    optjson.baseUrl= host;
    optjson.url='adgangsadresser';
    optjson.qs= {};
    optjson.qs.cache= 'no-cache';
    optjson.qs.vejnavn= 'Kalvebodvej';
    optjson.qs.husnr= '166';
    optjson.qs.postnr= '2791';
    var jsonrequest= rp(optjson);

    var optcsv= {};
    optcsv.baseUrl= host;
    optcsv.url=optjson.url;
    optcsv.qs= {};
    optcsv.qs.cache= optjson.qs.cache;
    optcsv.qs.vejnavn= optjson.qs.vejnavn;
    optcsv.qs.husnr= optjson.qs.husnr;
    optcsv.qs.postnr= optjson.qs.postnr;
    optcsv.qs.format= 'csv';
    var csvrequest= rp(optcsv);

    Promise.all([jsonrequest, csvrequest]).then(function (bodies) {
      var adgangsadresserjson= JSON.parse(bodies[0]);
      var adgangsadressejson= adgangsadresserjson[0];
      //console.log(adgangsadresse);      
      csv.parse(bodies[1], {columns: true}, function (err, adgangsadressercsv) {
        var adgangsadressecsv= adgangsadressercsv[0];
        //console.log(adgangsadressecsv);
        assert(adgangsadressejson.zone===adgangsadressecsv.zone, 'Zone i json og csv format forskellig. json: ' + adgangsadressejson.zone + ', csv: ' + adgangsadressecsv.zone);
        assert(adgangsadressejson.id===adgangsadressecsv.id, 'Id i json og csv format forskellig. json: ' + adgangsadressejson.id + ', csv: ' + adgangsadressecsv.id);
        assert(adgangsadressejson.status==adgangsadressecsv.status, 'Status i json og csv format forskellig. json: |' + adgangsadressejson.status + '|, csv: |' + adgangsadressecsv.status + '|');
        assert(adgangsadressejson.kvh===adgangsadressecsv.kvh, 'kvh i json og csv format forskellig. json: ' + adgangsadressejson.kvh + ', csv: ' + adgangsadressecsv.kvh);
        assert(adgangsadressejson.historik.oprettet===adgangsadressecsv.oprettet, 'oprettet i json og csv format forskellig. json: |' + adgangsadressejson.historik.oprettet + '|, csv: |' + adgangsadressecsv.oprettet + '|');
        assert(adgangsadressejson.historik.ændret===adgangsadressecsv.ændret, 'ændret i json og csv format forskellig. json: ' + adgangsadressejson.historik.ændret + ', csv: ' + adgangsadressecsv.ændret);
        //assert(adgangsadressejson.etage===adgangsadressecsv.etage, 'etage i json og csv format forskellig. json: ' + adgangsadressejson.etage + ', csv: ' + adgangsadressecsv.etage);
        //assert(adgangsadressejson.dør===adgangsadressecsv.dør, 'dør i json og csv format forskellig. json: ' + adgangsadressejson.dør + ', csv: ' + adgangsadressecsv.dør);
         assert(adgangsadressejson.vejstykke.navn===adgangsadressecsv.vejnavn, 'adgangsadresse.vejstykke.navn i json og csv format forskellig. json: ' + adgangsadressejson.vejstykke.navn + ', csv: ' + adgangsadressecsv.vejnavn);
        assert(adgangsadressejson.vejstykke.kode===adgangsadressecsv.vejkode, 'adgangsadresse.vejstykke.kode i json og csv format forskellig. json: ' + adgangsadressejson.vejstykke.kode + ', csv: ' + adgangsadressecsv.vejkode);
        assert(adgangsadressejson.vejstykke.adresseringsnavn===adgangsadressecsv.adresseringsvejnavn, 'adgangsadresse.vejstykke.adresseringsnavn i json og csv format forskellig. json: ' + adgangsadressejson.vejstykke.adresseringsnavn + ', csv: ' + adgangsadressecsv.adresseringsvejnavn);
        assert(adgangsadressejson.husnr===adgangsadressecsv.husnr, 'adgangsadresse.husnr i json og csv format forskellig. json: ' + adgangsadressejson.husnr + ', csv: ' + adgangsadressecsv.husnr);
        assert(adgangsadressejson.supplerendebynavn==adgangsadressecsv.supplerendebynavn||adgangsadressejson.supplerendebynavn===null&&adgangsadressecsv.supplerendebynavn=="", 'adgangsadresse.supplerendebynavn i json og csv format forskellig. json: ' + adgangsadressejson.supplerendebynavn + ', csv: ' + adgangsadressecsv.supplerendebynavn);
        assert(adgangsadressejson.postnummer.nr===adgangsadressecsv.postnr, 'adgangsadresse.postnummer.nr i json og csv format forskellig. json: ' + adgangsadressejson.postnummer.nr + ', csv: ' + adgangsadressecsv.postnr);
        assert(adgangsadressejson.postnummer.navn===adgangsadressecsv.postnrnavn, 'adgangsadresse.postnummer.navn i json og csv format forskellig. json: ' + adgangsadressejson.postnummer.navn + ', csv: ' + adgangsadressecsv.postnrnavn);
        if (adgangsadressejson.stormodtagerpostnr) {
          assert(adgangsadressejson.stormodtagerpostnummer.nr===adgangsadressecsv.stormodtagerpostnr, 'adgangsadresse.stormodtagerpostnummer.nr i json og csv format forskellig. json: ' + adgangsadressejson.stormodtagerpostnummer.nr + ', csv: ' + adgangsadressecsv.stormodtagerpostnr);
          assert(adgangsadressejson.stormodtagerpostnummer.navn===adgangsadressecsv.stormodtagerpostnrnavn, 'adgangsadresse.stormodtagerpostnummer.navn i json og csv format forskellig. json: ' + adgangsadressejson.stormodtagerpostnummer.navn + ', csv: ' + adgangsadressecsv.stormodtagerpostnrnavn);
      
        }
        assert(adgangsadressejson.kommune.kode===adgangsadressecsv.kommunekode, 'adgangsadresse.kommune.nr i json og csv format forskellig. json: ' + adgangsadressejson.kommune.kode + ', csv: ' + adgangsadressecsv.kommunekode);
        assert(adgangsadressejson.kommune.navn===adgangsadressecsv.kommunenavn, 'adgangsadresse.kommune.navn i json og csv format forskellig. json: ' + adgangsadressejson.kommune.navn + ', csv: ' + adgangsadressecsv.kommunenavn);
        assert(adgangsadressejson.ejerlav.kode==adgangsadressecsv.ejerlavkode, 'adgangsadresse.ejerlav.nr i json og csv format forskellig. json: ' + adgangsadressejson.ejerlav.kode + ', csv: ' + adgangsadressecsv.ejerlavkode);
        assert(adgangsadressejson.ejerlav.navn===adgangsadressecsv.ejerlavnavn, 'adgangsadresse.ejerlav.navn i json og csv format forskellig. json: ' + adgangsadressejson.ejerlav.navn + ', csv: ' + adgangsadressecsv.ejerlavnavn);
        assert(adgangsadressejson.sogn.kode===adgangsadressecsv.sognekode, 'adgangsadresse.sogn.nr i json og csv format forskellig. json: ' + adgangsadressejson.sogn.kode + ', csv: ' + adgangsadressecsv.sognekode);
        assert(adgangsadressejson.sogn.navn===adgangsadressecsv.sognenavn, 'adgangsadresse.sogn.navn i json og csv format forskellig. json: ' + adgangsadressejson.sogn.navn + ', csv: ' + adgangsadressecsv.sognenavn);
        assert(adgangsadressejson.region.kode===adgangsadressecsv.regionskode, 'adgangsadresse.region.nr i json og csv format forskellig. json: ' + adgangsadressejson.region.kode + ', csv: ' + adgangsadressecsv.regionskode);
        assert(adgangsadressejson.region.navn===adgangsadressecsv.regionsnavn, 'adgangsadresse.region.navn i json og csv format forskellig. json: ' + adgangsadressejson.region.navn + ', csv: ' + adgangsadressecsv.regionsnavn);
        assert(adgangsadressejson.retskreds.kode===adgangsadressecsv.retskredskode, 'adgangsadresse.retskreds.nr i json og csv format forskellig. json: ' + adgangsadressejson.retskreds.kode + ', csv: ' + adgangsadressecsv.retskredskode);
        assert(adgangsadressejson.retskreds.navn===adgangsadressecsv.retskredsnavn, 'adgangsadresse.retskreds.navn i json og csv format forskellig. json: ' + adgangsadressejson.retskreds.navn + ', csv: ' + adgangsadressecsv.retskredsnavn);
        assert(adgangsadressejson.politikreds.kode===adgangsadressecsv.politikredskode, 'adgangsadresse.politikreds.nr i json og csv format forskellig. json: ' + adgangsadressejson.politikreds.kode + ', csv: ' + adgangsadressecsv.politikredskode);
        assert(adgangsadressejson.politikreds.navn===adgangsadressecsv.politikredsnavn, 'adgangsadresse.politikreds.navn i json og csv format forskellig. json: ' + adgangsadressejson.politikreds.navn + ', csv: ' + adgangsadressecsv.politikredsnavn);
        assert(adgangsadressejson.opstillingskreds.kode===adgangsadressecsv.opstillingskredskode, 'adgangsadresse.opstillingskreds.nr i json og csv format forskellig. json: ' + adgangsadressejson.opstillingskreds.kode + ', csv: ' + adgangsadressecsv.opstillingskredskode);
        assert(adgangsadressejson.opstillingskreds.navn===adgangsadressecsv.opstillingskredsnavn, 'adgangsadresse.opstillingskreds.navn i json og csv format forskellig. json: ' + adgangsadressejson.opstillingskreds.navn + ', csv: ' + adgangsadressecsv.retskredsnavn);
        assert(adgangsadressejson.opstillingskreds.kode===adgangsadressecsv.opstillingskredskode, 'adgangsadresse.opstillingskreds.nr i json og csv format forskellig. json: ' + adgangsadressejson.opstillingskreds.kode + ', csv: ' + adgangsadressecsv.opstillingskredskode);
        assert(adgangsadressejson.opstillingskreds.navn===adgangsadressecsv.opstillingskredsnavn, 'adgangsadresse.opstillingskreds.navn i json og csv format forskellig. json: ' + adgangsadressejson.opstillingskreds.navn + ', csv: ' + adgangsadressecsv.retskredsnavn);
        assert(adgangsadressejson.esrejendomsnr===adgangsadressecsv.esrejendomsnr, 'adgangsadresse.esrejendomsnr i json og csv format forskellig. json: ' + adgangsadressejson.esrejendomsnr + ', csv: ' + adgangsadressecsv.esrejendomsnr);
        assert(adgangsadressejson.matrikelnr===adgangsadressecsv.matrikelnr, 'adgangsadresse.matrikelnr i json og csv format forskellig. json: ' + adgangsadressejson.matrikelnr + ', csv: ' + adgangsadressecsv.matrikelnr);
        
        assert(adgangsadressejson.adgangspunkt.koordinater[0]==adgangsadressecsv.wgs84koordinat_længde, 'adgangspunkt.koordinater[0] i json og csv format forskellig. json: ' + adgangsadressejson.adgangspunkt.koordinater[0] + ', csv: ' + adgangsadressecsv.wgs84koordinat_længde);
        assert(adgangsadressejson.adgangspunkt.koordinater[1]==adgangsadressecsv.wgs84koordinat_bredde, 'adgangspunkt.koordinater[1] i json og csv format forskellig. json: ' + adgangsadressejson.adgangspunkt.koordinater[1] + ', csv: ' + adgangsadressecsv.wgs84koordinat_bredde);
        assert(adgangsadressejson.adgangspunkt.nøjagtighed===adgangsadressecsv.nøjagtighed, 'adgangspunkt.nøjagtighed i json og csv format forskellig. json: ' + adgangsadressejson.adgangspunkt.nøjagtighed + ', csv: ' + adgangsadressecsv.nøjagtighed);
        assert(adgangsadressejson.adgangspunkt.kilde==adgangsadressecsv.kilde, 'adgangspunkt.kilde i json og csv format forskellig. json: ' + adgangsadressejson.adgangspunkt.kilde + ', csv: ' + adgangsadressecsv.kilde);
        assert(adgangsadressejson.adgangspunkt.tekniskstandard===adgangsadressecsv.tekniskstandard, 'adgangspunkt.tekniskstandard i json og csv format forskellig. json: ' + adgangsadressejson.adgangspunkt.tekniskstandard + ', csv: ' + adgangsadressecsv.tekniskstandard);
        assert(adgangsadressejson.adgangspunkt.tekstretning==adgangsadressecsv.tekstretning, 'adgangspunkt.tekstretning i json og csv format forskellig. json: ' + adgangsadressejson.adgangspunkt.tekstretning + ', csv: ' + adgangsadressecsv.tekstretning);
        assert(adgangsadressejson.adgangspunkt.ændret===adgangsadressecsv.adressepunktændringsdato, 'adgangspunkt.adressepunktændringsdato i json og csv format forskellig. json: ' + adgangsadressejson.adgangspunkt.ændret + ', csv: ' + adgangsadressecsv.adressepunktændringsdato);
        assert(adgangsadressejson.jordstykke.ejerlav.kode==adgangsadressecsv.jordstykke_ejerlavkode, 'jordstykke.ejerlav.kode i json og csv format forskellig. json: ' + adgangsadressejson.jordstykke.ejerlav.kode + ', csv: ' + adgangsadressecsv.jordstykke_ejerlavkode);
        assert(adgangsadressejson.jordstykke.matrikelnr===adgangsadressecsv.jordstykke_matrikelnr, 'jordstykke.matrikelnr i json og csv format forskellig. json: ' + adgangsadressejson.jordstykke.matrikelnr + ', csv: ' + adgangsadressecsv.jordstykke_matrikelnr);
        assert(adgangsadressejson.jordstykke.esrejendomsnr===adgangsadressecsv.jordstykke_esrejendomsnr, 'jordstykke.esrejendomsnr i json og csv format forskellig. json: ' + adgangsadressejson.jordstykke.esrejendomsnr + ', csv: ' + adgangsadressecsv.jordstykke_esrejendomsnr);
        done();
      });
    });

  })
})


describe('Bebyggelser', function(){

  function findNavn(navn) {
    return function findBebyggelse(bebyggelse) { 
      return bebyggelse.navn === navn;
    }
  }

  it("Reverse geokodning", function(done){
    var options= {};
    options.baseUrl= host;
    options.url='bebyggelser';
    options.qs= {};
    options.qs.cache= 'no-cache';
    options.qs.x= 12.5108572474172;
    options.qs.y= 55.6983973831476;
    options.resolveWithFullResponse= true;
    var jsonrequest= rp(options).then((response) => {
      assert(response.statusCode===200, "Http status code != 200");
      var bebyggelser= JSON.parse(response.body);
      assert(bebyggelser.length === 3, "Antal bebyggelsestyper != 3");
      assert(bebyggelser.find(findNavn('Grøndal')), 'Mangler bydel Grøndal');
      assert(bebyggelser.find(findNavn('København')), 'Mangler by København');
      assert(bebyggelser.find(findNavn('Storkøbenhavn')), 'Mangler storby Storkøbenhavn');
      done();
    })
    .catch((err) => {
      done(err);
    });
  });

  it("Frederiksberg", function(done){
    var options= {};
    options.baseUrl= host;
    options.url='bebyggelser';
    options.qs= {};
    options.qs.cache= 'no-cache';
    options.qs.x= 12.532079381664;
    options.qs.y= 55.6784255961403;
    options.resolveWithFullResponse= true;
    var jsonrequest= rp(options).then((response) => {
      assert(response.statusCode===200, "Http status code != 200");
      var bebyggelser= JSON.parse(response.body);
      assert(bebyggelser.find(findNavn('Frederiksberg')), 'Mangler by Frederiksberg');
      done();
    })
    .catch((err) => {
      done(err);
    });
  });

  it("Navne søgning", function(done){
    var options= {};
    options.baseUrl= host;
    options.url='bebyggelser';
    options.qs= {};
    options.qs.cache= 'no-cache';
    options.qs.navn= 'Frederiksberg';
    options.resolveWithFullResponse= true;
    var jsonrequest= rp(options).then((response) => {
      assert(response.statusCode===200, "Http status code != 200");
      var bebyggelser= JSON.parse(response.body);
      assert(bebyggelser.length > 10, "Antal bebyggelser <= 10 (" + bebyggelser.length + ")");
      assert(bebyggelser.find(findNavn('Frederiksberg')), 'Mangler bydel Grøndal');
      done();
    })
    .catch((err) => {
      done(err);
    });
  });

  it("Navne og type søgning", function(done){
    var options= {};
    options.baseUrl= host;
    options.url='bebyggelser';
    options.qs= {};
    options.qs.cache= 'no-cache';
    options.qs.navn= 'Frederiksberg';
    options.qs.type= 'by';
    options.resolveWithFullResponse= true;
    var jsonrequest= rp(options).then((response) => {
      assert(response.statusCode===200, "Http status code != 200");
      var bebyggelser= JSON.parse(response.body);
      assert(bebyggelser.length > 2, "Antal bebyggelser <= 3 (" + bebyggelser.length + ")");
      assert(bebyggelser.find(findNavn('Frederiksberg')), 'Mangler bydel Grøndal');
      done();
    })
    .catch((err) => {
      done(err);
    });
  });

})


describe('Nærmeste DAGI inddeling', function(){

  it("Knippelsbro 2", function(done){
    var options= {};
    options.baseUrl= host;
    options.url='adgangsadresser';
    options.qs= {};
    options.qs.cache= 'no-cache';
    options.qs.vejnavn= "Knippelsbro";
    options.qs.husnr= "2";
    options.qs.postnr= "1400";
    options.resolveWithFullResponse= true;
    var jsonrequest= rp(options).then((response) => {
      assert(response.statusCode===200, "Http status code != 200");
      var adgangsadresser= JSON.parse(response.body);
      assert(adgangsadresser.length===1, "Der er ikke fundet én Knippelsbro 2");
      assert(adgangsadresser.sogn!==null, "Intet sogn");
      assert(adgangsadresser.retskreds!==null, "Ingen retskreds");
      assert(adgangsadresser.politikreds!==null, "Ingen politikreds");
      assert(adgangsadresser.opstillingskreds!==null, "Ingen opstillingskreds");
      done();
    })
    .catch((err) => {
      done(err);
    });
  });

});


describe('Korttjenester', function(){

  it("WMS", function(done){
    var options= {};
    options.url='http://kort.aws.dk/geoserver/aws4_wms/wms';
    options.qs= {};
    options.qs.styles= "StandardStor";
    options.qs.servicename= "wms";
    options.qs.LAYERS= "adgangsadresser";
    options.qs.TRANSPARENT= "TRUE";
    options.qs.FORMAT= "image/png";
    options.qs.SERVICE= "WMS";
    options.qs.VERSION= "1.1.1";
    options.qs.REQUEST= "GetMap";
    options.qs.SRS= "EPSG:25832";
    options.qs.BBOX= "719910.4,6191212.8,719961.6,6191264";
    options.qs.WIDTH= "256";
    options.qs.HEIGHT= "256";
    options.resolveWithFullResponse= true;
    var jsonrequest= rp(options).then((response) => {
      assert(response.statusCode===200, "Http status code != 200");
      //console.log(util.inspect(response.headers));
      assert(response.headers["content-type"]==="image/png", "content-type !== image/png");
      done();
    })
    .catch((err) => {
      done(err);
    });
  });

  it("WFS", function(done){
    var options= {};
    options.url='http://kort.aws.dk/geoserver/aws4_wfs/wfs';
    options.qs= {};
    options.qs.SERVICE= "WFS";
    options.qs.REQUEST= "GetFeature";
    options.qs.VERSION= "2.0.0";
    options.qs.TYPENAMES= "aws4_wfs:adresser";
    options.qs.COUNT= 1;
    options.qs.SRSNAME= "urn:ogc:def:crs:EPSG::25832";
    options.qs.BBOX= "719910.4,6191212.8,719961.6,6191264,urn:ogc:def:crs:EPSG::25832";
    options.resolveWithFullResponse= true;
    var jsonrequest= rp(options).then((response) => {
      assert(response.statusCode===200, "Http status code != 200");
      //console.log(util.inspect(response.headers));
      assert(response.headers["content-type"]==="text/xml; subtype=gml/3.2", "content-type !== text/xml; subtype=gml/3.2");
      done();
    })
    .catch((err) => {
      done(err);
    });
  });

})

// describe('HAProxy', function(){

//    it("http status code 429 og body har korrekt format", Q.async(function*() {

//     var optjson = {};
//     optjson.baseUrl = host;
//     console.log('url: '+host)
//     optjson.url = 'adgangsadresser';
//     var pool= new http.Agent();
//     pool.maxSockets= 100;
//     optjson.pool=  pool;
//     optjson.qs = {};
//     optjson.qs.cache = 'no-cache';
//     optjson.qs.vejnavn = 'Kalvebodvej';
//     //optjson.qs.husnr = '166';
//     optjson.qs.postnr = '2791';
//     optjson.resolveWithFullResponse = true;
//     optjson.simple = false;

//     var requests = [];
//     for (var i = 0; i < 15; i++) {
//       //optjson.qs.husnr = i.toString();
//       requests.push(rp(optjson));
//     }

//     var antal = 0;
//     //console.log('Længden af requests: %d', requests.length);

//     // Med denne løsning vil testen fejle, hvis der er et request der fejler (dvs. slet ikke giver et response). 
//     // Det tænker jeg er helt OK.
//     // Alternativt kan benyttes Q.allSettled, hvor man så får et array hvor man kan se om hver enkelt promise blev
//     // resolved eller rejected.
//     var responses = yield Promise.all(requests);
//     responses.forEach(function (response, index) {
//       console.log(response.statusCode);
//       console.log(response.body);
//       if (response.statusCode === 429) {
//         antal++;
//         var message = JSON.parse(response.body);
//         assert(message.type && message.title && message.details, "429 message skal indeholde type, title og details");
//         console.log('type: %s, title: %s, details: %s', message.type, message.title, message.details);
//       }
//     });
//     //console.log('antal: %d',antal)
//     assert(antal > 0, 'Der burde være mindst et kald, som returnerede http statuskode 429');
//   }));
  

// });
