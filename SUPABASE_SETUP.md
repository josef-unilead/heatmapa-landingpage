# Supabase Backend Setup — Heatmapa Formuláře

Tento návod tě provede nastavením Supabase backendu pro waitlist a job application formuláře.

---

## 1. Vytvoř Supabase projekt

1. Jdi na [supabase.com](https://supabase.com) a založ si účet
2. Klikni na **New Project**
3. Zvol název (např. `heatmapa`), heslo a region (nejblíž je `eu-central-1`)
4. Počkej než se projekt vytvoří (~2 min)

---

## 2. Vytvoř databázové tabulky

V Supabase dashboardu přejdi do **SQL Editor** a spusť tento SQL:

```sql
-- Waitlist tabulka
create table waitlist (
  id bigint generated always as identity primary key,
  created_at timestamptz default now(),
  name text not null,
  email text not null unique,
  ico text,
  roles text[] not null default '{}'
);

-- Job applications tabulka
create table job_applications (
  id bigint generated always as identity primary key,
  created_at timestamptz default now(),
  name text not null,
  email text not null,
  position text not null,
  message text not null,
  portfolio text
);

-- Zapni Row Level Security
alter table waitlist enable row level security;
alter table job_applications enable row level security;

-- Politiky: povolit INSERT pro anonymní uživatele (veřejný formulář)
create policy "Allow anonymous insert" on waitlist
  for insert with check (true);

create policy "Allow anonymous insert" on job_applications
  for insert with check (true);
```

---

## 3. Nainstaluj Supabase klienta

V terminálu v projektu spusť:

```bash
npm install @supabase/supabase-js
```

---

## 4. Vytvoř Supabase konfiguraci

Vytvoř soubor `src/lib/supabase.js`:

```js
import { createClient } from "@supabase/supabase-js";

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

export const supabase = createClient(supabaseUrl, supabaseAnonKey);
```

---

## 5. Přidej environment variables

Vytvoř soubor `.env` v rootu projektu (NECOMMITUJ ho do gitu!):

```env
VITE_SUPABASE_URL=https://tvuj-projekt.supabase.co
VITE_SUPABASE_ANON_KEY=tvuj-anon-key
```

**Kde najdeš tyto hodnoty:**
1. V Supabase dashboardu jdi do **Settings** → **API**
2. `Project URL` = `VITE_SUPABASE_URL`
3. `anon / public` key = `VITE_SUPABASE_ANON_KEY`

Přidej `.env` do `.gitignore`:

```
.env
.env.local
```

---

## 6. Napoj formuláře na Supabase

### WaitlistForm.jsx

V souboru `src/components/WaitlistForm.jsx` nahraď TODO komentář:

```js
// Přidej import na začátek souboru:
import { supabase } from "../lib/supabase";

// V handleSubmit funkci nahraď simulovaný API call:
async function handleSubmit(e) {
  e.preventDefault();

  // ... validace zůstává stejná ...

  setError("");
  setLoading(true);

  const { error: dbError } = await supabase.from("waitlist").insert([
    {
      name: form.name,
      email: form.email,
      ico: form.ico || null,
      roles: form.roles,
    },
  ]);

  setLoading(false);

  if (dbError) {
    if (dbError.code === "23505") {
      setError("Tento e-mail je už na waitlistu.");
    } else {
      setError("Něco se pokazilo. Zkus to znovu.");
    }
    return;
  }

  setSubmitted(true);
}
```

### JobApplicationForm.jsx

V souboru `src/components/JobApplicationForm.jsx` nahraď TODO komentář:

```js
// Přidej import na začátek souboru:
import { supabase } from "../lib/supabase";

// V handleSubmit funkci nahraď simulovaný API call:
async function handleSubmit(e) {
  e.preventDefault();

  // ... validace zůstává stejná ...

  setError("");
  setLoading(true);

  const { error: dbError } = await supabase.from("job_applications").insert([
    {
      name: form.name,
      email: form.email,
      position: form.position,
      message: form.message,
      portfolio: form.portfolio || null,
    },
  ]);

  setLoading(false);

  if (dbError) {
    setError("Něco se pokazilo. Zkus to znovu.");
    return;
  }

  setSubmitted(true);
}
```

---

## 7. Jak zobrazit data

V Supabase dashboardu:
- Přejdi do **Table Editor** → vyber tabulku (`waitlist` nebo `job_applications`)
- Uvidíš všechny odeslané záznamy v reálném čase

Pro export dat můžeš použít tlačítko **Export to CSV** přímo v Table Editoru.

---

## 8. Volitelné: E-mailové notifikace

Pokud chceš dostávat notifikaci při každém novém záznamu:

1. V Supabase jdi do **Database** → **Webhooks**
2. Vytvoř webhook na tabulku `waitlist` (event: INSERT)
3. Nastav URL na službu jako [Zapier](https://zapier.com) nebo [Make](https://make.com)
4. V Zapier/Make nastav akci "Send Email" na tvůj e-mail

---

## Shrnutí souborů k vytvoření/upravit

| Soubor | Akce |
|--------|------|
| `src/lib/supabase.js` | Vytvořit (nový) |
| `.env` | Vytvořit (nový, nepushovat) |
| `.gitignore` | Přidat `.env` |
| `src/components/WaitlistForm.jsx` | Upravit (přidat import + Supabase call) |
| `src/components/JobApplicationForm.jsx` | Upravit (přidat import + Supabase call) |
