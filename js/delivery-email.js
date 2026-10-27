(function(){
  "use strict";
  function date(value){var p=String(value||"").slice(0,10).split("-");return p.length===3?p[2]+". "+p[1]+". "+p[0]:"";}
  function build(order){
    var name=String(order.kupec||"").trim().split(/\s+/)[0];
    var address=[order.naslov,[order.postna_stevilka,order.mesto].filter(Boolean).join(" ")].filter(Boolean).join(", ");
    var count=order.st_boxov_dejansko!=null?order.st_boxov_dejansko:order.st_boxov;
    var lines=["Pozdravljeni"+(name?" "+name:"")+",","",
      "vaše boxe smo dostavili na dogovorjeni naslov. Hvala, ker uporabljate Rabimbox.","",
      "V priponki vam pošiljamo kopijo pogodbe, ki ste jo podpisali ob dostavi.","",
      "Številka naročila: "+(order.stevilka||"#"+order.id)];
    if(count!=null)lines.push("Število dostavljenih boxov: "+count);
    if(order.datum_dostave)lines.push("Datum dostave: "+date(order.datum_dostave));
    if(address)lines.push("Naslov dostave: "+address);
    lines.push("","Stanje boxov in naročila lahko spremljate v Mojem računu:","https://test.rabimbox.si/moj-profil/","",
      "Za dodatna vprašanja smo vam na voljo na info@rabimbox.si ali +386 40 796 040.","","Lep pozdrav,","ekipa Rabimbox");
    return {to:String(order.kupec_email||""),subject:"Boxi so pri vas – podpisana pogodba – Rabimbox",body:lines.join("\n")};
  }
  function mailto(draft){return "mailto:"+encodeURIComponent(draft.to)+"?subject="+encodeURIComponent(draft.subject)+"&body="+encodeURIComponent(draft.body);}
  window.RBDeliveryEmail={build:build,mailto:mailto};
})();
