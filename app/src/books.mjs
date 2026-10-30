import { london } from "./domain.mjs";
// Zoho invoice statuses the owner can chase. A draft has not been sent; a void one no longer exists (AR-07).
export const COLLECTIBLE = ["sent", "viewed", "overdue", "partially_paid", "unpaid"];
export const collectible = (status) => COLLECTIBLE.includes(String(status || "").toLowerCase());
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
        .map((i) => {
          // A missing balance is invalid input, never zero (AR-03): validate the raw value before conversion.
          const raw = i.balance;
          if (raw === null || raw === undefined || raw === "" || !Number.isFinite(Number(raw)))
            throw Error("Invalid invoice record: balance missing");
          return {
            id: String(i.invoice_id),
            org_id: mapped.get(String(i.customer_id)).id,
            number: i.invoice_number,
            amount: Number(i.total),
            balance: Number(raw),
            due: i.due_date,
            status: String(i.status || "").toLowerCase(),
            updated_at: i.last_modified_time,
          };
        });
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
        if (!collectible(i.status)) {
          // Draft or void: nothing to chase; a loop opened earlier closes and its chase is revoked.
          if (existing && existing.status === "open") e.d.close(existing.id, `not collectible (${i.status})`);
          continue;
        }
        // A payment reversal or corrected balance reopens a loop that was closed as paid.
        if (existing && existing.status === "closed" && existing.reason === "paid" && i.balance > 0) {
          existing.status = "open";
          delete existing.reason;
          delete existing.closed_at;
          existing.amount = i.balance;
          existing.invoice_due = i.due;
          existing.last_touch = new Date().toISOString();
          e.s.put("loops", existing.id, existing);
          e.s.audit("loop_open", { loop_id: existing.id, loop_type: "invoice", org_id: existing.org_id, source: "Books balance restored" });
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
        owed: invoices.filter((i) => collectible(i.status)).reduce((n, i) => n + i.balance, 0),
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
