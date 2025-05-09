import { default as makeWASocketDefault } from '@whiskeysockets/baileys';
const makeWASocket = makeWASocketDefault;
console.log('Is makeWASocket function?', typeof makeWASocket === 'function');

// Test creating a simple logger
const logger = {
  trace: (msg) => console.log('TRACE:', msg),
  debug: (msg) => console.log('DEBUG:', msg),
  info: (msg) => console.log('INFO:', msg),
  warn: (msg) => console.log('WARN:', msg),
  error: (msg) => console.log('ERROR:', msg),
  fatal: (msg) => console.log('FATAL:', msg),
  child: () => logger
};

try {
  // Tenta inicializar o socket
  console.log('Trying to create socket...');
  const sock = makeWASocket({
    printQRInTerminal: true,
    auth: { creds: {}, keys: {} },
    logger: logger,
    browser: ['ZapBan', 'Chrome', '114.0.5735.199'],
    syncFullHistory: false
  });
  console.log('Socket created successfully!');
} catch (error) {
  console.error('Error creating socket:', error.message);
}
