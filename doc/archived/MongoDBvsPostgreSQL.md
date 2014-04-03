
# MongoDB vs. PostgreSQL

En prototype på Dawa er blevet udviklet mod MongoDB med succes.  I
forbindelse med at videreudvikle prototypen frem mod egentlig
produktion, er der

I det følgende diskuteres fordele og ulemper ved, at skifte databasen
laget i Dawa fra MongoDB til en PostgreSQL.

## Konklusion
PostgreSQL er det bedste match for de behov Dawa har.

Det springende punkt er at PostgreSQL er velegnet til normaliserede
data og har transaktioner  Begge dele giver store fordele for systemer
med komplekse data og brugsscenarier som udvikler sig.  Det som mistes
ved PostgreSQL er simplicitet.  PostgreSQL er mere kompleks at bruge,
og kan kræve mere opsætning for at sikre performance og horisontal
skalering.


## Dawa og Kontekst

Dawa en en del af det offentliges strategi om åbne grunddata.  Åbne
grunddata vil gøre processer og kommunikation i det offentlige, og med
det private erhvervsliv mere effektiv, men er også fundamentet som
muligøre innovation både i det offentlige, og blandt private borgere
og virksomheder.

Dawa giver en tidlig start for det nye adresseformat.  Derved kan
effektiviseringer rykkes frem, og muligheder for innovation kan skabes
tidligt.

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
  - Horisontal læse-skalering
  - GIS
  - Prototype af Dawa bygger allerede på MongoDB
  - Nem at gå til for udviklere
  - Ingen transaktioner (ikke velegnet til normaliserede data)

##### PostgreSQL

  - Relationel database
  - Horisontal læse-skalering understøttes (men p.t. ikke af Amazon)
  - Transaktioner (velegnet til normaliserede data)
  - Avanceret GIS (WMF/WFS benytter PostGIS)
  - Moden teknologi
  - Dawa prototype kan genbruges i mindre grad
  - (Relationelle database, der i blandt PostgreSQL, kan have det
    svært med systemer med mange skrive operationer. Dette dette dog er
    ikke tilfældet for Dawa, som primært skal servicere læsninger)


(Personlig kommentar, Peter Mechlenborg.  Transaktioner er et meget
kraftfuldt værktøj.  Hvis der er behov for høj grad af konsistens i data
(som Dawa har brug for), skal men ikke undervurdere det ekstra arbejde
som kommer, hvis ens database ikke understøtter transaktioner).


## Konkrete PostgreSQL undersøgelser

Over en lille uge er der lavet en række proof-of-concepts (POC) med
PostgreSQL.  Formålet har været at vurderer om PostgreSQL har levet op
til kravene på en række forskellige områder.

### Node.js integration

De konkrete POCs beskrevet efterfølgende har vist at Node
integrationen mod PostgreSQL er god.

### Streaming af adresser

Der er implementeret en adresse søgning, som kan hente alle adresser
inden for et givet postnummer, samt alle adresse for hele landet.

Resultaterne bliver streamet, og performance er på niveau med samme
søgning mod MongoDB.  En manuelt test viste at alle AWS3 adresser kan
hentes på under 5 minutter (resulterer i en data fil på 1.8 GB).

Søgninger efter alle adresser indenfor et givet postnummer performer
godt.

### Autocompletion og fritekst søgning

Det er muligt at lave avanceret tekstsøgning i PostgreSQL, som kan
opnå tilstrækkelig performance  Cloud udgaver at PostgreSQL har dog
p.t. nogle begrænsninger vedr. fritekstsøgning, men der findes
work-arounds for dette.

### Polygon søgning

PostgreSQL har (via PostGIS udvidelsen) meget kraftfulde
geometriske/kort værktøjer.  Fx er polygon søgninger effektive.

### Vurdering af udviklingsomkostninger

På den korte bane vil der være nogle ekstra omkostninger ved at vælge
PostgreSQL, da den nuværende prototype af Dawa er baseret på MongoDB,
og der vil være mindre mulighed for genbrug.  Dertil er PostgreSQL er
et mere fleksibelt database system, og formindsker risikoen for at få
sene store ekstra omkostninger i tid og pris.  Samlet vurderes at
udviklingsomkostninger for PostgreSQL er det samme som for MongoDB.
