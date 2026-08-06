RABIMBOX – SKLADIŠČNA APLIKACIJA
=================================

ZAGON
-----
Odpri datoteko  index.html  v brskalniku (dvoklik).
Aplikacija se poveže z isto Supabase bazo kot spletna stran.
Za skeniranje bar kod s kamero mora aplikacija teči prek https
(objavljena na spletu), ne prek file:// – brskalnik drugače
kamere ne dovoli.

PRIJAVA
-------
Uporabniški imeni sta  "skladiščnik"  in  "Admin".
Gesli NISTA zapisani v tem repozitoriju – hranjeni sta v
upravitelju gesel. Za dostop se obrni na vodjo.

ZAVIHKI
-------
NAROČILA (privzeti zavihek)
  Delovni seznam vsega, kar so stranke naročile – iz dveh virov:
   - "Spletno naročilo"    = naročilo s spletne strani (Naroči zdaj)
   - "Zahteva iz panela"   = zahteva za dostavo/prevzem iz Moj profil
  Vidiš: datum in uro dostave, storitev, število boxov, stranko,
  naslov, kraj, status in ali je naročilo plačano.
  Številka v rdečem krogcu na zavihku pove, koliko je še odprtih.
  Klik na vrstico odpre podrobnosti: naslov, dodatki (stopnice,
  pomoč pri polnjenju), izbrane škatle in gumbi za spremembo stanja:
      Potrdi  ->  V izvajanje  ->  Zaključi     (ali Prekliči naročilo)
  Termin lahko pred spremembo statusa popraviš v polju "Nov termin".
  Privzeto so prikazana samo odprta naročila – odkljukaj "Samo odprta"
  za prikaz zaključenih in preklicanih.

ŠKATLE
  Vse škatle v sistemu – bar koda, status, št. stranke, stranka,
  št. naročila, naročnina (velja od/do), lokacija.

ZGODOVINA (samo administrator)
  Dnevnik spreminjanja škatel in statusov naročil.

Administrator poleg tega povsod vidi e-pošto in telefon stranke.

FUNKCIJE
--------
- Iskanje (bar koda, stranka, št. naročila, naslov, telefon ...)
- Filtri po statusu, viru in naročnini
- Razvrščanje s klikom na naslov stolpca (ponovni klik obrne smer)
- Statistika na vrhu (za danes, nova, potrjena, v izvajanju)
- Skeniranje bar kode s kamero (deluje samo prek https, ne prek file://)

STATUSI
-------
Škatle:   na zalogi -> rezervirana -> v transportu -> pri stranki
          -> v skladišču   (+ poškodovana, umaknjena)
Naročila: nova -> potrjena -> v izvajanju -> zaključena
          (+ preklicana)
Stranka v panelu vidi poenostavljene nazive ("Pripravljeno za
dostavo", "Na poti", "Pri vas", "V skladišču") – interni statusi
in bar kode ji niso prikazani.

POGOJ ZA DELOVANJE ZAVIHKA NAROČILA
-----------------------------------
V Supabase mora biti pognana skripta  sql/integracija.sql
(iz mape spletne strani rabimbox-site/Moj-profil/sql/).
Če zavihek javi, da funkcija ne obstaja, ta korak še ni opravljen.

Podatke varujejo funkcije v bazi (is_staff / is_admin) – brez prijave
z enim od zgornjih računov aplikacija ne prikaže ničesar.
