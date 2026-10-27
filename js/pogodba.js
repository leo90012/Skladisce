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
    if(tip==="izposoja") return ({20:69,40:109,60:149,80:189})[n] || 0;
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
    '.stran2{page-break-before:always;font-size:9.6pt;line-height:1.42}.stran2 p{margin:0 0 7px;text-align:justify}' +
    '.orodja{position:sticky;top:0;background:#eef4ff;border-bottom:1px solid #c7dbff;padding:10px 16px;font-size:10.5pt;display:flex;gap:12px;align-items:center;flex-wrap:wrap}' +
    '.orodja button{font:inherit;font-weight:bold;background:#0067ff;color:#fff;border:0;border-radius:8px;padding:9px 16px;cursor:pointer}' +
    '.list{max-width:180mm;margin:0 auto;padding:18px 0}' +
    '@media print{.orodja{display:none}.list{padding:0;max-width:none}}';

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
        '<p><b>Podaljševanje najema:</b> Pogodba se sklepa za nedoločen čas. Najem se obračunava in samodejno podaljšuje na vsakih 30 dni do prekinitve s strankinim soglasjem k samodejni bremenitvi kartice pri spletnih naročilih; pri ročnih naročilih velja dogovorjeni način plačila. Pravočasna najava vračila vseh zabojev ustavi naslednjo obnovo tudi ob poznejši obdelavi v skladišču. Pri delnem vračilu nižja količina in cena veljata od naslednjega 30-dnevnega obdobja. Ob prevzemu pa je obvezen podpisan prevzemni obrazec.</p>'+
        '<p>Datum in kraj: <span class="crta" style="min-width:260px"></span></p>'+
      '</div>'+
      '<div class="podpisi">'+
        '<div><p class="lbl">Izvajalec</p><p>Rabim d.o.o.</p><p>Ime in priimek: <span class="crta" style="min-width:150px"></span></p><p>Podpis: <span class="crta" style="min-width:170px"></span></p><p>Žig:</p></div>'+
        '<div><p class="lbl">Naročnik</p><p>Naziv podjetja: '+polje(d.podjetje,150)+'</p><p>Ime in priimek: '+polje(naziv,150)+'</p><p>Podpis: <span class="crta" style="min-width:170px"></span></p><p>Žig:</p></div>'+
      '</div>'+
      '<p class="obrni">(Pravila in pogoji na drugi strani - obrni)</p>'+
      '<div class="stran2">'+
        '<h2>Pravila in pogoji – Rabimbox skladiščenje/izposoja na zahtevo</h2>'+
        '<p><b>1. SPLOŠNA DOLOČILA IN LASTNIŠTVO</b> Vsi zaboji so last podjetja Rabim d.o.o.. Stranka je dolžna zaboje vrniti v enakem stanju, kot jih je prejela. V primeru poškodovanega ali uničenega zaboja se zaračuna pavšalna odškodnina 40,00 EUR na zaboj. Zaboji morajo biti ob vračilu izpraznjeni in očiščeni, sicer se zaračuna strošek čiščenja 10,00 EUR na zaboj. Spletna naročila se plačujejo s kartico prek sistema Stripe; ročna naročila se plačujejo po dogovoru.</p>'+
        '<p><b>2. SKLADIŠČENJE NA ZAHTEVO</b></p>'+
        '<p><b>Minimalni pogoji:</b> Najem vsaj 3 zabojev za minimalno obdobje 30 dni.</p>'+
        '<p><b>Avtomatsko podaljšanje in račun:</b> Po poteku minimalnega obdobja 30 dni se storitev podaljšuje za naslednjih 30 dni. Pri vključeni samodejni bremenitvi se kartica bremeni prek sistema Stripe, pet dni prej pa stranka prejme opomnik. Račun prejme po uspešnem plačilu. Odpovedni rok za prekinitev skladiščenja znaša 3 dni pred iztekom 30-dnevnega obdobja.</p>'+
        '<p><b>Logistika in teža:</b> Maksimalna dovoljena teža posameznega zaboja je 25 kg. Izvajalec si pridržuje pravico zavrniti prevzem pretežkih zabojev.</p>'+
        '<p><b>Odgovornost in kritje:</b> Izvajalec jamči za vsebino do vrednosti 50,00 EUR na zaboj v primeru lastne krivde. Brez podpisanega seznama vsebine s priloženimi fotografijami izvajalec ne odgovarja za manjkajoče stvari. Izvajalec ne odgovarja za mehanske ali elektronske okvare naprav brez zunanjih poškodb zaboja ali za škodo zaradi višje sile.</p>'+
        '<p><b>Plačilo in zastava:</b> Prvo 30-dnevno obdobje se poravna vnaprej ob spletnem naročilu oziroma po dogovoru pri ročnem naročilu. Izvajalec ima zastavno pravico na vsebini in ni dolžan vrniti stvari, dokler niso poravnane vse zapadle obveznosti.</p>'+
        '<p><b>Opuščeni predmeti:</b> Če naročnik ne poravna obveznosti več kot 90 dni in se ne odziva na pisna opozorila (poslana po e-pošti ali priporočeni pošti), se vsebina šteje za opuščeno in jo lahko podjetje proda za poplačilo dolgov ali uniči.</p>'+
        '<p><b>3. IZPOSOJA EMBALAŽE</b></p>'+
        '<p><b>Minimalni pogoji:</b> Najem zabojev za lastne potrebe stranke za minimalno obdobje 30 dni.</p>'+
        '<p><b>Plačilo:</b> Fizične osebe poravnajo najem ob prevzemu zabojev. Pravne osebe poravnajo obveznosti v roku 8 dni od izdaje računa.</p>'+
        '<p><b>Avtomatsko podaljšanje:</b> Za prekinitev najema mora stranka vrniti zaboje ali najaviti vračilo najmanj 3 dni pred iztekom 30-dnevnega obdobja. V nasprotnem primeru se najem samodejno podaljša za naslednjih 30 dni po veljavnem ceniku. Izvajalec za vsako podaljšanje naročniku izda nov račun.</p>'+
        '<p><b>Odtujitev:</b> Za odtujitev zabojev se šteje le primer, ko stranka ne poravna najema (podaljšanja) in je hkrati neodzivna na pozive izvajalca. V takem primeru se zaračuna polna odškodnina 40,00 EUR na zaboj po 1. členu teh pravil.</p>'+
        '<p><b>Odgovornost:</b> Pri izposoji izvajalec ne odgovarja za vsebino zabojev, saj so ti v posesti in pod nadzorom stranke.</p>'+
        '<p><b>4. PREPOVEDANE SNOVI (Velja za obe storitvi)</b> V zaboje je strogo prepovedano oddajati vnetljive, eksplozivne, nevarne, pokvarljive ali nezakonite predmete, živa bitja ter predmete, ki oddajajo močan vonj.</p>'+
        '<p><b>5. VAROVANJE PODATKOV IN SPORI</b> Podjetje Rabim d.o.o. varuje osebne podatke (vključno z EMŠO/davčno številko) v skladu z Uredbo (EU) GDPR in ZVOP-2. Podatki se zbirajo izključno za namene izvajanja storitve, identifikacije stranke, izdaje računov, izterjave obveznosti ter komunikacije. Podatki se hranijo do izpolnitve storitve oziroma do poteka zakonskih rokov za hrambo računov. Morebitni spori se rešujejo sporazumno, v nasprotnem primeru je pristojno sodišče v Ljubljani.</p>'+
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
