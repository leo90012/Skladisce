/* Rabimbox – Pogodba o skladiščenju/izposoji na zahtevo.
   Natisne pogodbo (predloga Pogodba.docx) s samodejno izpolnjenimi podatki iz naročila.
   Polja, ki jih stranka ni podala (EMŠO, datum in kraj podpisa, podpisi), ostanejo prazna za vpis v živo. */
(function(){
  "use strict";

  function esc(x){ return String(x==null?"":x).replace(/[&<>"']/g,function(m){return {"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[m];}); }
  // Izpolnjeno polje ali prazna črta za ročni vpis.
  function polje(v, sirina){ return (v!=null && String(v).trim()!=="") ? '<span class="vpis">'+esc(v)+'</span>' : '<span class="crta" style="min-width:'+(sirina||220)+'px"></span>'; }
  function datum(d){ if(!d) return ""; var p=String(d).slice(0,10).split("-"); return p.length===3 ? (+p[2])+". "+(+p[1])+". "+p[0] : String(d); }
  function cena(tip, n){
    n=Number(n)||0;
    if(tip==="izposoja" && n>0) return n<=20?69:n<=40?109:n<=60?149:n<=80?189:0;
    if(tip==="skladiscenje" && n>0) return Math.round(n*(n<=10?4.90:n<=25?4.20:3.80)*100)/100;
    return 0;
  }
  function eur(n){ try{ return new Intl.NumberFormat("sl-SI",{style:"currency",currency:"EUR"}).format(n); }catch(e){ return n+" €"; } }

  var SLOG =
    '@page{size:A4;margin:16mm 16mm 14mm}' +
    ':root{color-scheme:only light}*{box-sizing:border-box}body{font-family:Arial,Helvetica,sans-serif;color:#111;background:#fff;font-size:11pt;line-height:1.45;margin:0}' +
    'h1{font-size:15pt;text-align:center;margin:0 0 18px}' +
    'h2{font-size:12.5pt;text-align:center;margin:0 0 12px}' +
    '.izv p,.nar p{margin:0 0 2px}.izv{margin-bottom:16px}' +
    '.nar p{margin:0 0 7px}.lbl{font-weight:bold}' +
    '.vpis{border-bottom:1px solid #111;padding:0 4px;font-weight:bold}' +
    '.crta{display:inline-block;border-bottom:1px solid #111;height:1em;vertical-align:baseline}' +
    '.blok{margin:16px 0 0}.blok p{margin:0 0 9px}' +
    '.kv{display:inline-block;width:13px;height:13px;border:1.4px solid #111;vertical-align:-2px;margin-right:5px;text-align:center;line-height:11px;font-size:11px;font-weight:bold}' +
    '.podpisi{display:grid;grid-template-columns:1fr 1fr;gap:30px;margin-top:26px}.podpisi p{margin:0 0 14px}' +
    '.obrni{text-align:center;font-style:italic;margin-top:26px;font-size:10pt}' +
    '.stran2{page-break-before:always;font-size:9pt;line-height:1.28}.stran2 p{margin:0 0 5px;text-align:justify}.stran2 h3{font-size:9.5pt;margin:9px 0 4px;break-after:avoid}' +
    '.orodja{position:sticky;top:0;background:#eef4ff;border-bottom:1px solid #c7dbff;padding:10px 16px;font-size:10.5pt;display:flex;gap:12px;align-items:center;flex-wrap:wrap}' +
    '.orodja button{font:inherit;font-weight:bold;background:#0067ff;color:#fff;border:0;border-radius:8px;padding:9px 16px;cursor:pointer}' +
    '.list{max-width:180mm;margin:0 auto;padding:18px 0}' +
    '@media print{.orodja{display:none}.list{padding:0;max-width:none}}';

  var TERMS="<h2>Pravila in pogoji – Rabimbox skladiščenje/izposoja na zahtevo</h2>\n<h3>1. SPLOŠNA DOLOČILA, LASTNIŠTVO IN ZAČETEK OBRAČUNA</h3>\n<p>Vsi zaboji (boxi) so last podjetja Rabim d.o.o. (v nadaljevanju: izvajalec). Naročnik (stranka) z zaboji upravlja kot dober gospodar in jih je dolžan vrniti v enakem stanju, kot jih je prejel.</p>\n<p>Začetek obračuna: Obračun najema in/ali skladiščenja se prične z dnem dostave zabojev na naslov naročnika oziroma z dnem podpisa prevzemnega obrazca/pogodbe. Dejstvo, da naročnik zabojev v času trajanja najema ni napolnil, uporabil ali pripravil za odvoz, ne vpliva na potek naročnine ter ne predstavlja osnove za zavračanje ali reklamacijo izdanih računov in bremenitev.</p>\n<p>V primeru poškodovanega ali uničenega zaboja se naročniku zaračuna odškodnina v višini 40,00 EUR na zaboj. Zaboji morajo biti ob vračilu izpraznjeni in očiščeni, sicer se zaračuna strošek čiščenja v višini 10,00 EUR na zaboj.</p>\n<p>Podjetje posluje s samodejnimi spletnimi bremenitvami (plačilne/kreditne kartice preko sistema Stripe), preko predračuna (nakazilo na TRR) ali z gotovino ob prevzemu.</p>\n<h3>2. SKLADIŠČENJE NA ZAHTEVO</h3>\n<p>Minimalni pogoji: Najem vsaj 3 zabojev za minimalno obdobje 1 meseca (30 dni).</p>\n<p>Naročnina in samodejno podaljševanje: Po poteku začetnega obdobja se storitev samodejno podaljšuje za naslednje 30-dnevno obdobje. Plačilo za naslednje mesečno obdobje se izvede samodejno preko shranjene plačilne kartice (Stripe) ali z izdajo računa/e-računa.</p>\n<p>Prekinitev naročnine (odpovedni rok): Zaradi logistične organizacije in izvedbe prevzema zabojev na domu mora naročnik naročnino prekiniti najkasneje 5 dni pred iztekom tekočega 30-dnevnega obračunskega obdobja (preko uporabniškega profila na spletni strani ali s pisnim obvestilom na e-naslov info@rabimbox.si). Če je naročnina pravočasno prekinjena, izvajalec v roku do 3 delovnih dni od prejema obvestila organizira in izvede brezplačen prevzem zabojev na naslovu stranke.</p>\n<p>Logistika in teža: Maksimalna dovoljena teža posameznega zaboja znaša 25 kg. Izvajalec si pridržuje pravico zavrniti prevzem pretežkih zabojev na terenu.</p>\n<p>Odgovornost in kritje: Izvajalec jamči za vsebino zabojev do vrednosti 50,00 EUR na zaboj v primeru lastne krivde. Brez podpisanega seznama vsebine s priloženimi fotografijami ob prevzemu izvajalec ne odgovarja za manjkajoče predmete. Izvajalec prav tako ne odgovarja za mehanske ali elektronske okvare naprav brez zunanjih vidnih poškodb zaboja ter za škodo, nastalo zaradi višje sile.</p>\n<p>Plačilo in zastavna pravica: Prvi mesec se poravna ob naročilu oziroma prevzemu zabojev. Izvajalec ima na vsebini zabojev zakonito zastavno pravico in ni dolžan vrniti ali izročiti stvari, dokler niso v celoti poravnane vse zapadle obveznosti naročnika.</p>\n<p>Opuščeni predmeti: Če naročnik ne poravna obveznosti več kot 90 dni in se ne odzove na pisna opozorila (poslana po e-pošti ali priporočeni pošti), se vsebina zabojev šteje za opuščeno. Izvajalec ima v tem primeru pravico vsebino prodati za poplačilo dolgov ter kritje stroškov ali pa jo uničiti.</p>\n<h3>3. IZPOSOJA EMBALAŽE</h3>\n<p>Minimalni pogoji: Najem zabojev za lastne potrebe stranke za minimalno obdobje 30 dni.</p>\n<p>Plačilo in obnova: Fizične osebe poravnajo najem ob naročilu/prevzemu preko spletnega plačila ali ob dostavi. Pravne osebe poravnajo obveznosti v roku 8 dni od izdaje računa. Najem se samodejno podaljšuje vsakih 30 dni preko samodejne bremenitve shranjene kartice ali izdaje novega računa.</p>\n<p>Prekinitev in vračilo: Stranka mora najem prekiniti in napovedati vračilo zabojev najkasneje 5 dni pred iztekom 30-dnevnega obdobja. V nasprotnem primeru se najem samodejno podaljša za naslednjih 30 dni po veljavnem ceniku.</p>\n<p>Odtujitev: Za odtujitev zabojev se šteje primer, ko stranka ne poravna najema/podaljšanja in je hkrati neodzivna na pozive izvajalca. V takem primeru se zaračuna polna odškodnina v višini 40,00 EUR na zaboj.</p>\n<p>Odgovornost: Pri storitvi izposoje embalaže izvajalec ne odgovarja za vsebino zabojev, saj so ti ves čas v posesti in pod izključnim nadzorom stranke.</p>\n<h3>4. PREPOVEDANE SNOVI (Velja za vse storitve)</h3>\n<p>V zaboje je strogo prepovedano shranjevati ali nalagati:</p>\n<p>vnetljive, eksplozivne, korozivne ali nevarne snovi,</p>\n<p>pokvarljive stvari, hrano ali predmete, ki oddajajo močan vonj,</p>\n<p>nezakonite predmete, orožje ali droge,</p>\n<p>živa bitja ali gotovino, plemenite kovine in vrednostne papirje.</p>\n<h3>5. VARSTVO OSEBNIH PODATKOV (GDPR) IN REŠEVANJE SPOROV</h3>\n<p>Upravljavec in podlaga: Podjetje Rabim d.o.o. varuje osebne podatke naročnikov (ime, priimek, naslov, telefon, e-pošta, EMŠO/davčna številka ter podatki o plačilih) v skladu z Splošno uredbo EU o varstvu podatkov (GDPR) in ZVOP-2. Podatki se obdelujejo na podlagi izvajanja pogodbe in zakonskih obveznosti (izdaja računov, identifikacija, izterjava).</p>\n<p>Hramba podatkov in cloud infrastruktura: Osebni podatki in podatki o naročilih se hranijo ter obdelujejo na varni oblačni infrastrukturi ponudnika Google Cloud (znotraj podatkovnih centrov v EU ali pri ponudnikih, ki zagotavljajo ustrezne varnostne mehanizme in skladnost z GDPR standardi). Podatki se hranijo do izpolnitve storitve oziroma do poteka zakonsko določenih rokov za hrambo računovodskih in davčnih listin.</p>\n<p>Pravice posameznika: Naročnik ima pravico do dostopa do svojih osebnih podatkov, popravka, izbrisa (&quot;pravica do pozabe&quot;), omejitve obdelave, prenosljivosti podatkov ter pravico do ugovora. Zahtevek se pošlje na e-naslov info@rabimbox.si.</p>\n<p>Reševanje sporov: Pogodbeni stranki bosta morebitna nesoglasja reševali sporazumno. Če sporazum ni mogoč, je za reševanje sporov pristojno sodišče v Ljubljani.</p>";

  function html(d){
    var tip=d.tip;
    var izp=tip==="izposoja", skl=tip==="skladiscenje";
    var naziv=[d.ime, d.priimek].filter(Boolean).join(" ");
    var nazivVrstica=[d.podjetje, naziv].filter(Boolean).join(", ");
    var naslov=[d.naslov, [d.postna_stevilka, d.mesto].filter(Boolean).join(" ")].filter(Boolean).join(", ");
    var znesek=d.cena_opis || (cena(tip,d.st_boxov) ? eur(cena(tip,d.st_boxov))+" / 30 dni" : "");
    return '<!doctype html><html lang="sl"><head><meta charset="utf-8"><title>Pogodba '+esc(d.stevilka||"")+'</title><style>'+SLOG+'</style></head><body>'+
      '<div class="orodja"><button onclick="window.print()">Natisni / shrani PDF</button><span>Izpolnjeno iz naročila '+esc(d.stevilka||"")+'. Prazna polja se izpolnijo ob podpisu.</span></div>'+
      '<div class="list">'+
      '<h1>Pogodba o skladiščenju/izposoji na zahtevo - Rabimbox</h1>'+
      '<div class="izv"><p class="lbl">Izvajalec:</p><p>Rabim d.o.o.</p><p>Proletarska cesta 4</p><p>1000 Ljubljana</p>'+
        '<p>Matična številka: 7155778000</p><p>Tel št.: +386 40 796 040</p><p>E-pošta: info@rabimbox.si</p></div>'+
      '<div class="nar"><p class="lbl">Naročnik</p>'+
        '<p>Številka stranke: '+polje(d.stevilka_stranke,120)+'</p>'+
        '<p>Ime Priimek/Naziv podjetja: '+polje(nazivVrstica,330)+'</p>'+
        '<p>Naslov prebivališča/Sedež podjetja: '+polje(naslov,300)+'</p>'+
        '<p>Tel. Številka: '+polje(d.telefon,330)+'</p>'+
        '<p>E-pošta: '+polje(d.email,380)+'</p>'+
        '<p>EMŠO/Davčna številka: '+polje(d.davcna,300)+'</p></div>'+
      '<div class="blok">'+
        '<p>Vrsta storitve: <span class="kv">'+(skl?"X":"")+'</span>Skladiščenje &nbsp;&nbsp; <span class="kv">'+(izp?"X":"")+'</span>Izposoja</p>'+
        '<p>Število zabojev: '+polje(d.st_boxov,120)+'</p>'+
        '<p>Dogovorjena cena (z DDV): '+polje(znesek,160)+'</p>'+
        '<p>Datum začetek skladiščenja/izposoje: '+polje(datum(d.datum_dostave),140)+'</p>'+
        '<p><b>Podaljševanje najema:</b> Pogodba se sklepa za nedoločen čas. Najem se obračunava in samodejno podaljšuje na vsakih 30 dni do prekinitve. Prekinitev najema je mogoča najkasneje 5 dni pred iztekom obračunskega obdobja.</p>'+
        '<p>Datum in kraj: <span class="crta" style="min-width:260px"></span></p>'+
      '</div>'+
      '<div class="podpisi">'+
        '<div><p class="lbl">Izvajalec</p><p>Rabim d.o.o.</p><p>Ime in priimek: <span class="crta" style="min-width:150px"></span></p><p>Podpis: <span class="crta" style="min-width:170px"></span></p><p>Žig:</p></div>'+
        '<div><p class="lbl">Naročnik</p><p>Naziv podjetja: '+polje(d.podjetje,150)+'</p><p>Ime in priimek: '+polje(naziv,150)+'</p><p>Podpis: <span class="crta" style="min-width:170px"></span></p><p>Žig:</p></div>'+
      '</div>'+
      '<p class="obrni">(Pravila in pogoji na drugi strani - obrni)</p>'+
      '<div class="stran2">'+
        TERMS+
      '</div></div></body></html>';
  }

  // okno: vnaprej odprto okno (odpremo ga ob kliku, sicer ga brskalnik blokira).
  function prikazi(okno, podatki){
    okno.document.open();
    okno.document.write(html(podatki));
    okno.document.close();
    okno.focus();
  }

  window.RBPogodba = { prikazi: prikazi, html: html };
})();
