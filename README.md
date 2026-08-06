# Rabimbox – Skladiščna aplikacija

Spletna aplikacija za osebje v skladišču. Deluje v brskalniku brez gradnje
(HTML + CSS + JS) in se povezuje na isto Supabase bazo kot spletna stran
[rabimbox.si](https://rabimbox.si).

## Zavihki

**Naročila** (privzeti) – delovni seznam vsega, kar so stranke naročile, iz dveh virov:
*Spletno naročilo* (checkout na spletni strani) in *Zahteva iz panela* (Moj profil).
Prikazuje termin dostave, storitev, število boxov, stranko, naslov in ali je plačano.
Klik na vrstico odpre podrobnosti z gumbi: Potrdi → V izvajanje → Zaključi (ali Prekliči).

**Škatle** – vse škatle v sistemu: bar koda, status, stranka, naročnina, lokacija.
Iskanje, filtri, razvrščanje in skeniranje bar kode s kamero.

**Zgodovina** (samo administrator) – dnevnik sprememb škatel in statusov naročil.

## Statusi

| Škatle | Naročila |
|---|---|
| na zalogi → rezervirana → v transportu → pri stranki → v skladišču | nova → potrjena → v izvajanju → zaključena |
| (+ poškodovana, umaknjena) | (+ preklicana) |

Stranka v svojem panelu vidi poenostavljene nazive ("Pripravljeno za dostavo",
"Na poti", "Pri vas"). Interni statusi in bar kode ji niso prikazani.

## Zagon

Lokalno:

```bash
python -m http.server 5173
# odpri http://localhost:5173
```

Dvoklik na `index.html` deluje tudi, a **skeniranje s kamero zahteva https** –
za uporabo v skladišču aplikacijo objavi na spletu (npr. Netlify, Vercel,
Cloudflare Pages ali GitHub Pages).

## Prijava

Uporabniški imeni sta `skladiščnik` in `Admin`. Gesli nista v repozitoriju –
hranjeni sta v upravitelju gesel.

## Struktura

```
├─ index.html        # vstopna točka
├─ css/style.css     # slog
├─ js/config.js      # naslov Supabase + javni anon ključ
├─ js/app.js         # celotna logika
└─ Slike/            # logotip, ikone
```

`js/config.js` vsebuje samo **anon (public)** ključ, ki je namenjen objavi –
podatke varujejo RLS pravila in funkcije `is_staff()` / `is_admin()` v bazi.
Ključa `service_role` v repozitorij nikoli ne vpisuj.

## Odvisnost od baze

Zavihek **Naročila** potrebuje funkcije `sklad_zahteve`, `sklad_zahteva_skatle`,
`sklad_update_zahteva` in `sklad_stevci`. Te so v skripti `integracija.sql`
(repozitorij spletne strani, mapa `Moj-profil/sql/`). Če zavihek javi, da
funkcija ne obstaja, skripta še ni bila pognana v Supabase.
