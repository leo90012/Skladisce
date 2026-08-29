# Povezava z domeno skladisce.rabimbox.si

Datoteka `CNAME` v tem repozitoriju že vsebuje domeno. Manjka še vpis pri
ponudniku domene `rabimbox.si` in potrditev v GitHubu.

## 1. Zapis pri ponudniku domene

V DNS nastavitvah domene `rabimbox.si` dodaj **en zapis**:

| Tip | Ime / Host | Vrednost / Cilj | TTL |
|---|---|---|---|
| CNAME | `skladisce` | `leo90012.github.io` | privzet (3600) |

Pomembno:

- v polje **Ime** vpiši samo `skladisce`, ne celotne `skladisce.rabimbox.si`
  (večina ponudnikov domeno doda sama; če tvoj zahteva celoto, vpiši celoto);
- vrednost je `leo90012.github.io` **brez** `https://`, brez poti in
  **s piko na koncu**, če jo ponudnik zahteva (`leo90012.github.io.`);
- ne dodajaj A zapisov — CNAME je dovolj in je za poddomeno pravilnejši.

## 2. Nastavitev v GitHubu

Repozitorij `Skladisce` → **Settings → Pages → Custom domain**:

1. vpiši `skladisce.rabimbox.si` in klikni **Save**;
2. počakaj, da GitHub preveri DNS (pri "DNS check in progress" osveži čez
   nekaj minut — zapis se lahko razširja do ene ure, izjemoma dlje);
3. ko se pojavi zelena kljukica, obkljukaj **Enforce HTTPS**.

Certifikat izda GitHub samodejno (Let's Encrypt), navadno v nekaj minutah po
uspešnem preverjanju.

## 3. Preverjanje

```bash
nslookup skladisce.rabimbox.si
```

Odgovor mora vsebovati `leo90012.github.io`. Nato v brskalniku odpri
**https://skladisce.rabimbox.si** — naložiti se mora prijavna stran skladišča.

## Pogoste težave

**"Domain does not resolve to the GitHub Pages server"** — DNS zapis še ni
razširjen ali je vpisan napačno. Preveri, da je tip CNAME (ne A ali TXT) in
da vrednost ne vsebuje `https://`.

**Stran se odpre, a brez slik in slogov** — počisti predpomnilnik s Ctrl+F5.
Poti v aplikaciji so relativne, zato delujejo tako na
`leo90012.github.io/Skladisce/` kot na novi domeni.

**CNAME datoteka izgine po objavi** — to se zgodi, če v Settings → Pages
izbrišeš Custom domain. Datoteka mora ostati v repozitoriju; ob vsakem
`git push` se objavi znova.

**Domena je zasedena z drugim zapisom** — če `skladisce` že kaže drugam
(npr. na stari strežnik), stari zapis najprej izbriši.

## Opomba o šumnikih

Domena je namenoma brez šumnikov. Različica `skladišče.rabimbox.si` bi v DNS
morala biti zapisana kot `xn--skladie-o6a96e.rabimbox.si`, kar otežuje
vzdrževanje, deljenje povezav in nastavitev certifikata.
