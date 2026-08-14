# Guestlist: nastavení a provoz

Všechno, co je potřeba k rozjetí registrací na akce, na jednom místě. Psáno
pro člověka, který ty služby nikdy neotevřel.

Na konci je **checklist Před akcí**, ten si projdi den před každou akcí.

---

## Co to je a jak to funguje

Návštěvník vyplní formulář, přijde mu potvrzovací e-mail, klikne v něm, a
teprve pak dostane vstupenku s QR kódem. U vchodu ji obsluha načte čtečkou.

Dvoufázové potvrzení je hlavní obrana proti robotům: kdo nemá přístup ke
schránce, vstupenku nedostane. Zároveň drží kapacitu poctivou, protože
nepotvrzená rezervace po 30 minutách místo uvolní.

**Cesty na webu**

| Adresa | Co tam je |
|---|---|
| `/` | sekce s nejbližší akcí a živým počtem volných míst |
| `/akce/<slug>` | stránka akce s registračním formulářem |
| `/rezervace/potvrdit?t=…` | přistání z potvrzovacího e-mailu |
| `/t/<token>` | webová vstupenka, funguje i offline |
| `/admin` | administrace, chráněná heslem |
| `/scanner` | čtečka vstupenek u vchodu, přihlášení kódem obsluhy |

---

## 1. Účty a služby

Všechno se vejde do bezplatných tarifů.

| Služba | K čemu | Kde |
|---|---|---|
| Supabase | databáze a úložiště fotek | dashboard.supabase.com |
| Vercel | web a serverové funkce | vercel.com |
| Resend | odesílání e-mailů | resend.com |
| Cloudflare | Turnstile, ochrana formuláře | dash.cloudflare.com |

---

## 2. Proměnné prostředí

Nastavují se na dvou místech: ve **Vercelu** (běh na produkci) a v souboru
**`.env`** v projektu (lokální vývoj). `.env` je v `.gitignore` a nikdy se
necommituje.

### Serverové, tajné

Ve Vercelu je označ jako **Sensitive** a zaškrtni **Production + Preview**.
Development u sensitive proměnných nejde, a nevadí to, lokálně se berou
z `.env`.

| Název | Kde ji vzít |
|---|---|
| `SUPABASE_SERVICE_ROLE_KEY` | Supabase → Project Settings → API Keys → `service_role` |
| `TURNSTILE_SECRET_KEY` | Cloudflare → Turnstile → widget → Secret Key |
| `RESEND_API_KEY` | Resend → API Keys, začíná `re_` |
| `TICKET_SIGNING_PRIVATE_KEY` | `npm run keys` |
| `FORM_TOKEN_SECRET` | `npm run keys` |
| `SESSION_SECRET` | `npm run keys` |
| `IP_HASH_SALT` | `npm run keys` |
| `CRON_SECRET` | `npm run keys` |
| `ADMIN_PASSWORD` | vymyslíš si, klidně dlouhá věta |

### Serverové, veřejné

Bez příznaku Sensitive, zaškrtni všechna tři prostředí.

| Název | Hodnota |
|---|---|
| `SUPABASE_URL` | stejná jako `VITE_SUPABASE_URL` |
| `TICKET_PUBLIC_KEY` | z `npm run keys` |
| `PUBLIC_SITE_URL` | `https://www.heatmapa.com` |
| `EMAIL_FROM` | `heatmapa <vstupenky@heatmapa.com>` |
| `SUPPORT_INBOX` | kam mají chodit dotazy z podpory |

### Do prohlížeče

Proměnné s prefixem `VITE_` se **zapékají do veřejného webu** a přečte si je
kdokoli. Patří sem jen to, co veřejné být má.

| Název | Poznámka |
|---|---|
| `VITE_SUPABASE_URL` | veřejná adresa projektu |
| `VITE_SUPABASE_ANON_KEY` | anonymní klíč, chráněný pravidly RLS |
| `VITE_TURNSTILE_SITE` | Site Key z Turnstile, veřejný ze své podstaty |
| `VITE_MAPBOX_TOKEN` | token `pk.`, omez ho v Mapboxu na svoje domény |

