export const createClient = () => ({ rpc: async (fn: string) => fn === 'voca_me' ? { data: { id: 7 } } : { data: true } });
