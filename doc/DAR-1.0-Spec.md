Servicebeskrivelse DAR-DAWA Integration
===

Dette dokument beskriver den integrationen mellem DAR og DAWA. Formålet med servicen er
at DAWA kan etablere og vedligeholde en kopi af relevante data fra DAR, med opdateringer i nær-realtid.

Overordnet beskrivelse
----
Integrationen består af 3 dele:

 - DAR leverer dagligt komplette udtræk af data til en FTP-server
 - DAR stiller et opslags-API til rådighed, som udstiller delta-udtræk
 - DAR stiller et WebSockets-baseret API til rådighed, DAR udsender notifikationer om dataændringer.
 
### Teknologivalg
Der anvendes JSON som transportformat. Entiteter formateres som et JSON-objekt uden nestede strukturer.

Udtræk leveres i NDJSON (Newline-Delimited JSON). Der leveres en fil pr. entitet.

Opslags-API'et anvender en simpel HTTP baseret protokol, hvor parametre til API kaldet angives som HTTP query-parametre,
og svaret indeholder et UTF-8-encoded JSON dokument.

Notifikations-API'et anvender websockets, og hver besked er et JSON-objekt. 

Sikkerhed håndteres ved IP-whitelisting. 

### Opdateringsmekanisme
DAWA etablerer en initiel kopi ved at indlæse et komplet udtræk. Herefter åbnes en forbindelse til notifikations-API'et. Når DAWA modtager
oplysninger om nye data hentes de nye rækker fra opslags-APIet, og indlæses i DAWAs lokale kopi.

Derudover foretager DAWA en daglig indlæsning af det komplette udtræk, hvor evt. fejl korrigeres.

## Udtræk
DAR producerer dagligt et komplet udtræk for alle entiter. Udtrækket indeholder den komplette historik. Der leveres en fil pr. udtræk,
og filen navngives med navnet på entiteten og filendelse 'ndjson'. hver række formateres som beskrevet i afsnittet "JSON-repræsentation af records". Udtræksfilerne pakkes sammen i en 
ZIP-fil, hvor filnavnet indeholder tidspunktet for genereringen af udtrækket, og ZIP-filen leveres via SFTP til en
FTP-server, som driftes af DAWA.

## Opslags-API
Opslags-API'et anvender HTTP protokollen. API'et overholder HTTP-standarden i forhold til anvendelse af HTTP statuskoder,
Content-Type headers. Der anvendes altid UTF-8 encoding af response bodies.

Opslags-API'et udstiller funktionalitet til at returnere alle records for en entitet, hvor registreringstart eller registreringslut
er indenfor et tidsinterval som angives af klienten. Såfremt antallet af records overstiger en grænse
som besluttes af DAR benyttes paginering.

Opslags-API'et returnerer JSON. Svaret består af et JSON-objekt, der indeholder:

 * En array af JSON-objekter, der indeholder records. Hver record er formateret som beskrevet i afsnittet "JSON-repræsentation af records"
 * Hvis svaret ikke er komplet angives en pagineringsnøgle, som benyttes til at fremsøge den næste side i svaret.
 
Ved kald til opslags-API'et angiver klienten følgende parametre:
 * registreringfra(krævet): DAR returnerer alle records, hvor registreringstart er senere end eller lig denne værdi
 * registreringtil(krævet): DAR returnerer alle records, hvor registreringslut er før denne værdi
 * entitet (krævet): DAR returnerer records for denne entitet. DAR vælger, om denne parameter indgår i "path"-delen eller som query-parameter)
 * startindeks (valgfri): Angiver pagineringsnøglen som beskrevet ovenfor.
 
Tidspunkter formateres i henhold til ISO standarden med angivelse af timezone.
 
For at kunne implementere en klient korrekt er det afgørende at DAR overholder følgende betingelse: 

 * Et bestemt kald til DAR skal _altid_ returnere det samme svar eller en fejl.
 
For at sikre dette skal DAR:

 * Sikre, at der ikke er igangværende transaktioner med registreringstidspunkt indenfor 
 intervallet når svaret produceres
 * Sikre, at der ikke startes nye transaktioner med registreringstidspunkt indenfor tidsintervallet. Her
 skal der bl.a. tages hensyn til, at registreringtil tidspunktet ikke nødvendigvis er passeret ifølge serverens ur,
 samt at serverens ur ikke stilles tilbage til et tidspunkt før registreringtil hvorefter en transaktion startes.
 
Såfremt DAR ikke øjeblikkeligt er i stand til at honorere ovenstående krav skal DAR
i første omgang forsinke dannelsen af svaret indtil kravene ovenfor er opfyldt. Såfremt ovenstående invarianter ikke kan
honoreres indenfor en rimelig timeout svares tilbage med en fejl.

## Notifikations-API
DAR udstiller et WebSockets-baseret API til levering af notifikationer. 
API'et anvender samme host og port som opslags-API'et, 
ligesom der anvendes samme IP-whitelist til adgangskontrol.

Klientsystemet sender ikke beskeder til DAR. DAR sender en besked til klientsystemet hver gang en transaktion er udført i DAR. Beskeden indeholder følgende:

 * Angivelse af registreringstidspunkt fo transationen
 * En array af navne på entiteter, som er berørt af transaktionen.
 
Beskeder formateres som JSON.

## JSON-repræsentation af records
En record formateres som et JSON-objekt uden nestede strukturer. Objektet indeholder:

 * rowid: Unik ID for den givne række i databasen.
 * registreringstart: Registreringstidspunkt for oprettelse af record
 * registreringslut: Registreringstidspunkt for sletning af record, eller null hvis recorden er åben.
 * virkningstart: Starttidspunkt for virkning, eller null.
 * virkningslut: Sluttidspunkt for virkning eller null.
 * felter: Entitetens feltværdier. Der anvendes en passende JSON-type (number, boolean eller string). Felter uden værdi sættes til null. Timestamps formateres ifølge ISO-standarden med angivelse af timezone.
 