Název nekončí na `KEY` schválně: Vercel na každý název s `KEY` a prefixem
`VITE_` hlásí varování, že se hodnota zveřejní. U Site Key je to v pořádku.

### Jen lokálně

| Název | K čemu |
|---|---|
| `SUPABASE_DB_URL` | přímé připojení k databázi kvůli migracím |
| `DEV_API_PORT` | port lokálního serveru pro `/api`, výchozí 3001 |

`SUPABASE_DB_URL` **do Vercelu nepatří.** Aplikace si vystačí se service role
klíčem a nepotřebuje heslo k databázi.

Kde ho vzít: Supabase → tlačítko **Connect** nahoře → záložka **Session
pooler** → zkopírovat řetězec a nahradit `[YOUR-PASSWORD]` heslem k databázi.
Heslo se resetuje v Project Settings → Database.

---

## 3. Klíče

```
npm run keys
```

Vypíše šest hodnot. Zkopíruj je do `.env` i do Vercelu.

**`TICKET_SIGNING_PRIVATE_KEY` je klíč od království.** Kdo ho má, umí si
vyrobit platnou vstupenku na jakoukoli akci. Nikam ho neposílej a hlavně:

> **Nikdy ho negeneruj znovu potom, co rozešleš vstupenky.** Tím a jedině tím
> přestanou platit všechny dosud vydané. Ostatní klíče se dají měnit bez
> následků, jen `IP_HASH_SALT` neměň za běhu akce, rozjede se tím počítání
> limitu podle IP.

Čtečka dostane jen `TICKET_PUBLIC_KEY`, ten je veřejný a vstupenku z něj
vyrobit nejde.

---

## 4. E-maily a DNS

Bez správných DNS záznamů e-maily buď nedorazí, nebo spadnou do spamu.

1. Resend → **Domains** → **Add Domain** → `heatmapa.com`, region `eu-west-1`.
2. Resend ukáže tři až čtyři DNS záznamy. Zapiš je u správce DNS domény
   (u `heatmapa.com` je to Regzone).
3. Zpátky v Resendu klikni **Verify DNS Records**. Většinou to naskočí do pěti
   minut, někdy to trvá hodinu.
4. Resend → **API Keys** → nový klíč s právem `Sending access`.

**Tři věci, na kterých se dá pohořet:**

- **Nesahej na existující záznamy.** Firemní pošta jede přes Seznam a její MX
  i SPF musí zůstat, jak jsou. Jen přidáváš nové řádky.
- **Nikdy nesmí vzniknout druhý SPF záznam na kořeni domény.** Dva SPF
  záznamy na jednom jménu znamenají, že přestane chodit veškerá pošta.
  Resend si vystačí se subdoménou `send.`, takže k tomu není důvod.
- **Po nastavení si pošli zkušební zprávu na firemní adresu** z jiné schránky
  a ověř, že dorazí. Rozbití firemní pošty se pozná až za pár hodin.

Zkouška šablon proti skutečné schránce:

```
npm run test:emails tvoje@adresa.cz
```

Pošle potvrzovací e-mail i vstupenku s daty skutečné akce. Otevři je **na
mobilu**, tam se to reálně čte.

---

## 5. Ochrana formuláře

1. Cloudflare → **Turnstile** → **Add widget**.
2. Název `heatmapa guestlist`.
3. Hostnames: `heatmapa.com`, `www.heatmapa.com`, `heatmapa.cz`,
   `www.heatmapa.cz` a `localhost` kvůli vývoji.
4. Widget Mode: **Managed**.
5. Site Key jde do `VITE_TURNSTILE_SITE`, Secret Key do `TURNSTILE_SECRET_KEY`.

Kdyby v buildu Site Key chyběl, **build spadne** s vysvětlením. Je to schválně:
bez klíče se widget nevykreslí, token nevznikne a server odmítne každou
registraci. Bez té pojistky by to vypadalo funkčně a tiše by to nefungovalo
pro všechny.

---

## 6. Migrace databáze

```
npm run db:migrate
```

Pustí všechny neprovedené migrace ze `supabase/migrations` a zapíše je do
tabulky `_migrations`. Jsou psané tak, aby opakované spuštění nevadilo.

