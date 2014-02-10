var senesteloebenr= 0;

var apiBase = 'api/pg/';

function makeshow(loebenr,input,process) {
  return function (adresser) 
  {
    console.log("loebenr: %d, seneste: %d",loebenr,senesteloebenr);
    if (loebenr < senesteloebenr) return;
    var items= [];
    $.each(adresser, function (i, adresse) {
      items.push(adresse.vej.navn + (adresse.husnr.length > 0?' '+adresse.husnr:"") + (adresse.etage.length > 0?', '+adresse.etage+'.':"") + (adresse.dør.length > 0?' '+adresse.dør:"") + (adresse.postnummer.nr.length > 0?' - '+adresse.postnummer.nr+' '+adresse.postnummer.navn:""));
    });
    if (items[0]) {
      var qs= $(input).val();
      var l= qs.length;
      // if (qs.charAt(l-1) !== items[0].charAt(l-1)) {
      //  l= l+1;
      // }
      var s= items[0].substring(0,l);
      console.log('qs: '+qs+', s: '+s);
      if (qs.toLocaleLowerCase() === s.toLocaleLowerCase()) $(input).val(s);
    }
    process(items);
  };
}
function search(input,kommunekode) {
  var antaladresser= 12;
  // loebenummer for de viste forslag
  var loebenummerViste = 0;
  // loebenummer for naeste query der laves
  var loebenummerNaeste = 1;
	$(input).typeahead({
		items: antaladresser,
    matcher: function() { return true; },
    sorter: function(items) { return items; },
		source: function (query, process) {
      var loebenummer = loebenummerNaeste++;
			var parametre= {q: query}; 
      parametre.side= 1;
      parametre.per_side= antaladresser;
			if (kommunekode) parametre.kommunekode= kommunekode;
			$.ajax({
				cache: true,
	  url: apiBase+'vejnavne/autocomplete',
				data: parametre,
			  dataType: "json",
			  error: function (xhr, status, errorThrown) {	
  				var text= xhr.status + " " + xhr.statusText + " " + status + " " + errorThrown;
  				alert(text);
				} ,
				success: function(vejnavneResults) {
          function showSuggestions(suggestions) {
            if(loebenummer > loebenummerViste) {
              loebenummerViste = loebenummer;
              return process(suggestions);
            }
          }

          if(vejnavneResults.length > 1) {
            return showSuggestions(_.pluck(vejnavneResults, 'tekst'));
          }
          $.ajax({
            cache: true,
            url: apiBase+'adresser/autocomplete',
            data: parametre,
            dataType: "json",
            error: function (xhr, status, errorThrown) {
              var text= xhr.status + " " + xhr.statusText + " " + status + " " + errorThrown;
              alert(text);
            } ,
            success: function(adresseResults) {
              return showSuggestions(_.pluck(adresseResults, 'tekst'));
            }
          });
        }
      });
    }
	});
}

function searchPostnr(input) {
  $.ajax({
    cache: true,
    url:apiBase +'postnumre',
    dataType: "json",
    error: function (xhr, status, errorThrown) {  
      var text= xhr.status + " " + xhr.statusText + " " + status + " " + errorThrown;
      alert(text);
    } ,
    success: function (postnumre) {
      var items= [];
      $.each(postnumre, function (i, postnr) {
        items.push(postnr.postnr + " " + postnr.navn);
      });
      $(input).autocomplete({
        source: items,
        autoFocus: true,
        minLength: 1
      });
    }
  });
}

function searchVejnavn(pnr,vej) {
  var update;
  var ptext = $(pnr).val();
  var reg = /(\d{4})/g;
  match = reg.exec(ptext);
  if (match === null) return;
  var parametre= {postnr: match[1]}; 
  $.ajax({
    url:'vejnavne.json',
    data: parametre,
    dataType: "json",
    error: function (xhr, status, errorThrown) {  
      var text= xhr.status + " " + xhr.statusText + " " + status + " " + errorThrown;
      alert(text);
    } ,
    success: function (vejnavne) {
      var navne= [];
      $.each(vejnavne, function (i, vejnavn) {
        navne.push(vejnavn.navn);
      });
      $(vej).autocomplete({
        source: navne,
        autoFocus: true,
        minLength: 1
      });
    }
  });
}

