import * as baileys from '@whiskeysockets/baileys';

console.log("makeWASocket:", typeof baileys.makeWASocket);
console.log("baileys.default:", typeof baileys.default);

// Se tiver makeWASocket diretamente
if (typeof baileys.makeWASocket === 'function') {
  console.log("O correto é importar makeWASocket diretamente");
} 
// Se makeWASocket estiver em default
else if (typeof baileys.default === 'function') {
  console.log("O correto é importar default como makeWASocket");
} 
// Se for um objeto, vamos ver a estrutura
else if (typeof baileys.default === 'object') {
  console.log("O objeto default contém:");
  for (const key in baileys.default) {
    console.log(`- ${key}: ${typeof baileys.default[key]}`);
  }
  
  // Se makeWASocket estiver como propriedade de default
  if (typeof baileys.default.makeWASocket === 'function') {
    console.log("O correto é importar default.makeWASocket");
  }
}
