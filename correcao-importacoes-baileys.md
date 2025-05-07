# Correção de Importações do Baileys para Resolução do `ERR_UNSUPPORTED_DIR_IMPORT`

Este documento contém instruções específicas para corrigir os erros de importação do Baileys que estão causando falhas na implantação do projeto.

## Erro Detectado

```
ERR_UNSUPPORTED_DIR_IMPORT: Directory import '/home/runner/workspace/node_modules/@whiskeysockets/baileys/lib/Types' is not supported resolving ES modules
```

Esse erro ocorre porque em modo ES Modules (que é usado em ambiente de produção), o Node.js não permite a importação direta de diretórios sem especificar um arquivo.

## Arquivos que Precisam de Correção

Os seguintes arquivos provavelmente precisam ser corrigidos:

1. `server/services/baileys.ts` - Arquivo principal de integração com o WhatsApp
2. Qualquer outro arquivo que importe diretamente submodulos do Baileys

## Como Corrigir

### Exemplo de Correção

De:
```typescript
import { proto } from '@whiskeysockets/baileys/lib/Types';
import { WAMessageContent } from '@whiskeysockets/baileys/lib/Types';
```

Para:
```typescript
import { proto } from '@whiskeysockets/baileys/lib/Types/index.js';
import { WAMessageContent } from '@whiskeysockets/baileys/lib/Types/index.js';
```

Ou preferencialmente, use a importação direta do pacote raiz:
```typescript
import { proto, WAMessageContent } from '@whiskeysockets/baileys';
```

### Padrão para Seguir

1. Procure por todos os imports com o padrão `@whiskeysockets/baileys/lib/*`
2. Substitua por `@whiskeysockets/baileys/lib/*/index.js`
3. Onde possível, simplifique usando importações do pacote raiz

## Comando para Encontrar Todos os Imports Problemáticos

```bash
grep -r "from '@whiskeysockets/baileys/lib" --include="*.ts" .
```

## Verificação Após Correção

Após fazer as correções, você deve conseguir construir e implantar o projeto sem erros de importação.

## Exemplo de Arquivo Corrigido

Antes:
```typescript
import { 
  proto,
  WAMessageContent, 
  WAMessageStatus 
} from '@whiskeysockets/baileys/lib/Types';
import makeWASocket from '@whiskeysockets/baileys/lib/Socket';
import { Boom } from '@hapi/boom';
```

Depois:
```typescript
import { 
  proto,
  WAMessageContent, 
  WAMessageStatus,
  makeWASocket
} from '@whiskeysockets/baileys';
import { Boom } from '@hapi/boom';
```

## Nota Importante

Esta correção é necessária porque o ambiente de produção utiliza ES Modules, que possui regras mais rígidas de importação em comparação com o ambiente de desenvolvimento.