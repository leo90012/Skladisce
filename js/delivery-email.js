(function(){
  "use strict";
  var MAX_BYTES=10*1024*1024;
  function checkFiles(files){
    if(!files.length||files.length>5)throw new Error("Dodaj od 1 do 5 skenov podpisane pogodbe.");
    var size=0;files.forEach(function(file){if(!/\.(pdf|jpe?g|png)$/i.test(file.name))throw new Error("Pogodbo dodaj kot PDF, JPG ali PNG.");size+=file.size;});
    if(size>MAX_BYTES)throw new Error("Skupna velikost priponk je lahko največ 10 MB.");
  }
  function encodeFile(file){return new Promise(function(resolve,reject){var reader=new FileReader();reader.onerror=function(){reject(new Error("Datoteke ni mogoče prebrati."));};reader.onload=function(){resolve({filename:file.name,content:String(reader.result).split(",")[1]});};reader.readAsDataURL(file);});}
  async function open(opts){
    var esc=opts.esc,host,requestId=window.crypto.randomUUID();
    function showError(error){var box=host&&host.querySelector('#rbDraftError');if(box)box.textContent=error.message||String(error);}
    async function invoke(body){var r=await opts.sb.functions.invoke('poslji-obvestilo',{body:body});if(r.error){var details=r.error.context&&await r.error.context.json().catch(function(){return null;});throw new Error(details&&details.error||r.error.message);}if(!r.data||r.data.error)throw new Error(r.data&&r.data.error||"Sporočila ni mogoče pripraviti.");return r.data;}
    opts.openModal('<div class="modal-h"><span>E-pošta s podpisano pogodbo</span><button class="x" id="rbDraftClose">×</button></div><div class="mbody"><p>Pripravljam predogled…</p><div id="rbDraftError" class="alert err hidden"></div></div>');
    host=document.getElementById('overlay');host.querySelector('#rbDraftClose').onclick=opts.closeModal;
    try{
      var draft=await invoke({tip:'dostava_osnutek',narocilo_id:opts.order.id});
      if(!host.isConnected)return;
      opts.openModal('<div class="modal-h"><span>E-pošta s podpisano pogodbo</span><button class="x" id="rbDraftClose">×</button></div>'+
        '<div class="mbody"><p class="muted">Dodaj sken podpisane pogodbe in pošlji stranki.</p>'+
        '<div class="dlist"><div class="drow"><span class="dk">Prejemnik</span><span class="dv">'+esc(draft.to)+'</span></div><div class="drow"><span class="dk">Zadeva</span><span class="dv">'+esc(draft.subject)+'</span></div></div>'+
        '<iframe title="Predogled dostavnega sporočila" id="rbDraftPreview" sandbox="" style="width:100%;height:380px;border:1px solid #e4e9f1;border-radius:10px;margin:14px 0;background:white"></iframe>'+
        '<div class="fld"><label for="rbDraftFiles">Podpisana pogodba</label><input id="rbDraftFiles" type="file" accept=".pdf,.jpg,.jpeg,.png" multiple /><small>PDF, JPG ali PNG · do 5 datotek, skupaj največ 10 MB.</small></div>'+
        '<p id="rbDraftFilesInfo" class="muted" aria-live="polite"></p><div id="rbDraftError" role="alert" style="color:var(--red)"></div></div>'+
        '<div class="mfoot"><button class="btn" id="rbDraftSend" disabled>Pošlji stranki</button><button class="btn ghost" id="rbDraftCancel">Zapri</button></div>');
      host=document.getElementById('overlay');host.querySelector('#rbDraftPreview').srcdoc=draft.html;
      host.querySelector('#rbDraftClose').onclick=opts.closeModal;host.querySelector('#rbDraftCancel').onclick=opts.closeModal;
      var input=host.querySelector('#rbDraftFiles'),send=host.querySelector('#rbDraftSend'),info=host.querySelector('#rbDraftFilesInfo');
      input.onchange=function(){requestId=window.crypto.randomUUID();send.disabled=true;host.querySelector('#rbDraftError').textContent='';var files=Array.from(input.files||[]);try{checkFiles(files);info.textContent='Priloženo: '+files.map(function(f){return f.name;}).join(', ');send.disabled=false;}catch(error){info.textContent='';if(files.length)showError(error);}};
      send.onclick=async function(){
        if(send.disabled)return;
        send.disabled=true;input.disabled=true;send.textContent='Pošiljam…';host.querySelector('#rbDraftError').textContent='';
        try{var files=Array.from(input.files||[]);checkFiles(files);var attachments=await Promise.all(files.map(encodeFile));var result=await invoke({tip:'dostava_pogodba',narocilo_id:opts.order.id,send_confirmed:true,request_id:requestId,attachments:attachments});
          if(host.isConnected)opts.closeModal();opts.toast(result.skipped?'Sporočilo je že poslano ali se še pošilja.':'Sporočilo s pogodbo je poslano.');
        }catch(error){showError(error);send.disabled=false;input.disabled=false;send.textContent='Pošlji stranki';}
      };
    }catch(error){if(host&&host.isConnected){var box=host.querySelector('#rbDraftError');if(box)box.classList.remove('hidden');showError(error);}}
  }
  window.RBDeliveryEmail={open:open};
})();