function searchHusnr(pnr,vej,husnr) {
  var ptext = $(pnr).val();
  var reg = /(\d{4})/g;
  match = reg.exec(ptext);
  if (match === null) return;
  var vtext = $(vej).val();
  if (vtext===null || vtext.length === 0) return;
  var parametre= {postnr: match[1], vejnavn: vtext}; 
  $.ajax({
    cache: true,
    url:'adresser.json',
    data: parametre,
    dataType: "json",
    error: function (xhr, status, errorThrown) {  
      var text= xhr.status + " " + xhr.statusText + " " + status + " " + errorThrown;
      alert(text);
    } ,
    success: function (adresser) {
      var husnumre= [];
      $.each(adresser, function (i, adresse) {
        if (husnumre.indexOf(adresse.husnr) === -1) husnumre.push(adresse.husnr);
      });
      husnumre= husnumre.sort(function(a,b) {
                              var reg= /(\d+)([A-Z]*)/gi;
                              var ma= reg.exec(a);
                              reg.lastIndex= 0; 
                              var mb= reg.exec(b);
                              if (ma === null || mb === null) return 0;
                              var ahusnr= ma[1];
                              var bhusnr= mb[1];
                              abok= (ma[2] === '')?' ':ma[2];
                              bbok= (mb[2] === '')?' ':mb[2];
                              return (ahusnr !== bhusnr)?(parseInt(ahusnr) - parseInt(bhusnr)):abok.localeCompare(bbok);
                              //return parseInt(ahusnr) - parseInt(bhusnr);
                            });
      $(husnr).autocomplete({
        source: husnumre,
        autoFocus: true,
        minLength: 1
      });
    }
  });
}


function searchEtage(pnr,vej,husnr,etage) {
  var ptext = $(pnr).val();
  var reg = /(\d{4})/g;
  match = reg.exec(ptext);
  if (match === null) return;
  var vtext = $(vej).val();
  if (vtext===null || vtext.length === 0) return;
  var htext = $(husnr).val();
  if (htext===null || htext.length === 0) return;
  var parametre= {postnr: match[1], vejnavn: vtext, husnr: htext}; 
  $.ajax({
    cache: true,
    url:'adresser.json',
    data: parametre,
    dataType: "json",
    error: function (xhr, status, errorThrown) {  
      var text= xhr.status + " " + xhr.statusText + " " + status + " " + errorThrown;
      alert(text);
    } ,
    success: function (adresser) {
      var etager= [];
      $.each(adresser, function (i, adresse) {
        if (etager.indexOf(adresse.etage) === -1) etager.push(adresse.etage);
      });
      $(etage).autocomplete({
        source: etager,
        autoFocus: true,
        minLength: 0
      });
      $(etage).autocomplete("search", "");
    }
  });
}


function searchDør(pnr,vej,husnr,etage,doer) {
  var ptext = $(pnr).val();
  var reg = /(\d{4})/g;
  match = reg.exec(ptext);
  if (match === null) return;
  var vtext = $(vej).val();
  if (vtext===null || vtext.length === 0) return;
  var htext = $(husnr).val();
  if (htext===null || htext.length === 0) return;
  var etext = $(etage).val();
  if (etext===null || etext.length === 0) return;
  var parametre= {postnr: match[1], vejnavn: vtext, husnr: htext, etage: etext}; 
  $.ajax({
    cache: true,
    url:'adresser.json',
    data: parametre,
    dataType: "json",
    error: function (xhr, status, errorThrown) {  
      var text= xhr.status + " " + xhr.statusText + " " + status + " " + errorThrown;
      alert(text);
    } ,
    success: function (adresser) {
      var dører= [];
      $.each(adresser, function (i, adresse) {
        if (dører.indexOf(adresse.dør) === -1) dører.push(adresse.dør);
      });
      $(doer).autocomplete({
        source: dører,
        autoFocus: true,
        minLength: 0
      });
      $(doer).autocomplete("search", "");
    }
  });
}

