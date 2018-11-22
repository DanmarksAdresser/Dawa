#Dataindlæsning

Data der udstilles på DAWA stammer fra flere forskellige kilder.

 - Adressedataene: adresser, adgangsasdresser og vejstykker leveres af BBR. Adressernes postnummer og supplerende bynavn stammer dog fra CPR.
 - Postnumre og stormodtageradresser leveres af Postdanmark i et regneark.
 - Ejerlav stammer fra [ejerlavsfortegnelsen](http://www.gst.dk/emner/matrikel-ejendomsdannelse/matrikelregister/ejerlavsfortegnelse/), som leverer
 dem i et regneark.
 - DAGI temaer stammer fra Geodatastyrelsens [kortforsyning](http://www.kortforsyningen.dk/) som udstiller dem med en WFS service

## Adressedata
Adressedata leveres af BBR. Der leveres daglige udtræk i CSV-format via FTP, samt løbende hændelser, som leveres i
JSON-format over HTTP, hvor BBR agerer klient og DAWA agerer server.

### BBR-grænseflade - udtræk
BBR leverer udtrækkene i en ZIP'et fil, som er tilgængelig på en FTP-server. Filnavnet indeholder datoen for udtrækket.
ZIP-filen indeholder 7 filer med hhv. enhedsadresser, adgangsadresser, vejstykker, postnumre, postnummertilknytninger,
supplerendebynavne samt
metadata. DAWA anvender ikke postnumrene og de supplerende bynavne, idet postnumrene leveres af Postdanmark, og de
supplerende bynavne leveres som en del af adgangsadresserne. Disse filer er derfor ikke dokumenteret herunder.

CSV-filerne leveres i UTF-8 format, og de indeholder en [byte order mark](http://en.wikipedia.org/wiki/Byte_order_mark).
Alle tidspunkter i BBRs adressedata er lokale tidspunkter, og sendes uden UTC-offset. Tidspunkterne er angivet i "Dansk tid",
dvs. UTC-offset +01:00 eller +02:00 alt efter om der er tale om normal- eller sommertid.

#### Filnavne
ZIP-filen med adresseudtræk har navnet `T_YYYYMMDD_Adgangsadresse.zip`, hvor YYYYMMDD angiver datoen for udtrækket. Zip-filen indeholder
følgende filer:

 - `T_YYYYMMDD_Adgangsadresse.CSV`
 - `T_YYYYMMDD_Enhedsadresse.CSV`
 - `T_YYYYMMDD_Vejnavn.CSV`
 - `T_YYYYMMDD_Postnummer.CSV`
 - `T_YYYYMMDD_Postnummertilknytning.CSV`
 - `T_YYYYMMDD_Supplerendebynavn.CSV`
 - `T_YYYYMMDD_SenesteHaendelse.CSV`

#### Vejstykker
Vejstykker leveres i følgende format:

    "kommunekode";"vejkode";"navn";"adresseringsnavn";"oprettet";"aendret"
    "101";"112";"Amagerfælledvej";"Amagerfælledvej";"2010-01-17T11:17:27.567";"2010-01-17T11:17:27.567"
    "101";"116";"Amagergade";"Amagergade";"2010-01-17T11:17:27.567";"2010-01-17T11:17:27.567"
    "101";"118";"Amager Helgoland";"Amager Helgoland";"2010-01-17T11:17:27.580";"2010-01-17T11:17:27.580"
    "101";"119";"Amagermotorvejen";"Amagermotorvejen";"2010-01-17T11:17:27.580";"2010-01-17T11:17:27.580"
    "101";"120";"Amager Strandvej";"Amager Strandvej";"2010-01-17T11:17:27.580";"2010-01-17T11:17:27.580"

Udtrækket inkluderer særlige vejkoder, som ikke referer til veje. Det gælder alle vejkoder større end 9900.

#### Adgangsadresser
Adgangsadresser leveres i følgende format:

    "id";"vejkode";"husnummer";"kommunekode";"landsejerlav_kode";"landsejerlav_navn";"matrikelnr";"esrejendomsnr";"postnummer";"postdistrikt";"supplerendebynavn";"objekttype";"oprettet";"aendret";"ikrafttraedelsesdato";"adgangspunkt_id";"adgangspunkt_kilde";"adgangspunkt_noejagtighedsklasse";"adgangspunkt_tekniskstandard";"adgangspunkt_retning";"adgangspunkt_placering";"adgangspunkt_revisionsdato";"adgangspunkt_etrs89koordinat_oest";"adgangspunkt_etrs89koordinat_nord";"adgangspunkt_wgs84koordinat_bredde";"adgangspunkt_wgs84koordinat_laengde";"adgangspunkt_DDKN_m100";"adgangspunkt_DDKN_km1";"adgangspunkt_DDKN_km10"
    "0a3f508b-3b95-32b8-e044-0003ba298018";"1957";"15";"580";"1530257";"KRUSÅ, BOV";"380";"2530";"6340";"Kruså";null;"1";"2000-02-05T17:55:51.000";"2009-11-24T03:15:25.000";"2000-02-05T00:00:00.000";"0a3f508b-3b95-32b8-e044-0003ba298018";"5";"A";"TN";"295.88";"5";"2009-11-06T00:00:00.000";"526291.43";"6077716.50";"54.8458653803882";"9.40943879872583";"100m_60777_5262";"1km_6077_526";"10km_607_52"
    "0a3f508b-3b96-32b8-e044-0003ba298018";"1957";"17";"580";"1530257";"KRUSÅ, BOV";"379";"2531";"6340";"Kruså";null;"1";"2000-02-05T17:55:51.000";"2009-11-24T03:15:25.000";"2000-02-05T00:00:00.000";"0a3f508b-3b96-32b8-e044-0003ba298018";"5";"A";"TN";"171.61";"5";"2009-11-06T00:00:00.000";"526278.56";"6077695.24";"54.8456750046459";"9.40923644532175";"100m_60776_5262";"1km_6077_526";"10km_607_52"
    "0a3f508b-3b97-32b8-e044-0003ba298018";"1958";"1";"580";"1530253";"FRØSLEV, BOV";"1072";"2532";"6330";"Padborg";null;"1";"2000-02-05T17:55:51.000";"2009-11-24T03:15:25.000";"2000-02-05T00:00:00.000";"0a3f508b-3b97-32b8-e044-0003ba298018";"5";"A";"TN";"203.51";"5";"2009-11-06T00:00:00.000";"522808.86";"6074375.33";"54.8160106996165";"9.35494217775883";"100m_60743_5228";"1km_6074_522";"10km_607_52"
    "0a3f508b-3b98-32b8-e044-0003ba298018";"1958";"2";"580";"1530253";"FRØSLEV, BOV";"1065";"2533";"6330";"Padborg";null;"1";"2000-02-05T17:55:51.000";"2009-11-24T03:15:25.000";"2000-02-05T00:00:00.000";"0a3f508b-3b98-32b8-e044-0003ba298018";"5";"A";"TN";"203.70";"5";"2009-11-06T00:00:00.000";"522828.73";"6074422.71";"54.816435576544";"9.35525511634782";"100m_60744_5228";"1km_6074_522";"10km_607_52"
    "0a3f508b-3b99-32b8-e044-0003ba298018";"1958";"3";"580";"1530253";"FRØSLEV, BOV";"1071";"2543";"6330";"Padborg";null;"1";"2000-02-05T17:55:51.000";"2009-11-24T03:15:25.000";"2000-02-05T00:00:00.000";"0a3f508b-3b99-32b8-e044-0003ba298018";"5";"A";"TN";"205.93";"5";"2009-11-06T00:00:00.000";"522783.23";"6074377.02";"54.8160270523651";"9.35454347565582";"100m_60743_5227";"1km_6074_522";"10km_607_52"

DAWA anvender ikke landsejerlav_navn, da der anvendes de officielle navne fra landsejerlavregisteret i stedet. Feltet
postdistrikt anvendes heller ikke, da postdistrikters navne leveres af Post Danmark.

Desuden anvender DAWA ikke WGS84-koordinaterne, da disse beregnes ud fra ETRS89-koordinaterne i stedet.
Årsagen hertil er, at WGS84-koordinaterne ændrer sig over tid.

#### Enhedsadresser
Enhedsadresser leveres i følgende format:

    "id";"adgangsadresseid";"etage";"doer";"objekttype";"oprettet";"aendret";"ikrafttraedelsesdato"
    "0a3f50b6-3cc5-32b8-e044-0003ba298018";"0a3f508b-1d3b-32b8-e044-0003ba298018";"";"";"1";"2000-02-05T17:54:37.000";"2000-02-16T21:56:10.000";"2000-02-05T00:00:00.000"
    "0a3f50b6-3cd5-32b8-e044-0003ba298018";"0a3f508b-1d4d-32b8-e044-0003ba298018";"";"";"1";"2000-02-05T17:54:37.000";"2000-02-16T21:56:10.000";"2000-02-05T00:00:00.000"
    "0a3f50b6-3cd6-32b8-e044-0003ba298018";"0a3f508b-1d4e-32b8-e044-0003ba298018";"ST";"TH";"1";"2000-02-05T17:54:37.000";"2000-02-16T21:56:10.000";"2000-02-05T00:00:00.000"
    "0a3f50b6-3cd7-32b8-e044-0003ba298018";"0a3f508b-1d4e-32b8-e044-0003ba298018";"ST";"TV";"1";"2000-02-05T17:54:37.000";"2000-02-16T21:56:10.000";"2000-02-05T00:00:00.000"
    "0a3f50b6-3cd8-32b8-e044-0003ba298018";"0a3f508b-1d4e-32b8-e044-0003ba298018";"1";"";"1";"2000-02-05T17:54:37.000";"2000-02-16T21:56:10.000";"2000-02-05T00:00:00.000"

Der skal altid være tilknyttet en enhedsadresse til en adgangsadresse.

#### Metadata
Metadata leveres i følgende format:
    "navn";"endpoint";"totalSendteHaendelser";"sidstSendtHaendelsesNummer";"aendret"
    "AWS4";"http://bbrfacade-p1.dawa.aws.dk/haendelse";"22710";"49320";"2014-08-08T16:04:40.217"

Herfra anvender vi alene feltet "totalSendteHaendelser", som angiver hvor mange hændelser BBR har dannet på tidspunktet
for udtrækkets dannelse. Hermed har DAWA mulighed for at konstatere hvilke hændelser der er hændt forud for udtrækket,
og som derfor ikke skal processeres efter indlæsning af udtrækket. Bemærk, at hændelser at første hændelse har
sekvensnummer 0.

### BBR-grænseflade - hændelser
Ændringer til adressedata leveres som hændelser. Hændelser leveres i JSON-format over HTTP, hvor BBR agerer klient
og DAWA agerer server. Det er altså BBR der kalder AWS4 for at levere disse hændelser (en "push"-mekanisme).
Der er ingen autentifikation, men HTTP-endpointet beskyttes med IP-adressefiltrering.

BBR laver ét HTTP POST kald til DAWA pr. hændelse. Body i kaldet er selve hændelsen i JSON-format. Kaldet indeholder
desuden korrekt MIME-type i Content-Type headeren.

DAWA svarer med HTTP status kode 200 hvis hændelsen modtages successfuldt og fejlkode 500 hvis DAWA ikke kan modtage
hændelsen. BBR gensender alle hændelser indtil de kan modtages. BBR sender hændelser i korrekt rækkefølge.

BBR sender fem forskellige typer af hændelser. Disse kan inddeles i to kategorier. Hændelsestyperne 'vejnavn',
'adgangsadresse' og 'enhedsadresse' sendes ved oprettelse, opdatering eller nedlæggelse. Hændelsestyperne 'postnummer'
og 'supplerendebynavn' sendes, når adgangsadresser ændrer postnummer eller supplerende bynavn - her sendes en
'adgangsadresse'-hændelse ikke.

Når en eller flere adgangsadresser på et vejstykke ændrer postnummer eller supplerende bynavn sendes 'postnummer' og
'supplerendebynavn'-hændelser for alle adresserne på den pågældende vej. Hændelserne sendes i et format, der ligger tæt
 op ad det format som BBR selv har modtaget disse ændringer fra CPR.

I CPR er husnumrene på en vej inddelt i intervaller, og hvert interval har tilknyttet et postnummer og (optionelt)
et supplerende bynavn. Intervallerne har altid angivet en side, som er lige eller ulige. Siden er angivet på
hændelsesniveau, dvs. at hvis adresser på begge sider af en vej har ændret sig, så vil det resultere i to hændelser
(en for hver side).

 En postnummer- eller supplerendebynavnhændelse indeholder postnummeret hhv. det supplerende bynavn for alle adresser
 på den angivne side af den angivne vej. Dette sker i form af en liste af husnummerintervaller, hvor der for hvert
 interval er angivet et postnummer hhv. supplerende bynavn for adresserne i intervallet. Adresser på vejsiden der ikke
 er tilknyttet nogen af intervallerne i hændelsen har ikke noget defineret postnummer hhv. supplerende bynavn.

 Postnummer- og supplerendebynavnhændelser er ikke nær-realtime, da de dannes af BBR ud fra et udtræk fra CPR, som
 hentes én gang i døgnet.

 Alle tidspunkter i adressedata i hændelserne er angivet MED UTC-offset. Dette UTC-offset er dannet ved at BBR fortolker
  det et lokalt tidspunkt i "dansk tid". Da der reelt er tale om lokale tidspunkter ignorerer DAWA UTC-offsettet.

 Alle hændelser indeholder følgende felter:

  - type: Hændelsestypen
  - sekvensnummer: Hændelsens globale unikke, fortløbende sekvensnummer
  - lokaltSekvensnummer: Sekvensnummeret for hændelser af den pågældende type
  - tidspunkt: Tidspunkt hvor hændelsen blev dannet af BBR
  - data: Specifikke data for den pågældende hændelsestype.

Er der tale om hændelsestyperne 'adgangsadresse', 'enhedsadresse' og 'vejnavn' indeholder hændelsen desuden feltet
aendringstype, som angiver om der er tale om en oprettelse, ændring eller nedlæggelse.


 #### Adgangsadresse
 En adgangsadressehændelse indeholder følgende:

    {
      "aendringstype": "aendring",
      "type": "adgangsadresse",
      "sekvensnummer": 2977,
      "lokaltSekvensnummer": 1382,
      "tidspunkt": "2014-07-07T01:00:58.583+02:00",
      "data": {
        "id": "981d2a9f-1ab6-441f-936e-c51a2be03715",
        "vejkode": 5799,
        "husnummer": "001",
        "kommunekode": 661,
        "landsejerlav_kode": 1220257,
        "landsejerlav_navn": "DEN MELLEMSTE DEL, BORBJERG",
        "matrikelnr": "16h",
        "esrejendomsnr": "53879",
        "postnummer": 7500,
        "postdistrikt": "Holstebro",
        "supplerendebynavn": "Skave",
        "objekttype": 1,
        "oprettet": "2014-07-03T08:04:43.823+02:00",
        "ikrafttraedelsesdato": "2014-07-03T00:00:00+02:00",
        "aendret": "2014-07-07T01:00:48.29+02:00",
        "adgangspunkt_id": "e57e3ede-b420-4556-8191-d11662981e21",
        "adgangspunkt_kilde": 4,
        "adgangspunkt_noejagtighedsklasse": "A",
        "adgangspunkt_tekniskstandard": "TK",
        "adgangspunkt_retning": 299.36,
        "adgangspunkt_placering": "5",
        "adgangspunkt_revisionsdato": "2014-07-04T23:59:00+02:00",
        "adgangspunkt_etrs89koordinat_oest": 485006.3,
        "adgangspunkt_etrs89koordinat_nord": 6247691.49,
        "adgangspunkt_wgs84koordinat_bredde": 56.3736316282388,
        "adgangspunkt_wgs84koordinat_laengde": 8.75724485730878,
        "adgangspunkt_DDKN_m100": "100m_62476_4850",
        "adgangspunkt_DDKN_km1": "1km_6247_485",
        "adgangspunkt_DDKN_km10": "10km_624_48"
      }
    }

Bemærk, at der ikke sendes adgangsadressehændelser ved ændring af en adgangsadresses postnummer eller supplerende bynavn.

#### Enhedsadresse
En enhedsadressehændelse indeholder følgende:

    {
      "aendringstype": "nedlaeggelse",
      "type": "enhedsadresse",
      "sekvensnummer": 2991,
      "lokaltSekvensnummer": 308,
      "tidspunkt": "2014-07-07T08:35:44.473+02:00",
      "data": {
        "id": "0a3f50a9-8f50-32b8-e044-0003ba298018",
        "adgangsadresseid": "0a3f507f-e572-32b8-e044-0003ba298018",
        "etage": "ST",
        "doer": "TH",
        "objekttype": 1,
        "oprettet": "2003-10-28T10:57:58+02:00",
        "aendret": "2003-10-28T10:57:58+02:00",
        "ikrafttraedelsesdato": "2003-10-28T00:00:00+02:00"
      }
    }

#### Vejnavn
En vejnavnhændelse indeholder følgende:

    {
      "aendringstype": "oprettelse",
      "type": "vejnavn",
      "sekvensnummer": 4277,
      "lokaltSekvensnummer": 22,
      "tidspunkt": "2014-07-08T04:47:10.727+02:00",
      "data": {
        "kommunekode": 707,
        "vejkode": 9903,
        "navn": "Skakkes Holm Bådplads",
        "adresseringsnavn": "Skakkes Holm Bådpl",
        "aendret": "2014-07-08T04:47:10.203+02:00",
        "oprettet": "2014-07-08T04:47:10.203+02:00"
      }
    }

Bemærk, at vejnavnhændelser korresponderer til "vejstykker" i DAWA.

### Indlæsning af adressedata
Indlæsning af data sker på tre forskellige måder.

####Initiel indlæsning af udtræk
Initiel indlæsning af data sker, når databasen populeres med data for første gang. Ved initiel indlæsning gemmes
sekvensnummeret angivet i udtrækket i databasen, så systemet kan undgå at processere hændelser som blev dannet før
udtrækket.

Programmet `load-adresse-data.js` anvendes til at indlæse et initielt udtræk i databasen.

#### Hændelsesindlæsning
Hændelsesindlæsning sker løbende, når hændelser modtages fra BBR. Der dannes historik over ændringerne i DAWAs database.

Hændelserne modtages af en særlig service (`bbrFacade.js`), som blot persisterer hændelserne i Amazons DynamoDB. DAWA indlæser
herefter hændelserne fra DynamoDB og udfører hændelserne mod databasen.

Programmet `eventImporter/main.js` anvendes til at indlæse hændelser fra DynamoDB i databasen.

#### Korrigerende indlæsning af udtræk
Korrigerende indlæsning af udtræk sker dagligt, hvor databasens indhold sammenlignes
 med indholdet i udtrækket. Er der forskelle foretages en korrektion af data i databasen, således indholdet stemmer
 overens med udtrækket. Denne proces håndterer, at der kan være udført hændelser på databasen *efter* udtrækket blev
 dannet af BBR - i så fald foretages sammenligningen med historiske data for det tidspunkt, hvor udtrækket blev dannet.
 Hændelsessekvensnummeret, som er angivet i udtrækket, anvendes til at afgøre hvilke hændelser der er inkluderet i
 udtrækket. Der dannes også historik i DAWAs database når der indlæses korrigerende udtræk.

 Programmet `divergens.js` anvendes til at udføre korrigerende indlæsning af udtræk. Programmet producerer desuden en
  rapport over hvilke uoverensstemmelser der kunne konstateres, så der kan følges op på årsagen til disse.

## Indlæsning af postnumre
Postnumre modtages fra Postdanmark i et regneark. Dette regneark er konverteret til CSV. CSV-filen vedligeholdes manuelt,
da det er meget sjældent der sker ændringer til postnumre i Danmark. Ved indlæsning og opdatering af postnumre i DAWA
føres der historik.

Information om hvilke adgangsadresser der tilknyttet de særlige stormodtagerpostnumre er defineret
i en særskilt CSV-fil, som også vedligeholdes manuelt. Der føres IKKE historik over disse tilknytninger.

Programmet `updatePostnumre.js` anvendes til indlæsning og opdatering af listen af postnumre i databasen, og postnumrene er gemt i filen `data/postnumre.csv`.

Programmet `loadStormodtagere.js` anvendes til indlæse fortegnelsen over hvilke adgangsadresser der er tilknyttet hvert
stormodtagerpostnummer. Denne liste er gemt i filen `data/stormodtagere.csv`.

## Indlæsning af ejerlav
Ejerlav leveres i regneark, og dette regneark er processeret og gemt i en CSV-fil, som skal vedligeholdes manuelt. Der
føres historik over ændringer i ejerlavene.

Programmet `updateEjerlav.js` anvendes til indlæsning og opdatering af ejerlavsfortegnelsen. Ejerlavene er gemt i filen
`data/ejerlav.csv`. Programmet `processEjerlavCsv.js` kan anvendes til at processere den rå ejerlavsfortegnelse til
en CSV-fil, som kan indlæses med `updateEjerlav.js`.

## Indlæsning af DAGI-temaer
DAGI-temaerne leveres af Geodatastyrelsens kortforsyning via en WFS service. Indlæsning foregår i to trin. Først hentes DAGI-temaerne og gemmes
på disk. Herefter indlæses de i databasen. Der føres ikke historik på DAGI-temaerne, men der har været forespørgsler på
dette, så det er muligt det implementeres i en fremtidig version.

Tilknytningen af adresser til DAGI temaer foretages ved indlæsning af DAGI-temaerne. For kommuner og postnumre gælder,
at tilknytningen er baseret på adgangsadressens kommunekode hhv. postnummer. For alle andre DAGI temaer sker tilknytningen
geografisk, dvs. en adresse er tilknyttet de DAGI temaer, som adressen er geografisk placeret på. Enkelte adresser er uden
adgangspunkt eller har angivet et forkert adgangspunkt. Sådanne adresser kan have angivet ingen eller forkerte
tilknyttede DAGI-temaer.

Det er p.t. servicen `http://kortforsyningen.kms.dk/service?servicename=dagi_gml2` der anvendes som kilde til DAGI-temaer,
men der forventes at skifte til servicen `http://kortforsyningen.kms.dk/DAGI_SINGLEGEOM_GML2` i den nærmeste fremtid.
Denne service er dog endnu ikke helt klar til brug.

Programmet `download-dagi.js` anvendes til at downloade DAGI-temaerne fra WFS-servicen. Programmet `dagi-to-db.js` anvendes
til at indlæse og opdatere DAGI-temaerne i databasen. Beregningen af hvilke DAGI-temaer som adgangsadresserne er
tilknyttet udføres af triggers i databasen.