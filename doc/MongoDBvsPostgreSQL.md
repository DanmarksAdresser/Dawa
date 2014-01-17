
Work-in-progress...

# MongoDB vs. PostgreSQL

En prototype på Dawa er blevet udviklet mod MongoDB med succes.  I
forbindels med at viderudvikle prototypen frem mod egentlig
produktion, er der

I det følgende diskuteres fordele og ulemper ved, at skifte databasen
laget i Dawa fra MongoDB til en PostgreSQL.

## Konklusion
PostgreSQL er det bedste match for de behov Dawa har.

Det springende punkt er at PostgreSQL er velegnet til normaliserede
data og har transktioner.  Begge dele giver store fordele for systemer
med komlekse data og brugsscenarier som udvikler sig.  Det som mistes
ved PostgreSQL er simplicitet.  PostgreSQL er mere kompleks at bruge,
og kan kræve mere opsætning for at sikre performance og vertikal
skalering.

TODO mere argumentation.


## Dawa og Kontekst

Dawa en en del af det offentliges strategi om åbne grunddata.  Åbne
grunddata vil gøre processer og kommunikation i det offentlige mere
effektiv, men er også fundamentet som muligøre innovation både i det
offentlige, og blandt private borgere og virksomheder.

Dawa giver en tidlig start for det nye adresseformat.  Derved kan
effektiviseringer i det offentlige rykkes frem, og muligheder for
innovation kan skabes tidligt.

Adressedata i Dawa er statiske (i database forstand).  Der er i
omegnen af 30000 adresse opdateringer om året (< 4 opdateringer per
time).

GIS er et vigtigt delelement for Dawa.


## Normaliserede adressedata eller ej

I forhold til valg af database teknologi, er et vigtigt aspekt, om
data skal gemmes normaliseret eller denormaliseret.

Hvis brugsscenarier er kendte, giver denormaliserede data mere simple
adgang til data, da denormaliserede data kan tilrettelægges efter
behov.  Denormaliserede data kan også læses mere effektivt, da opslag
kan reduceres til key-value opslag, i stedet for joins mellem
tabeller.

Normaliserede data giver mulighed for en bred vifte af forskellige
søgninger, og er dermed velegnet hvor brugsscenarier ikke er helt
fastlagte.  Desuden er nemt at gå fra normaliseret til denormaliseret
data' (men ikke omvendt), og dermed er det relativt nemt at lave
denormaliserede data caches, hvor normaliserede søgninger ikke er
effektive nok.

### Strategi for Datamodel i Dawa

I Dawa kendes en mængde brugsscenarier allerede, men i takt med at
Dawa gøres offentligt tilgængeligt, vil nye brugsmønstre opstå i takt
med innovation med grunddata.  I det lys vil det være en fordel at
Dawa benytter en normaliseret datamodel, for at bevarer størst mulig
fleksibilitet.


## MongoDB vs. PostgreSQL

##### MongoDB

  - Key-value store
  - Vertikal læse-skalering
  - GIS
  - Prototype af Dawa bygger allerede på MongoDB
  - Nem at gå til for udviklere
  - Ingen transaktioner (ikke velegnet til normaliserede data)

##### PostgreSQL

  - Relationel database
  - Vertikal læse-skalering understøttes (men p.t. ikke af Amazon)
  - Transaktioner (velegnet til normaliserede data)
  - Avanceret GIS (WMF/WFS benytter PostGIS)
  - Moden teknologi
  - Dawa prototype kan genbruges i mindre grad

## Konkrete PostgreSQL undersøgelser

Over en lille uge er der lavet en række proof-of-concepts (POC) med
PostgreSQL.

### Node.js integration

De konkrete POCs beskrevet efterfølgende har vist at Node
integrationen mod PostgreSQL er god.

### Streaming af adresser

Der er implementeret en adresse søgning, som kan hente alle adresser
inden for et givet postnummer, samt alle adresse for hele landet.

Resultaterne bliver streamet, og performance er på niveau med samme
søgning mod MongoDB.  En manuelt test viste at alle AWS3 adresser kan
hentes på under 5 minutter (resulterer i en data fil på 1.8 GB).

### Autocompletion og fritekst søgning



### Polygon søgning
### Vurdering af udviklingsomkostninger