function inverseGeocoding()
{
	var map;
  var marker;

  function onMapClick(e) {
    // marker= L.marker(e.latlng).addTo(map);
    // marker.bindPopup(e.latlng.toString()).openPopup();
    var url = "/adresser/" + e.latlng.lat.toString() + "," + e.latlng.lng.toString() + ".json";
    $.ajax({
      url: url,
      dataType: "jsonp",
      success: function(data) {          
        var popup = L.popup();
        popup
          .setLatLng(new L.LatLng(data.adressepunkt.wgs84koordinat.bredde,data.adressepunkt.wgs84koordinat.længde))
          .setContent((data.bygningsnavn.length > 0?data.bygningsnavn + "<br>":"") +
                      data.vej.navn + " " + data.husnr + "<br>" + 
                      (data.supplerendebynavn.length > 0?data.supplerendebynavn + "<br>":"") +
                      data.postnummer.nr + " " + data.postnummer.navn )
          .openOn(map);
      }
    });
 	}

  map = L.map('map');
  var osmUrl='http://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png';
  var osmAttrib='Map data &copy; OpenStreetMap contributors';
  var osm = new L.TileLayer(osmUrl, {maxZoom: 18, attribution: osmAttrib}); 
  map.setView(new L.LatLng(55.0014602722233, 14.9985934015052),16);
  map.addLayer(osm);
  //marker= L.marker([55.6983973833368, 12.510857247459]).addTo(map);
  //marker.bindPopup("<b>Rødkildevej 46</b><br>2400 København NV").openPopup();
  //var bounds= L.LatLngBounds( <LatLng[]> latlngs );
  //map.fitBounds( <LatLngBounds> bounds, <fitBounds options> options? );
  // http://leafletjs.com/reference.html#map-fitbounds

  map.on('click', onMapClick);
}

function valider(pnr,vej,husnr,etage,doer) {
  var parametre= {};
  var antal= 0;
  var ptext = $(pnr).val();
  var reg = /(\d{4})/g;
  match = reg.exec(ptext);
  if (match !== null) {
    parametre.postnr= match[1];
    antal++;
  }
  var vtext = $(vej).val();
  if (vtext!==null && vtext.length > 0) {
    parametre.vejnavn= vtext;
    antal++;
  };
  var htext = $(husnr).val();
  if (htext!==null && htext.length > 0) {
    parametre.husnr= htext;
    antal++;
  };
  var etext = $(etage).val();
  if (etext!==null && etext.length > 0) {
    parametre.etage= etext;
    antal++;
  };
  var dtext = $(doer).val();
  if (dtext!==null && dtext.length > 0) {
    parametre.dør= dtext;
    antal++;
  }; 
  if (antal < 3) {    
    $('#ervalideringok').text('Adressen er ikke gyldig') ;
    return;
  }
  $.ajax({
    cache: true,
    url:'adresser/valid.json',
    data: parametre,
    dataType: "json",
    error: function (xhr, status, errorThrown) { 
      $('#ervalideringok').text('Adressen er ikke gyldig') ;
    } ,
    success: function (adresse) {
      $('#ervalideringok').text('Adressen er gyldig') ;
    }
  });
}

$(function () {
	search('#q',null);
  search('#qk','0101');
  searchPostnr('#postnummer');
  $('#vej').focus(function () {
    searchVejnavn('#postnummer','#vej');
  });
  $('#husnummer').focus(function () {
    searchHusnr('#postnummer','#vej','#husnummer');
  });
  $('#etage').focus(function () {
    searchEtage('#postnummer','#vej','#husnummer', '#etage');
  });
  $('#doer').focus(function () {
    searchDør('#postnummer','#vej','#husnummer', '#etage', '#doer');
  });
  $('#valider').click(function () {
    valider('#vpostnummer','#vvej','#vhusnummer', '#vetage', '#vdoer');
  });
	inverseGeocoding();
});