Kdybys nechtěl dávat heslo k databázi do `.env`, jde obsah těch souborů
vložit ručně do SQL editoru v Supabase a spustit. Funguje to stejně, jen si
to při každé další změně schématu zopakuješ.

Po migraci ověř, co smí anonymní klíč:

```
npm run verify:security
```

Skript se za něj vydává a zkouší dělat, co nemá. Musí projít všechno. Pouštěj
ho **po každé změně schématu nebo RLS**.

---

## 7. První akce

```
npm run db:seed
```

Založí akci ze `scripts/seed-event.mjs`. Od té chvíle se dá všechno ostatní
dělat v administraci na `/admin`.

Viditelnost akce na webu se přepíná bez nasazování:

```
npm run event:on     # pustí ji na web
npm run event:off    # stáhne zpátky
```

Nepublikovaná akce zmizí z titulky, její stránka vrací 404 a registrovat se
na ni nedá. Rezervace zůstanou nedotčené.

---

## 8. Lokální vývoj

Ve dvou oknech:

```
npm run dev:api      # serverové funkce na portu 3001
npm run dev          # web na 5173, /api si přesměruje sám
```

Testy:

```
npm test             # validace, podepisování, tokeny
npm run test:db      # kapacita a odbavení proti skutečnému Postgresu
npm run test:e2e     # celý průchod registrací v prohlížeči
npm run test:admin   # průchod administrací
```

`test:db` si při prvním spuštění stáhne binárku Postgresu, takže chvíli trvá.

Zkušební akci s vlastní malou kapacitou, která se neukáže na titulce:

```
npm run test:event         # založí
npm run test:event:clean   # smaže i s rezervacemi
```

---

## 9. Nasazení

Nasazuje se pushem do `main`, Vercel si to vezme sám. Po nasazení ověř:

```
curl -s https://www.heatmapa.com/api/events/<slug> | head -c 200
curl -s -o /dev/null -w "%{http_code}\n" https://www.heatmapa.com/api/admin/session
```

První musí vrátit data akce, druhý `200`. Kdyby administrace vracela 404,
znamená to, že se serverová funkce nenasadila.

**Denní úloha** na anonymizaci běží podle `vercel.json` každý den ve 4 ráno.
Vercel k jejímu volání přikládá `CRON_SECRET`, bez něj endpoint odmítne.
V rozhraní Vercelu je vidět v sekci Cron Jobs.

---

## 10. Čtečka u vchodu

Běží na `/scanner`, otevře se v mobilním prohlížeči a nic se neinstaluje.

**Před akcí:**

1. V administraci vytvoř **každému člověku z obsluhy vlastní kód** (záložka
   Kódy obsluhy). Podle něj je pak v logu vidět, kdo koho pustil, a ztracený
   kód jde zneplatnit bez dopadu na ostatní.
2. Obsluha otevře `/scanner`, zadá kód a povolí kameru. Přihlášení platí
   12 hodin.
3. **Ještě se signálem** nech čtečku stáhnout seznam vstupenek. Pozná se to
   podle údaje „Odbaveno 0 z 100" ve stavovém pruhu. Bez něj čtečka bez sítě
   nic neodbaví.

**U dveří:**

Obsluha namíří na QR kód na telefonu návštěvníka. Čte se sám. Obrazovka
zesvítí zeleně se jménem a pípne, nebo červeně s důvodem a zabzučí jinak.
Na třicet sekund je k dispozici tlačítko Vzít zpět pro případ omylu.

Bez signálu čtečka rozhoduje ze staženého seznamu a skeny si ukládá. Jakmile
se síť vrátí, sama je odešle. Ve stavovém pruhu je vidět, kolik jich čeká.

Kdo vstupenku nemá, dá se najít v záložce Hledat podle jména. To ale
potřebuje signál.

**Na co si dát pozor:**

- **Vyzkoušej to na telefonech, které u dveří budou**, ne na svém. Nejčastější
  potíž není kód, ale zamítnuté povolení kamery nebo neaktualizovaný prohlížeč.
- Odhlášení smaže neodeslané skeny, čtečka se proto ptá. Než někoho odhlásíš,
  počkej, až fronta klesne na nulu.
