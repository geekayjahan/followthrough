export function installStock(e) {
  e.refreshStock = () => {
    for (const lot of e.s.all("lots")) {
      const existing = e.s
        .all("loops")
        .find((l) => l.key === `low:${lot.id}` && l.status === "open");
      if (lot.left_kg < lot.start_kg * 0.2) {
        if (!existing)
          e.d.loop("lot_low", null, `low:${lot.id}`, {
            lot_id: lot.id,
            next_move: `Reorder ${lot.name}: ${lot.left_kg}kg remains`,
            source: "current stock store",
          });
      } else if (existing) e.d.close(existing.id, "stock replenished");
    }
  };
  const commit = e.commitStock;
  e.commitStock = (a, r) => {
    commit(a, r);
  };
  e.refreshStock();
}
