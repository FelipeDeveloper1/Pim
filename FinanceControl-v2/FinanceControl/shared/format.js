/* Formatação e utilitários de data (pt-BR). */
(function (global) {
  'use strict';
  const brl = new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' });
  const pct = new Intl.NumberFormat('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  const esc = (s) => String(s ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  const pad = (n) => String(n).padStart(2, '0');
  const F = {
    esc,
    money: (v) => brl.format(Number(v) || 0),
    date: (s) => (s ? s.slice(0, 10).split('-').reverse().join('/') : '—'),
    dateTime: (iso) => (iso ? new Date(iso).toLocaleString('pt-BR') : '—'),
    today: () => { const d = new Date(); return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`; },
    curMonth: () => F.today().slice(0, 7),
    addMonths(m, n) { const [y, mo] = m.split('-').map(Number); const d = new Date(y, mo - 1 + n, 1); return `${d.getFullYear()}-${pad(d.getMonth() + 1)}`; },
    monthRange(m) { const [y, mo] = m.split('-').map(Number); return { inicio: `${m}-01`, fim: `${m}-${pad(new Date(y, mo, 0).getDate())}` }; },
    monthLabel(m) { const [y, mo] = m.split('-').map(Number); return new Date(y, mo - 1, 1).toLocaleDateString('pt-BR', { month: 'long', year: 'numeric' }); },
    monthShort(m) { const [y, mo] = m.split('-').map(Number); return new Date(y, mo - 1, 1).toLocaleDateString('pt-BR', { month: 'short' }).replace('.', ''); },
    /** Variação com símbolo e sinal — a informação não depende só de cor (seção 3.3.1). */
    signedPct(v) {
      if (v === null || v === undefined) return '—';
      if (v > 0) return `▲ +${pct.format(v)}%`;
      if (v < 0) return `▼ −${pct.format(Math.abs(v))}%`;
      return `${pct.format(0)}%`;
    },
    moneyInput: (v) => (v === undefined || v === null || v === '' ? '' : Number(v).toFixed(2).replace('.', ',')),
    TIPOS: { receita: 'Receita', despesa: 'Despesa', investimento: 'Investimento' },
  };
  global.FCFmt = F;
})(window);