- Svítilnu z prohlížeče na iPhonu zapnout nejde. Vstupenky se ukazují na
  rozsvíceném displeji, takže to nevadí.

---

## 11. Osobní údaje

Sbírá se jen jméno, příjmení, e-mail a telefon. IP adresa se ukládá výhradně
jako jednosměrný otisk se solí, aby šlo počítat limity, ale nešlo z ní zpětně
zjistit, kdo to byl.

**90 dní po akci** denní úloha z rezervací osobní údaje odstraní. Stavy a časy
zůstanou, takže statistika návštěvnosti dál sedí, ale nejde z ní zjistit, kdo
přišel.

Souhlas se zpracováním je u formuláře povinný a odkazuje na zásady heatmapa
s.r.o. Souhlas s marketingem je zvlášť a nepovinný.

---

## 12. Když se něco pokazí

| Příznak | Kde hledat |
|---|---|
| Formulář hlásí „Nepovedlo se ověřit, že jsi člověk" | chybí `VITE_TURNSTILE_SITE` nebo doména není v hostnames widgetu |
| E-maily nechodí | Resend → Domains, je doména **Verified**? Resend → Logs |
| E-maily padají do spamu | zkontroluj SPF a DKIM, pošli si zkoušku na Gmail i Seznam |
| Administrace vrací 404 | serverová funkce se nenasadila, koukni na build log ve Vercelu |
| „Could not find the table … in the schema cache" | chybí migrace, nebo je potřeba `notify pgrst, 'reload schema'` |
| Počet volných míst se nemění | Supabase → Database → Publications, je tam `event_counters`? |
| Čtečka nevidí kameru | povolení v prohlížeči, a musí to být HTTPS adresa |
| Čtečka hlásí „Kód neplatí" | kód je zneplatněný, nebo patří k jiné akci |
| Build spadl na „v buildu chybí ověření Turnstile" | není nastavená `VITE_TURNSTILE_SITE` |

---

## Checklist Před akcí

Projdi den předem, ne hodinu.

**Registrace**

- [ ] Akce má správné datum, čas, místo a kapacitu (`/admin` → Nastavení akce)
- [ ] Akce je publikovaná a zobrazuje se na titulce
- [ ] Formulář na `/akce/<slug>` jde odeslat a přijde potvrzovací e-mail
- [ ] Po kliknutí v e-mailu dorazí vstupenka s QR
- [ ] Zkušební rezervaci jsi po sobě smazal

**E-maily**

- [ ] Resend hlásí doménu jako Verified
- [ ] Zkušební e-mail dorazil na Gmail i na Seznam a **nespadl do spamu**
- [ ] Ve schránce `vstupenky@heatmapa.com` je nastavené přeposílání, ať ti
      neuniknou odpovědi

**U vchodu**

- [ ] Každý člověk z obsluhy má **vlastní** přístupový kód (`/admin` → Kódy obsluhy)
- [ ] Každý telefon má na `/scanner` přihlášeno a **povolenou kameru**
- [ ] Na každém telefonu proběhl zkušební sken skutečné vstupenky
- [ ] Čtečka má stažený seznam („Odbaveno 0 z …" ve stavovém pruhu)
- [ ] Obsluha ví, co dělat u `already_used`: nepouštět a ukázat čas a jméno
- [ ] Telefony jsou nabité a je po ruce powerbanka
- [ ] Někdo má otevřenou administraci pro ruční dohledání

**Pojistky**

- [ ] Máš stažený CSV export seznamu registrovaných **na papír nebo do telefonu**
      pro případ, že u dveří nepůjde vůbec nic
- [ ] Víš, že vstupenku jde odbavit ručně podle příjmení, když ji člověk nemá
- [ ] `TICKET_SIGNING_PRIVATE_KEY` jsi od rozeslání vstupenek nezměnil

**Po akci**

- [ ] Zkontroluj v administraci počet odbavených proti realitě
- [ ] Stáhni si finální CSV, pokud ho chceš archivovat mimo systém
- [ ] Za 90 dní se osobní údaje samy anonymizují, nemusíš na to myslet
