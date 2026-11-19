/* Cliente da API REST — usado pela web e pelo app mobile (mesmos endpoints, seção 3.4/3.5). */
(function (global) {
  'use strict';
  function create(storage) {
    const K = 'fc_token', U = 'fc_user';
    const read = (k) => { try { return storage.getItem(k); } catch { return null; } };
    const write = (k, v) => { try { storage.setItem(k, v); } catch { /* armazenamento indisponível */ } };
    const api = {
      onUnauthorized: null,
      token: () => read(K),
      user: () => { try { return JSON.parse(read(U)); } catch { return null; } },
      setSession(token, user) { write(K, token); write(U, JSON.stringify(user)); },
      setUser(user) { write(U, JSON.stringify(user)); },
      clear() { try { storage.removeItem(K); storage.removeItem(U); } catch { /* ignore */ } },
    };
    async function request(method, path, opts = {}) {
      const token = api.token();
      let res;
      try {
        res = await fetch(path, {
          method,
          headers: { ...(opts.body ? { 'Content-Type': 'application/json' } : {}), ...(token ? { Authorization: 'Bearer ' + token } : {}) },
          body: opts.body ? JSON.stringify(opts.body) : undefined,
        });
      } catch {
        const e = new Error('Sem conexão com a internet. Verifique sua rede e tente novamente.');
        e.offline = true; throw e;
      }
      if (res.status === 401 && token && !path.startsWith('/api/auth/login')) { api.clear(); if (api.onUnauthorized) api.onUnauthorized(); }
      if (opts.raw && res.ok) return res;
      const data = res.status === 204 ? null : await res.json().catch(() => null);
      if (!res.ok) {
        const e = new Error((data && data.erro && data.erro.mensagem) || 'Erro inesperado. Tente novamente.');
        e.status = res.status; e.detalhes = data && data.erro && data.erro.detalhes; throw e;
      }
      return data;
    }
    api.get = (p) => request('GET', p);
    api.post = (p, body) => request('POST', p, { body });
    api.put = (p, body) => request('PUT', p, { body });
    api.del = (p) => request('DELETE', p);
    api.download = async (p, filename) => {
      const res = await request('GET', p, { raw: true });
      const url = URL.createObjectURL(await res.blob());
      const a = document.createElement('a'); a.href = url; a.download = filename; document.body.appendChild(a); a.click(); a.remove();
      setTimeout(() => URL.revokeObjectURL(url), 2000);
    };
    return api;
  }
  global.FCApi = { create };
})(window);
