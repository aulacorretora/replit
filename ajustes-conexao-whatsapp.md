# Ajustes específicos para a conexão WhatsApp na VPS

Este documento contém os ajustes necessários para garantir que a conexão com o WhatsApp funcione corretamente ao migrar para a VPS.

## Problema atual no Replit

Atualmente no ambiente Replit, o QR Code é gerado corretamente, mas a conexão trava no estado "Logging in..." após o escaneamento. Este é um comportamento característico de ambientes com restrições de rede que impedem conexões WebSocket de longa duração.

O erro 428 ("Precondition Required") observado nos logs indica que o Replit está bloqueando a conexão do WebSocket com os servidores do WhatsApp.

## Correção crítica: Erros de importação ES Modules

Antes da migração, é necessário corrigir um problema crítico com as importações do Baileys, que causa o erro `ERR_UNSUPPORTED_DIR_IMPORT` durante a implantação:

```typescript
// PROBLEMA: Importações de diretório não são suportadas em ES modules
import { SomeType } from '@whiskeysockets/baileys/lib/Types'

// SOLUÇÃO 1: Especificar o arquivo completo
import { SomeType } from '@whiskeysockets/baileys/lib/Types/index.js'

// SOLUÇÃO 2 (RECOMENDADA): Utilizar a importação do pacote raiz
import { proto } from '@whiskeysockets/baileys'
```

Este ajuste deve ser feito em todos os arquivos que importam módulos internos do pacote Baileys, especialmente em `server/services/baileys.ts`.

## Modificações necessárias para a VPS

Ao migrar para a VPS, é necessário realizar as seguintes alterações:

### 1. Ajustes no arquivo `server/services/baileys.ts`

```typescript
// Configuração atual do makeWASocket no Replit:
const sock = makeWASocket({
  auth: state,
  printQRInTerminal: true,
  browser: ['ZapBan', 'Chrome', '1.0.0'],
  logger: pino(),
  // Adicione essas configurações na VPS:
  connectTimeoutMs: 60000,
  keepAliveIntervalMs: 25000,
  transactionOpts: {
    maxCommits: 10,
    delayMs: 500
  },
  // Configurações específicas para melhorar a estabilidade:
  syncFullHistory: false,
  markOnlineOnConnect: true,
  defaultQueryTimeoutMs: 60000
});
```

### 2. Configuração do Nginx para WebSockets

Certifique-se de que o Nginx esteja configurado corretamente para proxy WebSocket:

```nginx
# Em /etc/nginx/sites-available/zapban
location /ws {
    proxy_pass http://localhost:5000;
    proxy_http_version 1.1;
    proxy_set_header Upgrade $http_upgrade;
    proxy_set_header Connection "Upgrade";
    proxy_set_header Host $host;
    proxy_buffering off;
    proxy_read_timeout 86400;  # 24 horas em segundos
}
```

### 3. Persistência de sessões

Ajustar o código para garantir que as sessões persistam corretamente:

```typescript
// Em server/services/baileys.ts
// Ajustar o caminho para salvar as sessões de forma absoluta:
const sessionDir = path.resolve('/var/www/zapban/whatsapp-sessions');

// Função de inicialização
export async function initializeInstance(instanceId: number, userId: number, onQRCode: (qrCode: string) => void) {
  // Adicionar log de depuração
  console.log(`Inicializando instância ${instanceId} para o usuário ${userId}`);

  // Usar uma sessão específica por ID de instância
  const sessionPath = path.join(sessionDir, `session-${instanceId}.json`);
  
  // Criar diretório se não existir
  if (!fs.existsSync(sessionDir)) {
    fs.mkdirSync(sessionDir, { recursive: true });
  }

  // Resto do código permanece similar...
}
```

### 4. Verificação de conectividade no frontend

Implementar um sistema de verificação de conectividade no frontend:

```javascript
// Em client/src/hooks/use-instance.tsx
// Adicionar função para verificar status de conexão:

const checkConnectionStatus = useCallback(async (instanceId) => {
  try {
    const response = await fetch(`/api/instances/${instanceId}/status`);
    if (!response.ok) throw new Error('Falha ao verificar status');
    
    const data = await response.json();
    
    // Verificar se o WhatsApp está realmente conectado
    if (data.status === 'connected') {
      // Verificar conectividade real com uma operação simples
      const pingResponse = await fetch(`/api/instances/${instanceId}/ping`);
      if (!pingResponse.ok) {
        // Se o ping falhar, a conexão pode estar instável
        console.warn('Conexão instável detectada');
        return 'unstable';
      }
    }
    
    return data.status;
  } catch (error) {
    console.error('Erro ao verificar status:', error);
    return 'error';
  }
}, []);
```

