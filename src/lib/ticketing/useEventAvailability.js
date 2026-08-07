// Živý počet volných míst.
//
// Číslo se vždy dotahuje za běhu z databáze, nikdy se nebere z něčeho, co
// vzniklo při buildu. Kdyby se počet míst zapekl do stránky, ukazoval by od
// nasazení pořád stejnou hodnotu.
//
// Zdrojem pravdy je funkce event_availability(), která obsazenost počítá
// dotazem nad tabulkou rezervací. Realtime se používá jen jako budíček:
// anonymní klíč nesmí číst rezervace, protože jsou v nich osobní údaje, takže
// odběr visí na počítadle, které nad nimi udržuje trigger. Když přijde signál,
// zeptáme se znovu na skutečné číslo.
//
// Když realtime nenaskočí, třeba kvůli firemní síti nebo blokovaným
// websocketům, jede pravidelné dotazování a uživatel nepozná rozdíl.

import { useCallback, useEffect, useRef, useState } from "react";
import { supabase } from "../supabase";

const POLL_MS = 15000;

export function useEventAvailability(slug) {
  const [state, setState] = useState({ loading: true, error: false, data: null });
  // Drží se v ref, aby na něm nezávisel efekt a odběr se nezakládal znovu.
  const mounted = useRef(true);

  const refresh = useCallback(async () => {
    if (!slug) return;
    const { data, error } = await supabase.rpc("event_availability", { p_slug: slug });
    if (!mounted.current) return;

    if (error || !data) {
      setState((prev) => ({ ...prev, loading: false, error: true }));
      return;
    }

    setState({
      loading: false,
      error: false,
      data: {
        capacity: data.capacity,
        taken: data.taken,
        remaining: Math.max(0, data.capacity - data.taken),
        closed: Boolean(data.closed),
        soldOut: data.taken >= data.capacity,
      },
    });
  }, [slug]);

  useEffect(() => {
    mounted.current = true;
    // refresh() je asynchronní, stav se mění až po odpovědi z databáze.
    // Pravidlo hlídá synchronní setState v efektu a tohle mezi ně nepatří.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    refresh();

    const channel = supabase
      .channel(`availability:${slug}`)
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "event_counters" },
        refresh,
      )
      .subscribe();

    const timer = setInterval(refresh, POLL_MS);

    // Návrat na kartu po delší době: první, co člověk uvidí, má být aktuální
    // číslo, ne to, které tam viselo, než odešel.
    const onVisible = () => {
      if (document.visibilityState === "visible") refresh();
    };
    document.addEventListener("visibilitychange", onVisible);

    return () => {
      mounted.current = false;
      clearInterval(timer);
      document.removeEventListener("visibilitychange", onVisible);
      supabase.removeChannel(channel);
    };
  }, [slug, refresh]);

  return { ...state, refresh };
}

/**
 * České skloňování počtu míst: 1 místo, 2 až 4 místa, 5 a víc míst.
 * Angličtina si vystačí s jedním tvarem, ale prochází stejnou cestou.
 */
export function spotsLabel(t, remaining) {
  if (remaining === 1) return t.ev.spotsLeft1;
  const key = remaining >= 2 && remaining <= 4 ? "spotsLeft234" : "spotsLeft";
  return t.ev[key].replace("{n}", remaining);
}
