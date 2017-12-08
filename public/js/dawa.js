"use strict";

import 'bootstrap/scss/bootstrap.scss';
import 'leaflet/dist/leaflet.css';
import '../css/style.css';
import '../scss/dawa.scss';
import '../scss/forside.scss';
import '../css/autocomplete.css';
import 'jquery-ui-dist/jquery-ui.min.css';

import L from 'leaflet';
import $ from 'jquery';
import 'bootstrap/js/src/index';
import 'jquery-ui-dist/jquery-ui.min';
import {dawaAutocomplete} from 'dawa-autocomplete2';

const apiBase = '/';

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
        items.push(postnr.nr + " " + postnr.navn);
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
  var ptext = $(pnr).val();
  var reg = /(\d{4})/g;
  var match = reg.exec(ptext);
  if (match === null) { return; }
  var parametre= {postnr: match[1]};
  $.ajax({
    url: apiBase + 'vejnavne',
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
  var match = reg.exec(ptext);
  if (match === null) { return; }
  var vtext = $(vej).val();
  if (vtext===null || vtext.length === 0) { return; }
  var parametre= {postnr: match[1], vejnavn: vtext};
  $.ajax({
    cache: true,
    url: apiBase + 'adresser',
    data: parametre,
    dataType: "json",
    error: function (xhr, status, errorThrown) {
      var text= xhr.status + " " + xhr.statusText + " " + status + " " + errorThrown;
      alert(text);
    } ,
    success: function (adresser) {
      var husnumre= [];
      $.each(adresser, function (i, adresse) {
        if (husnumre.indexOf(adresse.adgangsadresse.husnr) === -1) { husnumre.push(adresse.adgangsadresse.husnr); }
      });
      husnumre= husnumre.sort(function(a,b) {
                              var husnrreg= /(\d+)([A-Z]*)/gi;
                              var ma= husnrreg.exec(a);
                              husnrreg.lastIndex= 0;
                              var mb= husnrreg.exec(b);
                              if (ma === null || mb === null) { return 0; }
                              var ahusnr= ma[1];
                              var bhusnr= mb[1];
                              var abok= (ma[2] === '')?' ':ma[2];
                              var bbok= (mb[2] === '')?' ':mb[2];
                              return (ahusnr !== bhusnr)?(parseInt(ahusnr, 10) - parseInt(bhusnr, 10)):abok.localeCompare(bbok);
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
  var match = reg.exec(ptext);
  if (match === null) { return; }
  var vtext = $(vej).val();
  if (vtext===null || vtext.length === 0) { return; }
  var htext = $(husnr).val();
  if (htext===null || htext.length === 0) { return; }
  var parametre= {postnr: match[1], vejnavn: vtext, husnr: htext};
  $.ajax({
    cache: true,
    url: apiBase + 'adresser',
    data: parametre,
    dataType: "json",
    error: function (xhr, status, errorThrown) {
      var text= xhr.status + " " + xhr.statusText + " " + status + " " + errorThrown;
      alert(text);
    } ,
    success: function (adresser) {
      var etager= [];
      $.each(adresser, function (i, adresse) {
        var etage = adresse.etage || "";
        if (etage !== null && etager.indexOf(etage) === -1) { etager.push(etage); }
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
  var match = reg.exec(ptext);
  if (match === null) { return; }
  var vtext = $(vej).val();
  if (vtext===null || vtext.length === 0) return;
  var htext = $(husnr).val();
  if (htext===null || htext.length === 0) return;
  var etext = $(etage).val() || '';
  var parametre= {postnr: match[1], vejnavn: vtext, husnr: htext, etage: etext};
  $.ajax({
    cache: true,
    url:apiBase + 'adresser',
    data: parametre,
    dataType: "json",
    error: function (xhr, status, errorThrown) {
      var text= xhr.status + " " + xhr.statusText + " " + status + " " + errorThrown;
      alert(text);
    } ,
    success: function (adresser) {
      var dører= [];
      $.each(adresser, function (i, adresse) {
        var dør = adresse.dør === null ? "" : adresse.dør;
        if (dører.indexOf(dør) === -1) dører.push(dør);
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

  function onMapClick(e) {
    var url = "/adgangsadresser/reverse?x=" + e.latlng.lng.toString() + "&y=" + e.latlng.lat.toString();
    $.ajax({
      url: url,
      dataType: "jsonp",
      success: function(data) {
        var popup = L.popup();
        popup
          .setLatLng(new L.LatLng(data.adgangspunkt.koordinater[1], data.adgangspunkt.koordinater[0]))
          .setContent(data.vejstykke.navn + " " + data.husnr + "<br>" +
                      (data.supplerendebynavn ? data.supplerendebynavn + "<br>":"") +
                      data.postnummer.nr + " " + data.postnummer.navn )
          .openOn(map);
      }
    });
 	}

  var protocol  = ("https:" == document.location.protocol) ?
  "https" : "http";
  map = L.map('map');
  var osmUrl=protocol + '://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png';
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

export function initForside() {
  $(function () {
    function errorHandler(query) {
      return function(xhr, status, error) {
        $(query).text('(Fejl - ' + xhr.status + " " + xhr.statusText + " " + status + " " + error + ")");
      };
    }
    dawaAutocomplete(document.getElementById("autocomplete-adresse"), {
      baseUrl: '',
      select: (data) => {
        $('#autocomplete-adresse-choice').text(data.tekst);
      }
    });
    dawaAutocomplete(document.getElementById('autocomplete-adgangsadresse'), {
      adgangsadresserOnly: true,
      baseUrl: '',
      select: function(data) {
        $('#autocomplete-adgangsadresse-choice').text(data.tekst);
      }
    });
    dawaAutocomplete(document.getElementById('autocomplete-adresse-kbh'), {
      params: {
        kommunekode: "101"
      },
      baseUrl: '',
      select: function(data) {
        $('#autocomplete-adresse-kbh-choice').text(data.tekst);
      }
    });
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
    inverseGeocoding();
  });
}

export function activateScrollspy(target) {
  $('body').scrollspy({target});
}
