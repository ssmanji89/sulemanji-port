export class OperationsD1 {
  slots = new Map<string, Record<string, unknown>>();
  reservations = new Map<string, Record<string, unknown>>();
  candidates = new Map<string, Record<string, unknown>>();
  receipts = new Map<string, Record<string, unknown>>();
  control = { paused: 1, owner_epoch: 1 };
  prepare(sql: string) {
    let a: unknown[] = [];
    const bound = this.bound(sql, () => a);
    return { ...bound, bind: (...args: unknown[]) => { a = args; return bound; } };
  }
  private bound(sql: string, args: () => unknown[]) {
    return {
      first: async <T>() => {
        const v = args();
        if (sql.includes('FROM editorial_control')) return this.control as T;
        if (sql.includes('WHERE id = ? AND dispatch_state')) return (this.slots.get(String(v[0]))?.dispatch_state === 'PENDING' ? this.slots.get(String(v[0])) : null) as T | null;
        if (sql.includes('WHERE attempt_id = ?')) {
          const row = [...this.reservations.values()].find((x) => x.attempt_id === v[0]);
          return (row ? { id: row.id, candidate_id: row.candidate_id, maximum_micros: row.maximum_micros, pricing_revision: row.pricing_revision } : null) as T | null;
        }
        return null;
      },
      all: async <T>() => ({ results: [...this.slots.values()].filter((x) => x.dispatch_state === 'PENDING').slice(0, Number(args()[0])) as T[] }),
      run: async () => {
        const v = args();
        if (sql.includes('INSERT OR IGNORE INTO schedule_claims')) {
          const [id, local_date, slot, claimed_at] = v;
          if (this.slots.has(String(id))) return { meta: { changes: 0 } };
          this.slots.set(String(id), { id, local_date, slot, claimed_at, dispatch_state: 'PENDING' }); return { meta: { changes: 1 } };
        }
        if (sql.includes("UPDATE schedule_claims SET dispatch_state = 'DISPATCHED'")) {
          const [workflow_instance_id, dispatched_at, id] = v; const row = this.slots.get(String(id));
          if (row?.dispatch_state !== 'PENDING') return { meta: { changes: 0 } };
          Object.assign(row, { dispatch_state: 'DISPATCHED', workflow_instance_id, dispatched_at }); return { meta: { changes: 1 } };
        }
        if (sql.includes('INSERT INTO usage_reservations')) {
          const [id, candidate_id, attempt_id, maximum_micros, local_date, local_month, pricing_revision, requested_at] = v;
          const limits = [Number(v[9]), Number(v[15]), Number(v[18])];
          const amounts = [Number(v[11]), Number(v[14]), Number(v[17])];
          const sums = [
            [...this.reservations.values()].filter((x) => x.candidate_id === candidate_id).reduce((n, x) => n + Number(x.actual_micros ?? x.maximum_micros), 0),
            [...this.reservations.values()].filter((x) => x.local_date === local_date).reduce((n, x) => n + Number(x.actual_micros ?? x.maximum_micros), 0),
            [...this.reservations.values()].filter((x) => x.local_month === local_month).reduce((n, x) => n + Number(x.actual_micros ?? x.maximum_micros), 0),
          ];
          if (this.reservations.has(String(attempt_id)) || amounts.some((amount, i) => sums[i] + amount > limits[i])) return { meta: { changes: 0 } };
          this.reservations.set(String(id), { id, candidate_id, attempt_id, maximum_micros, actual_micros: null, local_date, local_month, pricing_revision, requested_at });
          return { meta: { changes: 1 } };
        }
        if (sql.includes('UPDATE usage_reservations SET actual_micros')) {
          const [actual_micros, settled_at, id] = v; const row = this.reservations.get(String(id));
          if (!row || row.actual_micros !== null) return { meta: { changes: 0 } };
          Object.assign(row, { actual_micros, settled_at }); return { meta: { changes: 1 } };
        }
        if (sql.includes('UPDATE editorial_control SET paused')) {
          const [paused] = v; this.control = { paused: Number(paused), owner_epoch: this.control.owner_epoch + 1 }; return { meta: { changes: 1 } };
        }
        if (sql.includes('UPDATE editorial_candidates SET model_calls')) {
          const [, id, max] = v; const row = this.candidates.get(String(id)); if (!row || Number(row.model_calls) >= Number(max)) return { meta: { changes: 0 } };
          row.model_calls = Number(row.model_calls) + 1; return { meta: { changes: 1 } };
        }
        if (sql.includes('UPDATE editorial_candidates SET review_rounds')) {
          const [, id, max] = v; const row = this.candidates.get(String(id)); if (!row || Number(row.review_rounds) >= Number(max)) return { meta: { changes: 0 } };
          row.review_rounds = Number(row.review_rounds) + 1; return { meta: { changes: 1 } };
        }
        if (sql.includes('INSERT OR IGNORE INTO editorial_receipts')) {
          const [id, candidate_id, action, result_json, created_at] = v;
          if (this.receipts.has(String(id))) return { meta: { changes: 0 } };
          this.receipts.set(String(id), { id, candidate_id, action, result_json, created_at }); return { meta: { changes: 1 } };
        }
        return { meta: { changes: 0 } };
      },
    };
  }
}