### 5. Endpoint de ping para teste de conexão

Adicionar endpoint para verificar conexão com WhatsApp:

```typescript
// Em server/controllers/index.ts
// Adicionar novo endpoint para verificar conexão:

instanceRoutes.get('/:id/ping', isAuthenticated, async (req: Request, res: Response) => {
  try {
    const instanceId = parseInt(req.params.id);
    const userId = req.session.user?.id;
    
    if (!userId) {
      return res.status(401).json({ error: 'Não autorizado' });
    }
    
    // Verificar se a instância pertence ao usuário
    const instance = await storage.getInstance(instanceId);
    if (!instance || instance.userId !== userId) {
      return res.status(403).json({ error: 'Acesso negado a esta instância' });
    }
    
    // Verificar se a instância está conectada ao WhatsApp
    const isConnected = await getBaileyInstanceStatus(instanceId);
    
    if (isConnected === 'connected') {
      return res.status(200).json({ connected: true, message: 'Conexão WhatsApp ativa' });
    } else {
      return res.status(200).json({ connected: false, status: isConnected, message: 'Conexão WhatsApp não está ativa' });
    }
  } catch (error) {
    console.error('Erro ao verificar ping:', error);
    return res.status(500).json({ error: 'Erro interno do servidor' });
  }
});
```

## Monitoramento e depuração

Para monitorar e depurar conexões WhatsApp na VPS:

1. Implementar logs detalhados:

```typescript
// Em server/services/baileys.ts

// Função de log aprimorada
function enhancedLog(level: string, message: string, context?: any) {
  const timestamp = new Date().toISOString();
  const formattedMessage = `[${timestamp}] [${level}] ${message}`;
  
  // Log para console
  console[level === 'error' ? 'error' : 'log'](formattedMessage);
  
  // Log para arquivo
  const logDir = path.resolve('/var/www/zapban/logs');
  if (!fs.existsSync(logDir)) {
    fs.mkdirSync(logDir, { recursive: true });
  }
  
  const logFile = path.join(logDir, `baileys-${level}.log`);
  fs.appendFileSync(logFile, formattedMessage + (context ? ` ${JSON.stringify(context)}` : '') + '\n');
}

// Usar enhancedLog nos principais eventos:
sock.ev.on('connection.update', (update) => {
  enhancedLog('info', 'Connection update received', update);
  // resto do código...
});
```

2. Script para verificar conectividade periodicamente:

```bash
#!/bin/bash
# Salvar como /var/www/zapban/scripts/check-whatsapp.sh

ENDPOINT="http://localhost:5000/api/instances/1/status"
LOG_FILE="/var/www/zapban/logs/connection-check.log"

echo "[$(date)] Checking WhatsApp connection..." >> $LOG_FILE
RESPONSE=$(curl -s -o /dev/null -w "%{http_code}" $ENDPOINT)

if [ "$RESPONSE" != "200" ]; then
  echo "[$(date)] Connection check failed with code $RESPONSE" >> $LOG_FILE
  
  # Opcional: reiniciar serviços se necessário
  # pm2 restart zapban
  
  echo "[$(date)] Service restarted" >> $LOG_FILE
else
  echo "[$(date)] Connection check successful" >> $LOG_FILE
fi
```

Configure como um cronjob para executar periodicamente:

```
*/15 * * * * /var/www/zapban/scripts/check-whatsapp.sh
```

## Considerações finais

A migração do ambiente Replit para a VPS deve resolver os principais problemas de conexão WebSocket com o WhatsApp, já que:

1. A VPS não impõe as mesmas restrições de rede que o Replit
2. A conexão WebSocket pode permanecer aberta indefinidamente
3. Não há limitação de recursos como no ambiente gratuito

Os ajustes acima visam garantir uma transição suave e corrigir os problemas de conexão identificados. Após a migração, monitore os logs e implemente os ajustes adicionais conforme necessário.