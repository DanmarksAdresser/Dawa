Følgende bør testes ændring af autocomplete komponenten
---------------

 - Autocomplete søger først i vejnavne, herefter adgangsadresser og til sidst adresser
 - Hvis jeg vælger et vejnavn, f.eks. "Gammel Viborgvej", så får jeg altid adgangsadresser, også selvom
 der er flere vejnavne der matcher
 - Hvis jeg har indtastet et vejnavn, der ikke indeholder et tal, og vejnavnet ikke findes, så aktiveres fuzzy søgning
 på vejnavne
 - Hvis jeg har indtastet en adresse med et tal, og adressen ikke kan findes, så aktiveres fuzzy søgning
 - Hvis jeg vælger en adgangsadresse, men autocompleter i adresser, så får jeg kun adresser på den pågældende
 adgangsadresse
 - Hvis jeg indtaster en delvis adresse, der indeholder et stormodtagerpostnummer, så ser jeg adressen både med og uden stormodtagerpostnummer
 - Hvis jeg indtaster en adresse med et stormodtagerpostnummer, og jeg har indtastet stormodtagerpostnummeret, så
 vises adressen med stormodtagerpostnummeret først. Ellers vises den efter den almindelige adresse.
 - Når jeg autocompleter, så placeres wildcard i caretens position. Hvis jeg flytter careten, så laves en ny søgning
 
 