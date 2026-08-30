/* Rabimbox – Skladišče: prijava osebja, pregled boxov, filtri, razvrščanje, zgodovina (admin). */
(function(){
  "use strict";
  var CFG = window.RABIMBOX_CONFIG || {};
  var APP = document.getElementById("app");
  // Lastna shramba seje: skladiščna aplikacija in spletna stran sta na isti domeni,
  // zato bi si brez tega delili prijavo. Tako si lahko hkrati prijavljen kot
  // skladiščnik/admin tukaj in kot stranka na rabimbox strani.
  var sb = (window.supabase && window.supabase.createClient)
    ? window.supabase.createClient(CFG.SUPABASE_URL, CFG.SUPABASE_ANON_KEY, {
        auth: {
          persistSession: true,
          storageKey: "rb-skladisce-auth",   // ločeno od privzetega ključa strani
          autoRefreshToken: true,
          detectSessionInUrl: false
        }
      })
    : null;

  // uporabniško ime -> e-naslov
  var USERMAP = {
    "skladiscnik":"skladiscnik@rabimbox.si",
    "skladiščnik":"skladiscnik@rabimbox.si",
    "admin":"admin@rabimbox.si"
  };
  var ADMIN_EMAIL = "admin@rabimbox.si";

  var STATUSI = {
    na_zalogi:"Na zalogi", rezervirana:"Rezervirana", v_transportu:"V transportu",
    pri_stranki:"Pri stranki", v_skladiscu:"V skladišču",
    poskodovana:"Poškodovana", umaknjena:"Umaknjena"
  };

  // Statusi naročil/zahtev – enake vrednosti v obeh tabelah (glej sql/integracija.sql)
  var Z_STATUSI = {
    nova:"Novo – neobdelano",
    caka_dostavo:"Sprejeto – čaka na dostavo",
    pri_stranki:"Pri stranki",
    v_skladiscu:"V skladišču",
    zakljuceno:"Zaključeno",
    preklicano:"Preklicano"
  };
  // koraki, ki jih delavec označi (v tem vrstnem redu se izpišejo gumbi)
  var Z_KORAKI = ["caka_dostavo","pri_stranki","v_skladiscu","zakljuceno","preklicano"];
  var Z_GUMBI = {
    caka_dostavo:"Potrdi naročilo",
    pri_stranki:"Pri stranki",
    v_skladiscu:"V skladišču",
    zakljuceno:"Zaključi",
    preklicano:"Prekliči"
  };
  function zKey(s){
    var v = String(s||"").toLowerCase().replace(/\s+/g,"_");
    if(v.indexOf("nov")===0) return "nova";
    if(v.indexOf("caka")===0||v.indexOf("čaka")===0||v.indexOf("potrj")===0) return "caka_dostavo";
    if(v.indexOf("pri_stranki")===0||v.indexOf("dostavlj")===0) return "pri_stranki";
    if(v.indexOf("v_sklad")===0||v.indexOf("prevzet")===0) return "v_skladiscu";
    if(v.indexOf("zaklju")===0||v.indexOf("opravlj")===0) return "zakljuceno";
    if(v.indexOf("preklic")===0||v.indexOf("zavrn")===0) return "preklicano";
    return "nova";
  }
  var Z_ZAPRTI = {zakljuceno:1, preklicano:1};

  var state = {
    email:null, isAdmin:false, tab:"zahteve",
    boxes:[], dogodki:[], zahteve:[], loaded:false, dogLoaded:false, zahLoaded:false,
    q:"", fStatus:"", fNar:"", sortKey:"id", sortDir:1,
    dq:"", dSortKey:"cas", dSortDir:-1,
    zq:"", zStatus:"", zVir:"", zOpenOnly:true, zSortKey:"", zSortDir:1,
    boxiZaZahtevo:{}
  };

  function esc(x){return String(x==null?"":x).replace(/[&<>"']/g,function(m){return {"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[m];});}
  function el(id){return document.getElementById(id);}
  function fmtD(d){ if(!d) return ""; var s=String(d).slice(0,10); var p=s.split("-"); return p.length===3?(p[2]+"."+p[1]+"."+p[0]):s; }
  function fmtDT(d){ if(!d) return ""; var dt=new Date(d); if(isNaN(dt)) return String(d).slice(0,16); return ("0"+dt.getDate()).slice(-2)+"."+("0"+(dt.getMonth()+1)).slice(-2)+"."+dt.getFullYear()+" "+("0"+dt.getHours()).slice(-2)+":"+("0"+dt.getMinutes()).slice(-2); }
  function statusChip(s){ var k=s||"na_zalogi"; return '<span class="chip '+esc(k)+'">'+esc(STATUSI[k]||k)+'</span>'; }
  function zChip(s){ var k=zKey(s); return '<span class="chip z-'+esc(k)+'">'+esc(Z_STATUSI[k]||k)+'</span>'; }
  function virChip(v){ return v==="narocilo"
    ? '<span class="chip vir-narocilo">Spletno naročilo</span>'
    : '<span class="chip vir-zahteva">Zahteva iz panela</span>'; }
  function dash(v){ return (v==null||v==="")?'<span class="dash">–</span>':esc(v); }
  function toast(msg){
    var t=document.getElementById("toast");
    if(!t){ t=document.createElement("div"); t.id="toast"; document.body.appendChild(t); }
    t.textContent=msg; t.classList.add("show");
    clearTimeout(t._t); t._t=setTimeout(function(){ t.classList.remove("show"); }, 4200);
  }
  function LOGO(){ return "Slike/5.png"; }

  /* ---------------- LOGIN ---------------- */
  function viewLogin(msg){
    APP.innerHTML =
      '<div class="login-wrap"><div class="login-card">'+
      '<img class="logo" src="'+LOGO()+'" alt="Rabimbox" />'+
      '<h1>Skladišče</h1><p class="sub">Prijava za osebje</p>'+
      (msg?'<div class="alert err">'+esc(msg)+'</div>':'')+
      '<form id="lform">'+
      '<div class="field"><label>Uporabniško ime</label><input id="user" autocomplete="username" placeholder="skladiščnik ali Admin" /></div>'+
      '<div class="field"><label>Geslo</label><input id="pass" type="password" autocomplete="current-password" placeholder="********" /></div>'+
      '<button class="btn block" id="lbtn" type="submit">Prijava</button>'+
      '</form>'+
      '<p class="login-hint">Prijava je mogoča samo z računi, ki jih je odprl vodja.<br>Registracija tukaj ni na voljo.</p>'+
      '</div></div>';
    el("lform").addEventListener("submit", onLogin);
  }
  async function onLogin(e){
    e.preventDefault();
    var u = (el("user").value||"").trim().toLowerCase();
    var pass = el("pass").value||"";
    var email = USERMAP[u] || (u.indexOf("@")>0 ? u : null);
    var btn = el("lbtn");
    if(!email){ viewLogin("Neznano uporabniško ime. Uporabi 'skladiščnik' ali 'Admin'."); return; }
    if(!pass){ viewLogin("Vpiši geslo."); return; }
    btn.disabled=true; btn.textContent="Prijavljam...";
    try{
      var r = await sb.auth.signInWithPassword({ email:email, password:pass });
      if(r.error){ viewLogin("Napačno uporabniško ime ali geslo."); return; }
      await afterLogin();
    }catch(err){ viewLogin("Napaka pri prijavi. Poskusi znova."); }
  }

  // Dostop ima samo, kdor je vpisan v tabelo "osebje" (glej sql/osebje-dostop.sql).
  // Sama prijava v Supabase ne zadošča.
  async function preveriVlogo(){
    try{
      var r = await sb.rpc("moja_vloga");
      if(r.error) return { napaka: r.error.message };
      return { vloga: r.data || null };
    }catch(e){ return { napaka: e.message || String(e) }; }
  }

  async function afterLogin(){
    var s = await sb.auth.getSession();
    var user = s && s.data && s.data.session ? s.data.session.user : null;
    if(!user){ viewLogin(); return; }

    APP.innerHTML = '<div class="boot"><div class="spinner"></div></div>';
    var v = await preveriVlogo();

    if(v.napaka){
      // funkcija še ne obstaja -> zasilno nazaj na staro preverjanje po e-pošti
      var e = String(user.email).toLowerCase();
      if(e !== ADMIN_EMAIL && e !== "skladiscnik@rabimbox.si"){
        await sb.auth.signOut();
        viewLogin("Ta račun nima dostopa do skladiščne aplikacije.");
        return;
      }
      state.isAdmin = (e === ADMIN_EMAIL);
    } else {
      if(!v.vloga){
        await sb.auth.signOut();
        viewLogin("Ta račun nima dostopa do skladiščne aplikacije. Za dostop se obrni na vodjo.");
        return;
      }
      state.isAdmin = (v.vloga === "admin");
    }

    state.email = user.email;
    state.tab = "zahteve"; state.loaded=false; state.dogLoaded=false; state.zahLoaded=false;
    state.boxiZaZahtevo = {};
    renderMain();
    loadZahteve();
    loadBoxi();
  }

  async function doLogout(){
    try{ await sb.auth.signOut(); }catch(e){}
    state.email=null; state.isAdmin=false; state.boxes=[]; state.dogodki=[]; state.zahteve=[];
    viewLogin();
  }

  /* ---------------- MAIN ---------------- */
  function odprtihZahtev(){
    return state.zahteve.filter(function(z){ return !Z_ZAPRTI[zKey(z.status)]; }).length;
  }
  function renderMain(){
    var odp = odprtihZahtev();
    var badge = (state.zahLoaded && odp) ? '<span class="tabbadge">'+odp+'</span>' : '';
    var tabs = '<div class="tabs">'+
      '<button data-tab="zahteve" class="'+(state.tab==="zahteve"?"active":"")+'">Naročila'+badge+'</button>'+
      '<button data-tab="boxi" class="'+(state.tab==="boxi"?"active":"")+'">Škatle</button>'+
      (state.isAdmin?'<button data-tab="zgodovina" class="'+(state.tab==="zgodovina"?"active":"")+'">Zgodovina</button>':'')+'</div>';
    APP.innerHTML =
      '<div class="top"><div class="brand"><img src="'+LOGO()+'" alt="Rabimbox" /><span class="tt">Skladišče</span></div>'+
      '<div class="who"><button class="btn ghost small" id="scan">Skeniraj kodo</button>'+
      '<span class="pill '+(state.isAdmin?"admin":"skl")+'">'+(state.isAdmin?"Administrator":"Skladiščnik")+'</span>'+
      '<span>'+esc(state.email)+'</span><button class="btn ghost small" id="logout">Odjava</button></div></div>'+
      '<div class="wrap">'+tabs+'<div id="content"></div></div>';
    el("logout").addEventListener("click", doLogout);
    var scanBtn=el("scan"); if(scanBtn) scanBtn.addEventListener("click", openScanner);
    Array.prototype.forEach.call(document.querySelectorAll(".tabs button"), function(b){
      b.addEventListener("click", function(){
        state.tab=b.getAttribute("data-tab"); renderMain();
        if(state.tab==="zgodovina") loadDogodki();
        else if(state.tab==="zahteve"){ if(!state.zahLoaded) loadZahteve(); }
      });
    });
    if(state.tab==="boxi") renderBoxiTab();
    else if(state.tab==="zahteve") renderZahteveTab();
    else renderZgodovinaTab();
  }

  /* ------- Naročila in zahteve strank ------- */
  function renderZahteveTab(){
    var c = el("content"); if(!c) return;
    if(!state.zahLoaded){ c.innerHTML = '<div class="boot"><div class="spinner"></div></div>'; return; }
    var stOpts = Object.keys(Z_STATUSI).map(function(k){ return '<option value="'+k+'">'+esc(Z_STATUSI[k])+'</option>'; }).join("");
    c.innerHTML =
      '<div class="stats" id="zstats"></div>'+
      '<div class="toolbar">'+
      '<input class="search" id="zq" placeholder="Iskanje: stranka, naslov, št. stranke, telefon..." value="'+esc(state.zq)+'" />'+
      '<select id="zStatus"><option value="">Vsi statusi</option>'+stOpts+'</select>'+
      '<select id="zVir"><option value="">Vsi viri</option><option value="narocilo">Spletna naročila</option><option value="zahteva">Zahteve iz panela</option></select>'+
      '<label class="chk"><input type="checkbox" id="zOpen" '+(state.zOpenOnly?"checked":"")+' /> Samo odprta</label>'+
      '<span class="count" id="zcount"></span>'+
      '</div>'+
      '<div class="tablecard" id="ztablecard"></div>';
    el("zq").addEventListener("input", function(e){ state.zq=e.target.value; refreshZahteve(); });
    el("zStatus").value=state.zStatus; el("zStatus").addEventListener("change", function(e){ state.zStatus=e.target.value; refreshZahteve(); });
    el("zVir").value=state.zVir; el("zVir").addEventListener("change", function(e){ state.zVir=e.target.value; refreshZahteve(); });
    el("zOpen").addEventListener("change", function(e){ state.zOpenOnly=e.target.checked; refreshZahteve(); });
    refreshZahteve();
  }

  function zahteveColumns(){
    var cols = [
      {k:"datum_dostave", t:"Dostava", r:function(x){
        var d = x.datum_dostave ? fmtD(x.datum_dostave) : '<span class="dash">–</span>';
        var danes = x.datum_dostave && String(x.datum_dostave).slice(0,10)===todayISO();
        return '<span class="'+(danes?"danes":"")+'">'+d+(x.cas_dostave?' <span class="mono">'+esc(String(x.cas_dostave).slice(0,5))+'</span>':'')+'</span>';
      }},
      {k:"vir", t:"Vir", r:function(x){ return virChip(x.vir); }},
      {k:"vrsta", t:"Storitev", r:function(x){ return dash(x.vrsta); }},
      {k:"st_boxov", t:"Boxi", r:function(x){
        var kljuc = x.vir+":"+x.id;
        var b = state.boxiZaZahtevo[kljuc];
        if(b === undefined) return (x.st_boxov?('<b>'+x.st_boxov+'</b>'):'<span class="dash">–</span>')+' <span class="muted" style="font-size:11px">…</span>';
        if(!b.length) return '<span class="dash">–</span>';
        var kode = b.slice(0,3).map(function(s){ return esc(s.barkoda||("#"+s.id)); }).join(", ");
        return '<b>'+b.length+'</b> <span class="mono" style="font-size:11.5px">'+kode+(b.length>3?" …":"")+'</span>';
      }},
      {k:"kupec", t:"Stranka", r:function(x){ return dash(x.kupec); }},
      {k:"stevilka_stranke", t:"Št. stranke", r:function(x){ return '<span class="mono">'+dash(x.stevilka_stranke)+'</span>'; }}
    ];
    // E-pošta, telefon in kraj so namenoma samo v podrobnostih naročila,
    // da tabela ostane pregledna (in da kontakti niso na očeh mimoidočim).
    cols.push({k:"status", t:"Status", r:function(x){ return zChip(x.status); }});
    cols.push({k:"placano", t:"Plačano", r:function(x){
      if(x.vir!=="narocilo") return '<span class="dash">–</span>';
      return x.placano ? '<span class="chip z-zakljuceno">Da</span>' : '<span class="chip z-preklicano">Ne</span>';
    }});
    return cols;
  }

  function todayISO(){ var d=new Date(); return d.getFullYear()+"-"+("0"+(d.getMonth()+1)).slice(-2)+"-"+("0"+d.getDate()).slice(-2); }

  function filteredZahteve(){
    var q = state.zq.trim().toLowerCase();
    return state.zahteve.filter(function(x){
      if(state.zOpenOnly && Z_ZAPRTI[zKey(x.status)]) return false;
      if(state.zStatus && zKey(x.status)!==state.zStatus) return false;
      if(state.zVir && x.vir!==state.zVir) return false;
      if(q){
        var hay=[x.kupec,x.kupec_email,x.telefon,x.stevilka_stranke,x.naslov,x.mesto,x.postna_stevilka,x.vrsta,x.stevilka,x.opomba].join(" ").toLowerCase();
        if(hay.indexOf(q)<0) return false;
      }
      return true;
    });
  }

  function refreshZahteve(){
    // brez izbranega stolpca obdržimo vrstni red iz baze (neobdelana najprej)
    var rows = state.zSortKey ? sortRows(filteredZahteve(), state.zSortKey, state.zSortDir) : filteredZahteve();
    var cols = zahteveColumns();
    var head = '<tr>'+cols.map(function(c){
      var ar = state.zSortKey===c.k ? '<span class="ar">'+(state.zSortDir>0?"▲":"▼")+'</span>' : '';
      return '<th data-k="'+c.k+'">'+esc(c.t)+ar+'</th>';
    }).join("")+'</tr>';
    var prazno = state.zahteve.length
      ? '<div class="empty"><img src="Slike/Skatle.png" alt="" /><div>Ni naročil, ki bi ustrezala filtru.</div></div>'
      : '<div class="empty"><img src="Slike/Skatle.png" alt="" /><div>Trenutno ni nobenega naročila.</div>'+
        '<div class="muted" style="font-size:12.5px;margin-top:6px">Nova naročila s spletne strani in zahteve iz panela se prikažejo samodejno.</div></div>';
    var body = rows.length
      ? rows.map(function(x){
          var nova = zKey(x.status)==="nova" ? " nova-vrstica" : "";
          return '<tr class="rowlink'+nova+'" data-key="'+esc(x.vir+":"+x.id)+'">'+cols.map(function(c){ return '<td data-l="'+esc(c.t)+'">'+c.r(x)+'</td>'; }).join("")+'</tr>';
        }).join("")
      : '<tr><td class="empty-cell" colspan="'+cols.length+'">'+prazno+'</td></tr>';
    el("ztablecard").innerHTML = '<div class="tablescroll"><table><thead>'+head+'</thead><tbody>'+body+'</tbody></table></div>';
    var cnt = el("zcount"); if(cnt) cnt.textContent = rows.length+" / "+state.zahteve.length+" naročil";
    Array.prototype.forEach.call(document.querySelectorAll("#ztablecard th"), function(th){
      th.addEventListener("click", function(){ var k=th.getAttribute("data-k"); if(state.zSortKey===k) state.zSortDir*=-1; else{ state.zSortKey=k; state.zSortDir=1; } refreshZahteve(); });
    });
    Array.prototype.forEach.call(document.querySelectorAll("#ztablecard tbody tr[data-key]"), function(tr){
      tr.addEventListener("click", function(){
        var key=tr.getAttribute("data-key");
        var z=state.zahteve.filter(function(x){ return (x.vir+":"+x.id)===key; })[0];
        if(z) openZahteva(z);
      });
    });
    renderZStats();
  }

  function renderZStats(){
    var box = el("zstats"); if(!box) return;
    var danes = todayISO();
    var c = {danes:0, nova:0, caka_dostavo:0, pri_stranki:0, v_skladiscu:0};
    state.zahteve.forEach(function(z){
      var k=zKey(z.status);
      if(c[k]!==undefined) c[k]++;
      if(!Z_ZAPRTI[k] && z.datum_dostave && String(z.datum_dostave).slice(0,10)===danes) c.danes++;
    });
    box.innerHTML =
      '<div class="stat"><div class="n"><span class="dot" style="background:var(--red)"></span>'+c.nova+'</div><div class="l">Neobdelana</div></div>'+
      '<div class="stat"><div class="n"><span class="dot" style="background:var(--brand)"></span>'+c.danes+'</div><div class="l">Za danes</div></div>'+
      '<div class="stat"><div class="n"><span class="dot" style="background:var(--amber)"></span>'+c.caka_dostavo+'</div><div class="l">Čaka na dostavo</div></div>'+
      '<div class="stat"><div class="n"><span class="dot" style="background:var(--violet)"></span>'+c.pri_stranki+'</div><div class="l">Pri strankah</div></div>'+
      '<div class="stat"><div class="n"><span class="dot" style="background:var(--green)"></span>'+c.v_skladiscu+'</div><div class="l">V skladišču</div></div>';
  }

  // Za vsako naročilo naloži pripadajoče škatle (da so številke vidne v seznamu)
  async function loadBoxiZaZahteve(){
    var seznam = state.zahteve.slice(0, 60);
    for(var i=0;i<seznam.length;i++){
      var z = seznam[i], kljuc = z.vir+":"+z.id;
      if(state.boxiZaZahtevo[kljuc] !== undefined) continue;
      try{
        var r = await sb.rpc("sklad_zahteva_skatle", { p_id: z.id, p_vir: z.vir });
        state.boxiZaZahtevo[kljuc] = (r && !r.error && r.data) ? r.data : [];
      }catch(e){ state.boxiZaZahtevo[kljuc] = []; }
    }
    if(state.tab==="zahteve" && state.zahLoaded) refreshZahteve();
  }

  async function loadZahteve(){
    if(!sb) return;
    try{
      state.zahteve = await rpcAll("sklad_zahteve");
      state.zahLoaded = true;
      renderMain();
      loadBoxiZaZahteve();
    }catch(err){
      state.zahLoaded = true;
      var c = el("content");
      if(c && state.tab==="zahteve") c.innerHTML = '<div class="alert err">Napaka pri nalaganju naročil: '+esc(err.message||err)+
        '<br><span style="font-size:12.5px">Če piše, da funkcija ne obstaja, poženi <b>sql/integracija.sql</b> v Supabase.</span></div>';
    }
  }

  function openZahteva(z){
    var kljuc = z.vir+":"+z.id;
    var naslovVrstica = [z.naslov, [z.postna_stevilka, z.mesto].filter(Boolean).join(" ")].filter(Boolean).join(", ");
    var dodatki = [];
    if(z.stopnice) dodatki.push("stopnice (nad 2 nadstropji)");
    if(z.pomoc_polnjenje) dodatki.push("pomoč pri polnjenju");
    var inner =
      '<div class="modal-h"><span>'+(z.vir==="narocilo"?"Naročilo":"Zahteva")+' '+esc(z.stevilka||("#"+z.id))+'</span><button class="x" id="mx">&times;</button></div>'+
      '<div class="mbody"><div class="dlist">'+
        drow("Vir", virChip(z.vir))+
        drow("Storitev", dash(z.vrsta))+
        drow("Št. boxov", z.st_boxov?String(z.st_boxov):'<span class="dash">–</span>')+
        drow("Stranka", dash(z.kupec)+(z.stevilka_stranke?' <span class="mono">('+esc(z.stevilka_stranke)+')</span>':''))+
        (state.isAdmin?drow("E-pošta", z.kupec_email?'<a href="mailto:'+esc(z.kupec_email)+'">'+esc(z.kupec_email)+'</a>':'<span class="dash">–</span>'):'')+
        (state.isAdmin?drow("Telefon", z.telefon?'<a href="tel:'+esc(String(z.telefon).replace(/\s/g,""))+'">'+esc(z.telefon)+'</a>':'<span class="dash">–</span>'):'')+
        drow("Naslov", naslovVrstica?esc(naslovVrstica):'<span class="dash">–</span>')+
        drow("Termin", (z.datum_dostave?fmtD(z.datum_dostave):"–")+(z.cas_dostave?' ob '+esc(String(z.cas_dostave).slice(0,5)):""))+
        (dodatki.length?drow("Dodatki", esc(dodatki.join(", "))):'')+
        (z.vir==="narocilo"?drow("Plačano", z.placano?'<span class="chip z-zakljuceno">Da</span>':'<span class="chip z-preklicano">Ne</span>'):'')+
        drow("Opomba", dash(z.opomba))+
        drow("Status", zChip(z.status))+
      '</div>'+
      // seznam za branje pokažemo samo, kadar ni seznama za izbiro boksov
      (jeIzbiraBoksov(z) ? '' : '<div id="zskatle" class="roinfo">Nalagam škatle...</div>')+
      prevzemBlok(z)+
      '<div class="fld" style="margin-top:12px"><label>Nov termin (neobvezno)</label><input type="date" id="z_datum" value="'+esc(String(z.datum_dostave||"").slice(0,10))+'" /></div>'+
      '<div id="z_err"></div></div>'+
      '<div class="mfoot">'+
        '<div class="zactions">'+
          Z_KORAKI.map(function(k){ return zBtn(z,k,Z_GUMBI[k]); }).join("")+
        '</div>'+
        '<span style="flex:1"></span><button class="btn ghost" id="z_close">Zapri</button>'+
      '</div>';
    showModal(inner);
    el("mx").onclick=closeModal;
    el("z_close").onclick=closeModal;
    Array.prototype.forEach.call(document.querySelectorAll(".zactions button[data-st]"), function(b){
      b.onclick=function(){ setZStatus(z, b.getAttribute("data-st")); };
    });
    if(jeIzbiraBoksov(z)) wirePrevzem(z);
    else loadZahtevaSkatle(z);
    void kljuc;
  }
  /* ---- Prevzem: koliko boxov je stranka res vzela ---- */
  function eur(n){
    if(n==null||n==="") return "–";
    try{ return new Intl.NumberFormat("sl-SI",{style:"currency",currency:"EUR"}).format(n); }
    catch(e){ return n+" €"; }
  }
  // Ali bo prikazan seznam s kljukicami za izbiro boksov?
  function jeIzbiraBoksov(z){
    return z.vir==="narocilo" && !!z.st_boxov && z.st_boxov_dejansko == null;
  }
  function prevzemBlok(z){
    if(z.vir!=="narocilo") return '';           // samo spletna naročila imajo ceno
    if(!z.st_boxov) return '';
    if(z.st_boxov_dejansko != null){
      return '<div class="prevzem done">'+
        '<div class="ph">Prevzem že zabeležen</div>'+
        '<div class="prow"><span>Naročeno</span><b>'+z.st_boxov+' boxov</b></div>'+
        '<div class="prow"><span>Stranka vzela</span><b>'+z.st_boxov_dejansko+' boxov</b></div>'+
        (Number(z.znesek_vracila)>0
          ? '<div class="prow vracilo"><span>Za vračilo stranki</span><b>'+eur(z.znesek_vracila)+'</b></div>'
          : '<div class="prow"><span>Vračilo</span><b>ni potrebno</b></div>')+
        '</div>';
    }
    return '<div class="prevzem">'+
      '<div class="ph">Prevzem – odkljukaj bokse, ki jih je stranka vzela</div>'+
      '<div class="pv-orodja">'+
        '<button type="button" class="btn ghost small" id="pv_vse">Označi vse</button>'+
        '<button type="button" class="btn ghost small" id="pv_nic">Počisti</button>'+
        '<button type="button" class="btn ghost small" id="pv_skener">Skeniraj box</button>'+
        '<span class="pv-stevec" id="pv_stevec">0 / '+z.st_boxov+'</span>'+
      '</div>'+
      '<div class="pv-seznam" id="pv_seznam"><div class="muted" style="padding:10px">Nalagam bokse...</div></div>'+
      '<div id="pv_izracun" class="pizracun">Označi bokse, ki jih je stranka vzela.</div>'+
      '<div class="hint">Neoznačeni boksi gredo ob kliku <b>Pri stranki</b> samodejno nazaj v zalogo.</div>'+
      '</div>';
  }

  // seznam boksov naročila s kljukicami
  async function wirePrevzem(z){
    var ovoj = el("pv_seznam"); if(!ovoj) return;
    var skatle = [];
    try{
      var r = await sb.rpc("sklad_skatle_narocila", { p_narocilo_id: z.id });
      if(r.error) throw r.error;
      skatle = r.data || [];
    }catch(e){
      ovoj.innerHTML = '<div class="alert err" style="margin:8px">Boksov ni bilo mogoče naložiti: '+esc(e.message||e)+'</div>';
      return;
    }
    if(!skatle.length){
      ovoj.innerHTML = '<div class="muted" style="padding:10px">Temu naročilu ni dodeljen noben boks.</div>';
      return;
    }
    ovoj.innerHTML = skatle.map(function(s){
      return '<label class="pv-vrstica">'+
        '<input type="checkbox" class="pv-check" value="'+s.id+'" data-bar="'+esc(s.barkoda||"")+'" checked />'+
        '<span class="pv-koda mono">'+esc(s.barkoda||("#"+s.id))+'</span>'+
        statusChip(s.status)+
        (s.lokacija?'<span class="pv-lok muted">'+esc(s.lokacija)+'</span>':'')+
        '</label>';
    }).join("");

    var checks = function(){ return Array.prototype.slice.call(document.querySelectorAll(".pv-check")); };
    var izbrani = function(){ return checks().filter(function(c){ return c.checked; }); };

    var osvezi = async function(){
      var n = izbrani().length, skupaj = skatle.length;
      var st = el("pv_stevec"); if(st) st.textContent = n+" / "+skupaj;
      var box = el("pv_izracun"); if(!box) return;
      if(n === skupaj){ box.className="pizracun"; box.textContent="Stranka vzame vse bokse – vračila ni."; return; }
      box.className="pizracun cakam"; box.textContent="Računam...";
      try{
        var r = await sb.rpc("sklad_predogled_vracila", { p_narocilo_id: z.id, p_st_boxov_dejansko: n });
        if(r.error) throw r.error;
        var d = (r.data&&r.data[0])||null;
        if(!d){ box.className="pizracun"; box.textContent="Izračuna ni bilo mogoče pripraviti."; return; }
        box.className="pizracun ok";
        box.innerHTML = '<div class="prow"><span>Cena prej ('+(d.naroceno||z.st_boxov)+' boxov)</span><b>'+eur(d.cena_prvotna)+'</b></div>'+
                        '<div class="prow"><span>Cena zdaj ('+n+' boxov)</span><b>'+eur(d.cena_koncna)+'</b></div>'+
                        '<div class="prow vracilo"><span>Za vračilo stranki</span><b>'+eur(d.vracilo)+'</b></div>'+
                        '<div class="prow"><span>V zalogo se vrne</span><b>'+(skupaj-n)+' boxov</b></div>';
      }catch(e){ box.className="pizracun"; box.textContent="Izračuna ni bilo mogoče pripraviti: "+(e.message||e); }
    };

    checks().forEach(function(c){ c.addEventListener("change", osvezi); });
    var vse=el("pv_vse"), nic=el("pv_nic"), skener=el("pv_skener");
    if(vse) vse.onclick=function(){ checks().forEach(function(c){ c.checked=true; }); osvezi(); };
    if(nic) nic.onclick=function(){ checks().forEach(function(c){ c.checked=false; }); osvezi(); };
    if(skener) skener.onclick=function(){ odpriSkenerZaPrevzem(osvezi); };
    osvezi();
  }

  // skeniranje bar kode odkljuka ustrezen boks v seznamu
  function odpriSkenerZaPrevzem(osvezi){
    var stari = el("pv_scanwrap");
    if(stari){ stopScanner(); stari.parentNode.removeChild(stari); return; }
    var wrap = document.createElement("div");
    wrap.id = "pv_scanwrap"; wrap.className = "pv-scan";
    wrap.innerHTML = '<div id="reader"></div><div class="scanres" id="pv_scanres"><span class="muted" style="font-size:13px">Usmeri kamero v bar kodo boksa.</span></div>';
    el("pv_seznam").parentNode.insertBefore(wrap, el("pv_seznam"));
    var res = el("pv_scanres");
    if(typeof Html5Qrcode==="undefined"){ res.innerHTML='<div class="alert err">Knjižnica za skeniranje se ni naložila.</div>'; return; }
    try{ scanner = new Html5Qrcode("reader"); }
    catch(e){ res.innerHTML='<div class="alert err">Skenerja ni bilo mogoče zagnati.</div>'; return; }
    scanner.start({facingMode:"environment"}, {fps:10, qrbox:{width:250,height:150}}, function(text){
      var c = Array.prototype.slice.call(document.querySelectorAll(".pv-check"))
        .filter(function(x){ return String(x.getAttribute("data-bar"))===String(text); })[0];
      if(c){
        c.checked = true;
        c.closest(".pv-vrstica").classList.add("skenirano");
        res.innerHTML = '<div class="alert info">Označen boks <b>'+esc(text)+'</b>.</div>';
        osvezi();
      } else {
        res.innerHTML = '<div class="alert err">Boks <b>'+esc(text)+'</b> ne pripada temu naročilu.</div>';
      }
    }, function(){}).catch(function(){
      res.innerHTML='<div class="alert err">Ni dostopa do kamere. Aplikacija mora teči prek https.</div>';
    });
  }

  function zBtn(z, st, label){
    var cur = zKey(z.status);
    if(cur===st) return '';
    var cls = (st==="preklicano") ? "btn ghost danger" : (st==="zakljuceno" ? "btn ghost" : "btn");
    return '<button class="'+cls+'" data-st="'+st+'">'+esc(label)+'</button>';
  }

  async function loadZahtevaSkatle(z){
    var box = el("zskatle"); if(!box) return;
    var kljuc = z.vir+":"+z.id;
    try{
      var arr = state.boxiZaZahtevo[kljuc];
      if(arr === undefined){
        var r = await sb.rpc("sklad_zahteva_skatle", { p_id: z.id, p_vir: z.vir });
        if(r.error) throw r.error;
        arr = r.data||[];
        state.boxiZaZahtevo[kljuc] = arr;
      }
      if(!arr.length){ box.innerHTML = 'Tej stranki ni dodeljena nobena škatla.'; return; }
      var vrstice = arr.map(function(s){
        return '<div class="boxrow"><span class="mono">'+esc(s.barkoda||("#"+s.id))+'</span>'+
               statusChip(s.status)+
               '<span class="muted">'+(s.lokacija?esc(s.lokacija):'lokacija ni določena')+'</span></div>';
      }).join("");
      box.innerHTML = '<div class="boxlist-h">Škatle stranke ('+arr.length+')</div><div class="boxlist">'+vrstice+'</div>'+
        '<div class="muted" style="font-size:12px;margin-top:6px">Ob spremembi stanja naročila se status teh škatel posodobi samodejno.</div>';
    }catch(e){
      box.innerHTML = '<div class="alert err" style="margin:0">Škatel ni bilo mogoče naložiti: '+esc(e.message||e)+'</div>';
    }
  }

  async function setZStatus(z, novKey){
    var errBox = el("z_err");
    var btns = document.querySelectorAll(".zactions button");
    Array.prototype.forEach.call(btns, function(b){ b.disabled=true; });
    var datum = el("z_datum") ? (el("z_datum").value||null) : null;
    try{
      var seznam = document.querySelectorAll(".pv-check");
      // "Pri stranki" pri spletnem naročilu = potrditev prevzema z izbranimi boksi
      if(novKey==="pri_stranki" && z.vir==="narocilo" && seznam.length){
        var izbrani = Array.prototype.slice.call(seznam)
          .filter(function(c){ return c.checked; })
          .map(function(c){ return Number(c.value); });
        if(!izbrani.length && !confirm("Ni označen noben boks. Naročilo bo preklicano, vsi boksi pa gredo nazaj v zalogo. Nadaljujem?")) {
          Array.prototype.forEach.call(btns, function(b){ b.disabled=false; });
          return;
        }
        stopScanner();
        var pr = await sb.rpc("sklad_potrdi_prevzem_izbrane", {
          p_narocilo_id: z.id, p_skatle: izbrani, p_opomba: null
        });
        if(pr.error) throw pr.error;
        var d = (pr.data&&pr.data[0])||{};
        if(datum && datum !== String(z.datum_dostave||"").slice(0,10)){
          await sb.rpc("sklad_update_zahteva", { p_id:z.id, p_vir:z.vir, p_status:null, p_opomba:null, p_datum_dostave:datum });
        }
        closeModal();
        var spor = "Prevzeto "+d.vzeto+" od "+d.naroceno+" boxov";
        if(Number(d.vrnjeno_v_zalogo)>0) spor += " · v zalogo "+d.vrnjeno_v_zalogo;
        if(Number(d.vracilo)>0) spor += " · vračilo "+eur(d.vracilo);
        toast(spor);
        state.zahLoaded=false; state.loaded=false; state.boxiZaZahtevo={};
        renderZahteveTab(); await loadZahteve(); loadBoxi();
        return;
      }
      var r = await sb.rpc("sklad_update_zahteva", {
        p_id: z.id, p_vir: z.vir,
        p_status: novKey,
        p_opomba: null,
        p_datum_dostave: datum
      });
      if(r.error) throw r.error;
      closeModal();
      state.zahLoaded=false; state.loaded=false; renderZahteveTab();
      await loadZahteve();
      loadBoxi();
    }catch(err){
      if(errBox) errBox.innerHTML='<div class="alert err">Napaka: '+esc(err.message||err)+'</div>';
      Array.prototype.forEach.call(btns, function(b){ b.disabled=false; });
    }
  }

  /* ------- Škatle ------- */
  function renderBoxiTab(){
    var c = el("content"); if(!c) return;
    if(!state.loaded){ c.innerHTML = '<div class="boot"><div class="spinner"></div></div>'; return; }
    var statusOpts = Object.keys(STATUSI).map(function(k){ return '<option value="'+k+'">'+esc(STATUSI[k])+'</option>'; }).join("");
    c.innerHTML =
      '<div class="stats" id="stats"></div>'+
      '<div class="toolbar">'+
      '<input class="search" id="q" placeholder="Iskanje: bar koda, stranka, št. naročila..." value="'+esc(state.q)+'" />'+
      '<select id="fStatus"><option value="">Vsi statusi</option>'+statusOpts+'</select>'+
      '<select id="fNar"><option value="">Vse naročnine</option><option value="aktivna">Aktivna</option><option value="zakljucena">Zaključena</option><option value="preklicana">Preklicana</option><option value="brez">Brez naročnine</option></select>'+
      '<span class="count" id="count"></span>'+
      '</div>'+
      '<div class="tablecard" id="tablecard"></div>';
    el("q").addEventListener("input", function(e){ state.q=e.target.value; refreshBoxi(); });
    el("fStatus").value=state.fStatus; el("fStatus").addEventListener("change", function(e){ state.fStatus=e.target.value; refreshBoxi(); });
    el("fNar").value=state.fNar; el("fNar").addEventListener("change", function(e){ state.fNar=e.target.value; refreshBoxi(); });
    refreshBoxi();
  }

  function boxColumns(){
    var cols = [
      {k:"barkoda", t:"Bar koda", r:function(x){return '<span class="mono">'+dash(x.barkoda)+'</span>';}},
      {k:"status", t:"Status", r:function(x){return statusChip(x.status);}},
      {k:"stevilka_stranke", t:"Št. stranke", r:function(x){return '<span class="mono">'+dash(x.stevilka_stranke)+'</span>';}},
      {k:"kupec", t:"Stranka", r:function(x){return dash(x.kupec);}}
    ];
    if(state.isAdmin){
      cols.push({k:"kupec_email", t:"E-pošta", r:function(x){return dash(x.kupec_email);}});
      cols.push({k:"telefon", t:"Telefon", r:function(x){return dash(x.telefon);}});
    }
    cols.push({k:"narocilo_stevilka", t:"Naročilo", r:function(x){return '<span class="mono">'+dash(x.narocilo_stevilka||x.narocilo_id)+'</span>';}});
    cols.push({k:"narocnina_status", t:"Naročnina", r:function(x){return dash(x.narocnina_status);}});
    cols.push({k:"datum_od", t:"Velja od", r:function(x){return x.datum_od?fmtD(x.datum_od):'<span class="dash">–</span>';}});
    cols.push({k:"datum_do", t:"Velja do", r:function(x){return x.datum_do?fmtD(x.datum_do):'<span class="dash">–</span>';}});
    cols.push({k:"lokacija", t:"Lokacija", r:function(x){return dash(x.lokacija);}});
    cols.push({k:"posodobljeno", t:"Posodobljeno", r:function(x){return x.posodobljeno?fmtDT(x.posodobljeno):'<span class="dash">–</span>';}});
    return cols;
  }

  function filteredBoxi(){
    var q = state.q.trim().toLowerCase();
    return state.boxes.filter(function(x){
      if(state.fStatus && x.status!==state.fStatus) return false;
      if(state.fNar){
        if(state.fNar==="brez"){ if(x.narocnina_id) return false; }
        else if((x.narocnina_status||"")!==state.fNar) return false;
      }
      if(q){
        var hay = [x.barkoda,x.kupec,x.stevilka_stranke,x.narocilo_stevilka,x.kupec_email,x.status].join(" ").toLowerCase();
        if(hay.indexOf(q)<0) return false;
      }
      return true;
    });
  }

  function sortRows(rows, key, dir){
    var copy = rows.slice();
    copy.sort(function(a,b){
      var av=a[key], bv=b[key];
      if(av==null) av=""; if(bv==null) bv="";
      if(typeof av==="number" && typeof bv==="number") return (av-bv)*dir;
      av=String(av).toLowerCase(); bv=String(bv).toLowerCase();
      if(av<bv) return -1*dir; if(av>bv) return 1*dir; return 0;
    });
    return copy;
  }

  function refreshBoxi(){
    var rows = sortRows(filteredBoxi(), state.sortKey, state.sortDir);
    var cols = boxColumns();
    var head = '<tr>'+cols.map(function(c){
      var ar = state.sortKey===c.k ? '<span class="ar">'+(state.sortDir>0?"▲":"▼")+'</span>' : '';
      return '<th data-k="'+c.k+'">'+esc(c.t)+ar+'</th>';
    }).join("")+'</tr>';
    var body;
    if(!rows.length){
      body = '<tr><td class="empty-cell" colspan="'+cols.length+'"><div class="empty"><img src="Slike/Skatle.png" alt="" /><div>Ni zadetkov.</div></div></td></tr>';
    }else{
      body = rows.map(function(x){ return '<tr class="rowlink" data-id="'+x.id+'">'+cols.map(function(c){ return '<td data-l="'+esc(c.t)+'">'+c.r(x)+'</td>'; }).join("")+'</tr>'; }).join("");
    }
    el("tablecard").innerHTML = '<div class="tablescroll"><table><thead>'+head+'</thead><tbody>'+body+'</tbody></table></div>';
    var cnt = el("count"); if(cnt) cnt.textContent = rows.length+" / "+state.boxes.length+" škatel";
    Array.prototype.forEach.call(document.querySelectorAll("#tablecard th"), function(th){
      th.addEventListener("click", function(){ var k=th.getAttribute("data-k"); if(state.sortKey===k) state.sortDir*=-1; else{ state.sortKey=k; state.sortDir=1; } refreshBoxi(); });
    });
    Array.prototype.forEach.call(document.querySelectorAll("#tablecard tbody tr[data-id]"), function(tr){
      tr.addEventListener("click", function(){ var id=tr.getAttribute("data-id"); var b=state.boxes.filter(function(x){return String(x.id)===id;})[0]; if(b) openDetail(b); });
    });
    renderStats();
  }

  function renderStats(){
    var box = el("stats"); if(!box) return;
    var counts = {}; Object.keys(STATUSI).forEach(function(k){counts[k]=0;});
    state.boxes.forEach(function(x){ var k=x.status||"na_zalogi"; counts[k]=(counts[k]||0)+1; });
    var order = ["na_zalogi","rezervirana","v_transportu","pri_stranki","v_skladiscu"];
    var dotc = {na_zalogi:"#8a94a3",rezervirana:"var(--brand)",v_transportu:"var(--violet)",pri_stranki:"var(--amber)",v_skladiscu:"var(--green)"};
    var html = '<div class="stat"><div class="n">'+state.boxes.length+'</div><div class="l">Vse škatle</div></div>';
    order.forEach(function(k){ if(counts[k]!==undefined) html+='<div class="stat"><div class="n"><span class="dot" style="background:'+dotc[k]+'"></span>'+counts[k]+'</div><div class="l">'+STATUSI[k]+'</div></div>'; });
    box.innerHTML = html;
  }

  async function rpcAll(fn){
    var all=[], from=0, size=1000, guard=0;
    while(true){
      var r = await sb.rpc(fn, { p_offset:from, p_limit:size });
      if(r.error) throw r.error;
      var chunk = r.data||[];
      all = all.concat(chunk);
      if(chunk.length < size) break;
      from += size;
      if(++guard > 500) break;
    }
    return all;
  }

  async function loadBoxi(){
    if(!sb) return;
    try{
      state.boxes = await rpcAll("sklad_boxi");
      state.loaded = true;
      if(state.tab==="boxi") renderBoxiTab();
    }catch(err){
      state.loaded = true;
      var c = el("content"); if(c) c.innerHTML = '<div class="alert err">Napaka pri nalaganju podatkov: '+esc(err.message||err)+'</div>';
    }
  }

  /* ------- Zgodovina (admin) ------- */
  function renderZgodovinaTab(){
    var c = el("content"); if(!c) return;
    if(!state.dogLoaded){ c.innerHTML = '<div class="boot"><div class="spinner"></div></div>'; return; }
    c.innerHTML =
      '<div class="toolbar">'+
      '<input class="search" id="dq" placeholder="Iskanje: bar koda, dejanje, uporabnik..." value="'+esc(state.dq)+'" />'+
      '<span class="count" id="dcount"></span>'+
      '</div><div class="tablecard" id="dtablecard"></div>';
    el("dq").addEventListener("input", function(e){ state.dq=e.target.value; refreshDog(); });
    refreshDog();
  }

  function refreshDog(){
    var cols = [
      {k:"cas", t:"Čas", r:function(x){return fmtDT(x.cas);}},
      {k:"barkoda", t:"Bar koda", r:function(x){return '<span class="mono">'+dash(x.barkoda)+'</span>';}},
      {k:"dejanje", t:"Dejanje", r:function(x){return dash(x.dejanje);}},
      {k:"status_nov", t:"Nov status", r:function(x){return x.status_nov?statusChip(x.status_nov):'<span class="dash">–</span>';}},
      {k:"lokacija", t:"Lokacija", r:function(x){return dash(x.lokacija);}},
      {k:"uporabnik", t:"Uporabnik", r:function(x){return dash(x.uporabnik);}},
      {k:"opomba", t:"Opomba", r:function(x){return dash(x.opomba);}}
    ];
    var q = state.dq.trim().toLowerCase();
    var rows = state.dogodki.filter(function(x){
      if(!q) return true;
      return [x.barkoda,x.dejanje,x.uporabnik,x.opomba,x.status_nov].join(" ").toLowerCase().indexOf(q)>=0;
    });
    rows = sortRows(rows, state.dSortKey, state.dSortDir);
    var head = '<tr>'+cols.map(function(c){ var ar=state.dSortKey===c.k?'<span class="ar">'+(state.dSortDir>0?"▲":"▼")+'</span>':''; return '<th data-k="'+c.k+'">'+esc(c.t)+ar+'</th>'; }).join("")+'</tr>';
    var body = rows.length ? rows.map(function(x){ return '<tr>'+cols.map(function(c){return '<td data-l="'+esc(c.t)+'">'+c.r(x)+'</td>';}).join("")+'</tr>'; }).join("")
      : '<tr><td class="empty-cell" colspan="'+cols.length+'"><div class="empty">Ni zapisov v zgodovini.</div></td></tr>';
    el("dtablecard").innerHTML = '<div class="tablescroll"><table><thead>'+head+'</thead><tbody>'+body+'</tbody></table></div>';
    var dc = el("dcount"); if(dc) dc.textContent = rows.length+" zapisov";
    Array.prototype.forEach.call(document.querySelectorAll("#dtablecard th"), function(th){
      th.addEventListener("click", function(){ var k=th.getAttribute("data-k"); if(state.dSortKey===k) state.dSortDir*=-1; else{ state.dSortKey=k; state.dSortDir=1; } refreshDog(); });
    });
  }

  async function loadDogodki(){
    if(!sb || !state.isAdmin) return;
    if(state.dogLoaded){ renderZgodovinaTab(); return; }
    try{
      state.dogodki = await rpcAll("sklad_dogodki");
      state.dogLoaded = true;
      if(state.tab==="zgodovina") renderZgodovinaTab();
    }catch(err){
      state.dogLoaded = true;
      var c = el("content"); if(c) c.innerHTML = '<div class="alert err">Napaka: '+esc(err.message||err)+'</div>';
    }
  }

  /* ---------------- MODAL / PODROBNOSTI ---------------- */
  function showModal(inner){
    closeModal();
    var ov=document.createElement("div"); ov.className="overlay"; ov.id="overlay";
    ov.innerHTML='<div class="modal">'+inner+'</div>';
    document.body.appendChild(ov);
    ov.addEventListener("click", function(e){ if(e.target===ov) closeModal(); });
  }
  function closeModal(){ stopScanner(); var ov=el("overlay"); if(ov&&ov.parentNode) ov.parentNode.removeChild(ov); }
  function fld(label,input){ return '<div class="fld"><label>'+esc(label)+'</label>'+input+'</div>'; }
  function drow(k,v){ return '<div class="drow"><span class="dk">'+esc(k)+'</span><span class="dv">'+v+'</span></div>'; }

  function openDetail(box){
    var admin=state.isAdmin, inner='';
    inner+='<div class="modal-h"><span>Škatla '+esc(box.barkoda)+'</span><button class="x" id="mx">&times;</button></div>';
    if(admin){
      var statusOpts=Object.keys(STATUSI).map(function(k){ return '<option value="'+k+'"'+(box.status===k?' selected':'')+'>'+esc(STATUSI[k])+'</option>'; }).join("");
      var narOpts=["aktivna","pavza","zakljucena","preklicana"].map(function(k){ return '<option value="'+k+'"'+(box.narocnina_status===k?' selected':'')+'>'+esc(k)+'</option>'; }).join("");
      inner+='<div class="mbody"><div class="fgrid">'+
        fld("Bar koda",'<input id="d_barkoda" value="'+esc(box.barkoda||"")+'" />')+
        fld("Status",'<select id="d_status">'+statusOpts+'</select>')+
        fld("Stranka (e-pošta)",'<input id="d_kupec" value="'+esc(box.kupec_email||"")+'" placeholder="prazno = brez stranke" />')+
        fld("Lokacija (oznaka)",'<input id="d_lokacija" value="'+esc(box.lokacija||"")+'" placeholder="npr. A-01-03" />')+
        (box.narocnina_id?fld("Naročnina",'<select id="d_narstatus">'+narOpts+'</select>'):'')+
        (box.narocnina_id?fld("Velja od",'<input type="date" id="d_od" value="'+esc(String(box.datum_od||"").slice(0,10))+'" />'):'')+
        (box.narocnina_id?fld("Velja do",'<input type="date" id="d_do" value="'+esc(String(box.datum_do||"").slice(0,10))+'" />'):'')+
        fld("Opomba",'<textarea id="d_opomba" rows="2">'+esc(box.opomba||"")+'</textarea>')+
        '</div>'+
        '<div class="roinfo">Št. stranke: <b>'+dash(box.stevilka_stranke)+'</b> &middot; Naročilo: <b>'+dash(box.narocilo_stevilka||box.narocilo_id)+'</b> &middot; ID: '+box.id+'</div>'+
        '<div id="d_err"></div></div>'+
        '<div class="mfoot"><button class="btn ghost" id="d_print">Natisni bar kodo</button><span style="flex:1"></span><button class="btn ghost" id="d_cancel">Prekliči</button><button class="btn" id="d_save">Shrani</button></div>';
    }else{
      inner+='<div class="mbody"><div class="dlist">'+
        drow("Bar koda",'<span class="mono">'+esc(box.barkoda)+'</span>')+
        drow("Status",statusChip(box.status))+
        drow("Stranka",dash(box.kupec))+
        drow("Št. stranke",dash(box.stevilka_stranke))+
        drow("Naročilo",dash(box.narocilo_stevilka||box.narocilo_id))+
        drow("Naročnina",dash(box.narocnina_status))+
        drow("Velja od",box.datum_od?fmtD(box.datum_od):"–")+
        drow("Velja do",box.datum_do?fmtD(box.datum_do):"–")+
        drow("Lokacija",dash(box.lokacija))+
        drow("Opomba",dash(box.opomba))+
        drow("Posodobljeno",box.posodobljeno?fmtDT(box.posodobljeno):"–")+
        '</div></div>'+
        '<div class="mfoot"><button class="btn ghost" id="d_print">Natisni bar kodo</button><span style="flex:1"></span><button class="btn" id="d_cancel">Zapri</button></div>';
    }
    showModal(inner);
    el("mx").onclick=closeModal;
    el("d_cancel").onclick=closeModal;
    el("d_print").onclick=function(){ printBarcode(box); };
    if(admin){ var sv=el("d_save"); if(sv) sv.onclick=function(){ saveBox(box); }; }
  }

  async function saveBox(box){
    var g=function(id){ var e=el(id); return e?e.value:null; };
    var payload={ p_id:box.id, p_barkoda:g("d_barkoda"), p_status:g("d_status"),
      p_kupec_email:g("d_kupec"), p_lokacija_koda:g("d_lokacija"), p_opomba:g("d_opomba"),
      p_datum_od:(g("d_od")||null), p_datum_do:(g("d_do")||null), p_nar_status:(g("d_narstatus")||null) };
    var btn=el("d_save"); if(btn){ btn.disabled=true; btn.textContent="Shranjujem..."; }
    try{
      var r=await sb.rpc("sklad_update_box", payload);
      if(r.error) throw r.error;
      closeModal();
      state.loaded=false; renderBoxiTab(); await loadBoxi();
    }catch(err){
      var e=el("d_err"); if(e) e.innerHTML='<div class="alert err">Napaka: '+esc(err.message||err)+'</div>';
      if(btn){ btn.disabled=false; btn.textContent="Shrani"; }
    }
  }

  function printBarcode(box){
    var w=window.open("","_blank","width=460,height=340");
    if(!w){ alert("Dovoli pojavna okna za tiskanje bar kode."); return; }
    var val=JSON.stringify(String(box.barkoda||""));
    var owner=esc(box.kupec||box.stevilka_stranke||"—");
    var html='<!DOCTYPE html><html><head><meta charset="utf-8"><title>Bar koda '+esc(box.barkoda)+'</title>'+
      '<style>body{font-family:Arial,sans-serif;text-align:center;margin:26px;color:#222}h2{margin:0 0 2px;font-size:20px}.sub{color:#666;font-size:13px;margin-bottom:16px}svg{max-width:100%}</style>'+
      '<scr'+'ipt src="https://cdn.jsdelivr.net/npm/jsbarcode@3.11.6/dist/JsBarcode.all.min.js"></scr'+'ipt></head>'+
      '<body><h2>Rabimbox</h2><div class="sub">'+owner+'</div><svg id="bc"></svg>'+
      '<scr'+'ipt>window.onload=function(){try{JsBarcode("#bc",'+val+',{format:"CODE128",displayValue:true,fontSize:18,height:80,margin:10});}catch(e){document.body.insertAdjacentHTML("beforeend","<p>Napaka pri risanju kode.</p>");}setTimeout(function(){window.print();},350);};</scr'+'ipt>'+
      '</body></html>';
    w.document.open(); w.document.write(html); w.document.close();
  }

  /* ---------------- SKENER ---------------- */
  var scanner=null;
  function openScanner(){
    showModal('<div class="modal-h"><span>Skeniraj bar kodo</span><button class="x" id="mx">&times;</button></div>'+
      '<div class="mbody"><div id="reader"></div><div class="scanres" id="scanres"><span class="muted" style="font-size:13px">Usmeri kamero v bar kodo škatle.</span></div></div>'+
      '<div class="mfoot"><span style="flex:1"></span><button class="btn ghost" id="scanclose">Zapri</button></div>');
    el("mx").onclick=closeModal;
    el("scanclose").onclick=closeModal;
    startScanner();
  }
  function startScanner(){
    var res=el("scanres");
    if(typeof Html5Qrcode==="undefined"){ if(res) res.innerHTML='<div class="alert err">Knjižnica za skeniranje se ni naložila (preveri internet).</div>'; return; }
    try{ localStorage.setItem("rb_cam","1"); }catch(e){}
    try{ scanner=new Html5Qrcode("reader"); }catch(e){ if(res) res.innerHTML='<div class="alert err">Napaka pri zagonu skenerja.</div>'; return; }
    var fmts=[];
    try{ fmts=[Html5QrcodeSupportedFormats.CODE_128,Html5QrcodeSupportedFormats.CODE_39,Html5QrcodeSupportedFormats.EAN_13,Html5QrcodeSupportedFormats.QR_CODE]; }catch(e){ fmts=undefined; }
    var config={ fps:10, qrbox:{width:260,height:160} };
    if(fmts) config.formatsToSupport=fmts;
    scanner.start({facingMode:"environment"}, config, onScanSuccess, function(){})
      .catch(function(err){
        if(res) res.innerHTML='<div class="alert err">Ni dostopa do kamere. Če odpiraš aplikacijo kot datoteko (file://), brskalnik kamere pogosto ne dovoli — objavi aplikacijo na spletu (https) ali dovoli dostop do kamere v brskalniku.</div>';
      });
  }
  function onScanSuccess(text){
    stopScanner();
    var res=el("scanres"); if(!res) return;
    var box=state.boxes.filter(function(b){ return String(b.barkoda)===String(text); })[0];
    if(box){
      res.innerHTML='<div class="alert info">Škatla <b>'+esc(box.barkoda)+'</b> — '+(box.kupec?('lastnik: <b>'+esc(box.kupec)+'</b> (št. stranke '+esc(box.stevilka_stranke||"-")+')'):'ni dodeljena nobeni stranki')+'.</div>'+
        '<button class="btn" id="opendet">Odpri podrobnosti</button> <button class="btn ghost" id="again">Skeniraj znova</button>';
      var od=el("opendet"); if(od) od.onclick=function(){ closeModal(); openDetail(box); };
    }else{
      res.innerHTML='<div class="alert err">Škatle s kodo <b>'+esc(text)+'</b> ni v sistemu.</div><button class="btn ghost" id="again">Skeniraj znova</button>';
    }
    var ag=el("again"); if(ag) ag.onclick=function(){ res.innerHTML='<span class="muted" style="font-size:13px">Usmeri kamero v bar kodo škatle.</span>'; startScanner(); };
  }
  function stopScanner(){
    if(scanner){ var s=scanner; scanner=null; try{ s.stop().then(function(){ try{ s.clear(); }catch(e){} }).catch(function(){}); }catch(e){} }
  }

  /* ---------------- INIT ---------------- */
  if(!sb){
    APP.innerHTML = '<div class="login-wrap"><div class="login-card"><div class="alert err">Ni bilo mogoče naložiti Supabase. Preveri internetno povezavo.</div></div></div>';
  }else{
    sb.auth.getSession().then(function(s){
      var user = s && s.data && s.data.session ? s.data.session.user : null;
      // vlogo preveri afterLogin() prek baze; brez seje gremo na prijavo
      if(user){ afterLogin(); } else { viewLogin(); }
    }).catch(function(){ viewLogin(); });
  }
})();
