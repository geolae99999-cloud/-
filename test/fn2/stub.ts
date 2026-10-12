export const db = new Map<string, any>();
export const createClient = () => ({
  rpc: async (fn: string) => fn === 'voca_me' ? { data: { id: 7 } } : fn === 'voca_ai_use' ? ((globalThis as any).uses++, { data: true }) : { data: null },
  from: () => ({
    select: () => ({ in: async (_c: string, ks: string[]) => ({ data: ks.filter(k => db.has(k)).map(k => ({ word: k, data: db.get(k) })) }) }),
    upsert: async (rows: any[]) => { rows.forEach(r => db.set(r.word, r.data)); return {}; },
  }),
});
