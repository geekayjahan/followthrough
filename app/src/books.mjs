import { london } from "./domain.mjs";
export function installBooks(e) {
  e.syncBooks = async () => {
    try {
      const snapshot = await e.p.booksSnapshot();
      const mapped = new Map(
        e.d
          .orgs()
          .filter((o) => o.books_contact_id)
          .map((o) => [String(o.books_contact_id), o]),
      );
      // Unknown records are discarded before any local persistence.
      const invoices = snapshot.invoices
        .filter((i) => mapped.has(String(i.customer_id)))
        .map((i) => ({
          id: String(i.invoice_id),
          org_id: mapped.get(String(i.customer_id)).id,
          number: i.invoice_number,
          amount: Number(i.total),
          balance: Number(i.balance),
          due: i.due_date,
          status: i.status,
          updated_at: i.last_modified_time,
        }));
      for (const i of invoices) {
        if (!i.due || !Number.isFinite(i.balance))
          throw Error("Invalid invoice record");
        const existing = e.s
          .all("loops")
          .find((l) => l.key === `invoice:${i.id}`);
        if (i.status === "paid" || i.balance === 0) {
          if (existing && existing.status === "open")
            e.d.close(existing.id, "paid");
          continue;
        }
        const loop =
          existing ||
          e.d.loop("invoice", i.org_id, `invoice:${i.id}`, {
            books_invoice_id: i.id,
            invoice_due: i.due,
            invoice_number: i.number,
            amount: i.balance,
            next_move: `Chase ${i.number}: GBP ${i.balance.toFixed(2)}`,
          });
        if (
          loop.status === "open" &&
          (loop.amount !== i.balance || loop.invoice_due !== i.due)
        ) {
          e.d.revoke(loop.id, "Books invoice changed");
          loop.amount = i.balance;
          loop.invoice_due = i.due;
          loop.last_touch = new Date().toISOString();
          loop.next_move = `Chase ${i.number}: GBP ${i.balance.toFixed(2)}`;
          e.s.put("loops", loop.id, loop);
        }
      }
      const state = {
        available: true,
        cash: snapshot.cash,
        owed: invoices.reduce((n, i) => n + i.balance, 0),
        invoices,
        updated_at: snapshot.updated_at,
        error: null,
        unmapped_records: snapshot.invoices.length - invoices.length,
      };
      // A fresh account containing unmapped records cannot be presented as complete synthetic truth.
      if (state.unmapped_records) {
        state.available = false;
        state.cash = null;
        state.owed = null;
        state.error =
          "Books contains unmapped records; reconcile synthetic account mappings";
      }
      e.s.put("books", "snapshot", state);
      e.s.audit("books_read", {
        mapped_invoice_count: invoices.length,
        unmapped_count: state.unmapped_records,
        source: "Zoho Books",
      });
      return state;
    } catch (error) {
      const previous = e.s.get("books", "snapshot");
      const state = {
        available: false,
        cash: null,
        owed: null,
        invoices: [],
        updated_at: previous?.updated_at || null,
        error: "Books unavailable; check account configuration and access",
      };
      e.s.put("books", "snapshot", state);
      throw error;
    }
  };
}
