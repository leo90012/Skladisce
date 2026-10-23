(function(){
  "use strict";
  window.RBAdminBilling={mount:async function(opts){
    var sb=opts.sb,host=opts.host,offset=0,esc=opts.esc;
    function api(action,body){return sb.functions.invoke("rb-billing",{body:Object.assign({action:action},body||{})}).then(async function(r){if(r.error){var b=r.error.context&&await r.error.context.json().catch(function(){return null;});throw new Error(b&&b.error||r.error.message);}if(r.data&&r.data.error)throw new Error(r.data.error);return r.data;});}
    function save(bytes,name,type){var url=URL.createObjectURL(new Blob([bytes],{type:type})),a=document.createElement("a");a.href=url;a.download=name;a.click();setTimeout(function(){URL.revokeObjectURL(url);},10000);}
    function badge(r){return r.is_test?' <span class="chip">TEST</span>':'';}
    async function load(){
      host.innerHTML='<div class="boot"><div class="spinner"></div></div>';
      try{
        var d=await api("admin_list",{offset:offset});
        host.innerHTML='<h1>E-pošta in računi</h1><p class="muted">Pregled evidentiranih sporočil in računov. Starejšo pošto lahko uvozite, če jo ponudnik še hrani. Status dostave se osveži ob odprtju sporočila.</p>'+
          '<div class="toolbar"><button class="btn ghost" id="rbImportHistory">Uvozi dostopno zgodovino pošte</button><button class="btn ghost" id="rbAllContacts">Izvozi vse kontakte (CSV)</button><button class="btn" id="rbMarketing">Izvozi promocijski seznam (CSV)</button></div>'+
          '<div id="rbAdminError"></div><h2>E-pošta</h2><div class="table-wrap"><table><thead><tr><th>Datum</th><th>Prejemnik</th><th>Zadeva</th><th>Status</th><th>Naročilo</th><th></th></tr></thead><tbody>'+
          d.emails.map(function(m){return '<tr><td>'+esc(opts.fmtDT(m.sent_at||m.created_at))+'</td><td>'+esc(m.recipient)+'</td><td>'+esc(m.subject)+badge(m)+'</td><td>'+esc(m.status)+(m.error?'<br><small>'+esc(m.error)+'</small>':'')+'</td><td>'+esc(m.narocilo_id||'–')+'</td><td><button class="btn ghost small rbEmail" data-id="'+m.id+'">Odpri</button></td></tr>';}).join('')+
          '</tbody></table>'+(d.emails.length?'':'<p class="muted">Ni evidentiranih sporočil.</p>')+'</div><h2>Računi</h2><div class="table-wrap"><table><thead><tr><th>Številka</th><th>Stranka</th><th>Obdobje</th><th>Znesek</th><th>Status</th><th></th></tr></thead><tbody>'+
          d.invoices.map(function(r){return '<tr><td>'+esc(r.stripe_stevilka||r.stevilka)+badge(r)+'</td><td>'+esc(r.email||'')+'</td><td>'+esc(r.opis||'')+'</td><td>'+esc(Number(r.znesek||0).toFixed(2).replace('.',','))+' €</td><td>'+esc(r.is_test?'Testni dokument':r.placano||['placan','poslan','posiljanje'].indexOf(r.status)>=0?'Plačano':r.status||'Neplačano')+'</td><td><button class="btn ghost small rbInvoice" data-id="'+r.id+'" '+(r.placano||['placan','poslan','posiljanje'].indexOf(r.status)>=0?'':'disabled')+'>Prenesi PDF</button></td></tr>';}).join('')+
          '</tbody></table></div><div class="toolbar"><button class="btn ghost" id="rbPrev" '+(offset?'':'disabled')+'>Prejšnja stran</button><span>Od zapisa '+(offset+1)+'</span><button class="btn ghost" id="rbNext" '+(d.has_more?'':'disabled')+'>Naslednja stran</button></div>';
        document.getElementById('rbPrev').onclick=function(){offset=Math.max(0,offset-100);load();};document.getElementById('rbNext').onclick=function(){offset+=100;load();};
        document.getElementById('rbImportHistory').onclick=async function(){var b=this,total=0,after=null;b.disabled=true;try{do{var part=await api('history_import',{after:after||''});total+=part.imported;after=part.after;if(after)await new Promise(function(resolve){setTimeout(resolve,600);});}while(after);opts.toast('Uvoženih sporočil: '+total);await load();}catch(e){showError(e);b.disabled=false;}};
        document.getElementById('rbAllContacts').onclick=function(){exportContacts(false);};document.getElementById('rbMarketing').onclick=function(){exportContacts(true);};
        host.querySelectorAll('.rbEmail').forEach(function(b){b.onclick=function(){openEmail(Number(b.dataset.id));};});
        host.querySelectorAll('.rbInvoice').forEach(function(b){b.onclick=async function(){b.disabled=true;try{var r=await sb.functions.invoke('poslji-racun',{body:{racun_id:Number(b.dataset.id),tip:'racun',download:true}});if(r.error||!r.data||!r.data.pdf)throw new Error(r.data&&r.data.error||'Prenos računa ni uspel.');save(Uint8Array.from(atob(r.data.pdf),function(c){return c.charCodeAt(0);}),r.data.filename,'application/pdf');}catch(e){showError(e);}b.disabled=false;};});
      }catch(e){host.innerHTML='<h1>E-pošta in računi</h1><div class="alert err">'+esc(e.message||e)+'</div>';}
    }
    function showError(e){var box=document.getElementById('rbAdminError');if(box)box.innerHTML='<div class="alert err">'+esc(e.message||e)+'</div>';else alert(e.message||e);}
    async function exportContacts(marketing){try{var d=await api('contacts',{marketing:marketing});save(d.csv,marketing?'rabimbox-promocijski-kontakti.csv':'rabimbox-vsi-kontakti.csv','text/csv;charset=utf-8');opts.toast('Izvoženih kontaktov: '+d.count);}catch(e){showError(e);}}
    async function openEmail(id){try{var d=await api('admin_email',{id:id}),m=d.email;opts.openModal('<div class="modal-h"><span>'+esc(m.subject)+'</span><button class="x" id="rbCloseMail">×</button></div><div class="mbody"><p>'+esc(m.recipient)+' · '+esc(opts.fmtDT(m.created_at))+' · '+esc(m.status)+'</p><iframe title="Vsebina sporočila" sandbox="" id="rbMailFrame" style="width:100%;height:420px;border:1px solid #ddd;background:white"></iframe><div class="mfoot"><button class="btn ghost" id="rbResend">Pošlji ponovno</button></div></div>');document.getElementById('rbCloseMail').onclick=opts.closeModal;document.getElementById('rbMailFrame').srcdoc=m.html||'<p>Vsebina ni na voljo.</p>';document.getElementById('rbResend').onclick=async function(){if(!confirm('Ponovno pošljem sporočilo na '+m.recipient+'?'))return;this.disabled=true;try{await api('resend',{id:id});opts.toast('Sporočilo je poslano.');opts.closeModal();load();}catch(e){alert(e.message||e);this.disabled=false;}};}catch(e){showError(e);}}
    await load();
  }};
})();
