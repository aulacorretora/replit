
ENDPOINT="http://localhost:5000/api/instances/1/status"
LOG_FILE="/var/www/zapban/logs/connection-check.log"

echo "[$(date)] Verificando conexão WhatsApp..." >> $LOG_FILE
RESPONSE=$(curl -s -o /dev/null -w "%{http_code}" $ENDPOINT)

if [ "$RESPONSE" != "200" ]; then
  echo "[$(date)] Verificação de conexão falhou com código $RESPONSE" >> $LOG_FILE
  
  
  echo "[$(date)] Serviço reiniciado" >> $LOG_FILE
else
  echo "[$(date)] Verificação de conexão bem-sucedida" >> $LOG_FILE
fi
