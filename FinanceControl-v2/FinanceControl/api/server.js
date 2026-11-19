'use strict';
const { createApp } = require('./src/app');

if (process.argv.includes('--demo')) process.env.SEED_DEMO = '1';

createApp().then(({ server, cfg }) => {
  server.listen(cfg.port, () => {
    console.log(`FinanceControl rodando em http://localhost:${cfg.port}`);
    console.log(`  Web:    http://localhost:${cfg.port}/`);
    console.log(`  Mobile: http://localhost:${cfg.port}/mobile/`);
    console.log(`  API:    http://localhost:${cfg.port}/api/health`);
    if (!cfg.production) console.log(`  Login:  ${cfg.adminEmail} / ${process.env.ADMIN_PASSWORD ? '(definida em ADMIN_PASSWORD)' : cfg.adminPassword}`);
  });
}).catch((e) => { console.error('Falha ao iniciar:', e.message); process.exit(1); });