## Medtagne felter
DAR udstiller nedenstående entiteter. Følgende felter medtages altid for alle entiteter:

 * RowKey
 * Id
 * RegistreringFra
 * RegistreringTil
 * VirkningFra
 * VirkningTil
 * Status
 
Følgende felter medtages aldrig:
 
 * Forretningshændelse
 * Forretningsområde
 * Forretningsproces
 * Registreringsaktør
 * Virkningsaktør
 * Bemærkning (?)
 
### Adresse
Medtages:

 * Adressebetegnelse
 * BfeNummer
 * Dørbetegnelse
 * Dørpunkt_id
 * Etagebetegnelse
 * FK_BBR_Bygning_Bygning
 * Husnummer_id
 
Medtages ikke:

 * (Ingen)
 
### AdresseBrugsenhedRelation
Medtages:
 
 * Adresse_id
 * FK_BBR_Brugsenhed_Brugsenhed
 
### AdresseEnhedRelation
Medtages:

 * Adresse_id
 * FK_BBR_Enhed_Enhed
 
### Adressepunkt
Medtages:

 * Oprindelse_Kilde
 * Oprindelse_Nøjagtighedsklasse
 * Oprindelse_Registrering
 * Oprindelse_TekniskStandard
 * Position
 
Medtages ikke:

 * (Ingen)
 
### DARAfstemningsområde
Medtages:

 * Afstemningsområde
 * Afstemningsområdenummer
 * Navn
 
### DARKommuneinddeling
Medtages:

 * Kommuneinddeling
 * Kommunekode
 * Navn
 
Medtages ikke:

 * (Ingen)
 
### DARMenighedsrådsafstemningsområde
Medtages:

 * Mrafstemningsområde
 * Mrafstemningsområdenummer
 * Navn
 
Medtages ikke:

 * (Ingen)
 
### DARSogneinddeling
Medtages:

 * Navn
 * Sogneinddeling
 * Sognekode
 
Medtages ikke:

 * (Ingen)
 
### Husnummer
Medtages:

 * Adgangsadressebetegnelse
 * Adgangspunkt_id
 * BfeNummer
 * DARAfstemningsområde_id
 * DARKommune_id
 * DARMenighedsrådsafstemningsområde_id
 * DARSogneinddeling_id
 * FK_BBR_Bygning_AdgangTilBygning
 * FK_BBR_Opgang_Opgang
 * FK_BBR_TekniskAnlæg_AdgangTilTekniskAnlæg
 * FK_GEODK_Bygning_GeoDanmarkBygning
 * FK_GEODK_Vejmidte_Vejmidte
 * FK_MU_Jordstykke_ForeløbigtPlaceretPåJordstykke
 * FK_MU_Jordstykke_Jordstykke
 * Husnummerretning
 * Husnummertekst
 * NavngivenVej_id
 * Postnummer_id
 * SupplerendeBynavn_id
 * Vejpunkt_id
  
Medtages ikke:

 * Anvendelsesfunktion (udgår)
 * ForeslåetAnvendelsesfunktion (udgår)
 * Etageadgang (udgår)
 

### NavngivenVej
Medtages:

 * AdministreresAfKommune
 * Beskrivelse
 * Retskrivningskontrol
 * UdtaltVejnavn
 * Vejadresseringsnavn
 * Vejnavn
 * Vejnavnebeliggenhed_Oprindelse_Kilde
 * Vejnavnebeliggenhed_Oprindelse_Nøjagtighedsklasse
 * Vejnavnebeliggenhed_Oprindelse_Registrering
 * Vejnavnebeliggenhed_Oprindelse_TekniskStandard
 * Vejnavnebeliggenhed_Vejnavnelinje
 * Vejnavnebeliggenhed_Vejnavneområde
 * Vejnavnebeliggenhed_Vejtilslutningspunkter
 
Medtages ikke:

 * (ingen)

### NavngivenVejKommunedel
Medtages:
 * Kommune
 * NavngivenVej_id
 * Vejkode
 
Medtages ikke:

 * (ingen)
 
### NavngivenVejPostnummerRelation
Medtages:

 * NavngivenVej_id
 * Postnummer_id
 
Medtages ikke:

 * (ingen)
 
### NavngivenVejSupplerendeBynavnRelation
Medtages:

 * NavngivenVej_id
 * SupplerendeBynavn_id
 
Medtages ikke:

 * (ingen)
 
### Postnummer
Medtages: 

 * Navn
 * Postnr
 * Postnummerinddeling
 
Medtages ikke:

 * (Ingen)
 
### ReserveretVejnavn
Medtages:

 * Navneområde
 * ReservationUdløbsdato
 * ReserveretAfKommune
 * ReserveretNavn
 * ReserveretUdtaltNavn
 * ReserveretVejadresseringsNavn
 * Retskrivningskontrol
 
Medtages ikke:

 * (Ingen)
 
### SupplerendeBynavn
Medtages:

 * Navn
 * SupplerendeBynavn1

Medtages ikke:

 * (Ingen)
 
### Ikke medtagne entiteter

 * Adresseopgave
 * Adresseopgavegenstand
 * AdresseopgavegenstandAdresseRelation
 * AdresseopgavegenstandNavngivenVejRelation
 * AdresseopgavegenstandSupplerendeBynavnRelation
 * Gadepostnummertilhør
 * HusnummerIntervalReservation
 
### Uafklarede entiteter
Følgende entiter er det endnu ikke afklaret om medtages, 
idet det endnu ikke er besluttet hvordan entiteten anvendes.

 * HusnummerAnvendelse

