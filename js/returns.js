(function(){
  'use strict';
  var esc=function(s){return String(s==null?'':s).replace(/[&<>"']/g,function(c){return {'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c];});};
  var money=function(c){return new Intl.NumberFormat('sl-SI',{style:'currency',currency:'EUR'}).format(Number(c)/100);};
  async function invoke(sb,action,body){
    var r=await sb.functions.invoke('rb-billing',{body:Object.assign({action:action},body)});
    if(r.error){var detail=r.error.context&&await r.error.context.json().catch(function(){return null;});throw new Error(detail&&detail.error||r.error.message);}
    if(r.data&&r.data.error)throw new Error(r.data.error);return r.data;
  }
  async function returnRequest(ctx){
    var b=ctx.button,label=b.textContent;b.disabled=true;
    try{
      var p=await ctx.sb.rpc('sklad_predogled_vracila_zahtevka',{p_id:ctx.request.id});if(p.error)throw p.error;
      var q=p.data;
      if(!confirm('V zalogo vrnem '+q.return_count+' boxov iz tega zahtevka?\n\nPreveri vračilo denarja.\n\n'+
        (q.remaining_count?'Naročilo ostane aktivno. Preostalih dodeljenih boxov: '+q.remaining_count+'.':'Po vračilu bo naročilo zaključeno.')))return;
      b.textContent='Vračam...';
      var r=await ctx.sb.rpc('sklad_vrni_zahtevek',{p_id:ctx.request.id});if(r.error)throw r.error;
      var result=r.data;
      if(result.order_closed){
        try{var mail=await ctx.sb.functions.invoke('poslji-obvestilo',{body:{tip:'zakljucek',narocilo_id:result.order_id}});if(mail.error)console.warn('Zahvala ni poslana',mail.error);}catch(e){console.warn('Zahvala ni poslana',e);}
      }
      await ctx.refresh('Vrnjeni boxi: '+result.returned_count+(result.order_closed?' · naročilo zaključeno':result.remaining_count?' · naročilo ostane aktivno':' · zahtevek obdelan'));
    }catch(e){ctx.error(e.message||String(e));}finally{b.disabled=false;b.textContent=label;}
  }
  function refundStatus(r){
    if(r.status==='prepared')return 'Vračilo plačila še ni zaključeno';
    if(r.status==='manual')return 'Za ročno izplačilo';
    if(r.mode==='zero')return 'Med paketoma ni razlike za vračilo';
    return {succeeded:'Vračilo izvedeno v Stripe',pending:'Vračilo v obdelavi Stripe',failed:'Vračilo zavrnjeno v Stripe',canceled:'Vračilo preklicano v Stripe',requires_action:'Stripe zahteva ukrep'}[r.provider_status]||'Vračilo oddano v Stripe';
  }
  async function loadHistory(ctx){
    if(!ctx.host)return;
    try{
      var data=await invoke(ctx.sb,'box_refund_list',{order_id:ctx.order.id});
      if(!ctx.host.isConnected)return;
      ctx.host.innerHTML=(data.refunds||[]).map(function(r){
        var pdf=r.pdf_url&&/^https:\/\/(?:[a-z0-9-]+\.)*stripe\.com\//i.test(r.pdf_url)?'<a href="'+esc(r.pdf_url)+'" target="_blank" rel="noopener">Dobropis '+esc(r.credit_note_number||'')+'</a>':'';
        return '<div class="roinfo"><strong>Vračilo '+esc(money(r.amount_cents))+'</strong> · '+esc(refundStatus(r))+
          '<div>'+esc((r.details.box_codes||[]).join(', '))+(r.details.kind==='initial_delivery'?' · ob prvi dostavi prevzeto '+esc(r.details.accepted_box_count)+' od '+esc(r.details.ordered_box_count)+' boxov':'')+'</div>'+
          (r.error?'<div class="alert err">'+esc(r.error)+'</div>':'')+(r.status_note?'<div>'+esc(r.status_note)+'</div>':'')+pdf+'</div>';
      }).join('');
    }catch(e){if(ctx.host.isConnected)ctx.host.innerHTML='<div class="alert err">Vračila: '+esc(e.message||String(e))+'</div>';}
  }
  window.RBReturns={returnRequest:returnRequest,loadHistory:loadHistory};
})();
