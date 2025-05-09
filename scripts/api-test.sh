

HOST=${1:-"http://localhost:5000"}

GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[0;33m'
NC='\033[0m' # No Color

echo -e "${YELLOW}Testando API do ZapBan em $HOST${NC}"
echo "----------------------------------------"

echo -e "${YELLOW}Testando endpoint de saúde...${NC}"
HEALTH_RESPONSE=$(curl -s -o /dev/null -w "%{http_code}" $HOST/api/health)
if [ "$HEALTH_RESPONSE" == "200" ]; then
    echo -e "${GREEN}✓ Endpoint de saúde respondendo corretamente (200)${NC}"
    echo "Resposta completa:"
    curl -s $HOST/api/health | json_pp
else
    echo -e "${RED}✗ Endpoint de saúde falhou com código $HEALTH_RESPONSE${NC}"
    echo "Resposta de erro:"
    curl -s $HOST/api/health
fi
echo "----------------------------------------"

echo -e "${YELLOW}Testando endpoint de status do WebSocket...${NC}"
WS_RESPONSE=$(curl -s -o /dev/null -w "%{http_code}" $HOST/api/ws-status)
if [ "$WS_RESPONSE" == "200" ]; then
    echo -e "${GREEN}✓ Endpoint de status do WebSocket respondendo corretamente (200)${NC}"
    echo "Resposta completa:"
    curl -s $HOST/api/ws-status | json_pp
else
    echo -e "${RED}✗ Endpoint de status do WebSocket falhou com código $WS_RESPONSE${NC}"
    echo "Resposta de erro:"
    curl -s $HOST/api/ws-status
fi
echo "----------------------------------------"

echo -e "${YELLOW}Testando endpoint de usuário atual (sem autenticação)...${NC}"
USER_RESPONSE=$(curl -s -o /dev/null -w "%{http_code}" $HOST/api/auth/user)
if [ "$USER_RESPONSE" == "401" ] || [ "$USER_RESPONSE" == "403" ]; then
    echo -e "${GREEN}✓ Endpoint de usuário retornando código de não autenticado ($USER_RESPONSE) como esperado${NC}"
    CONTENT_TYPE=$(curl -s -I $HOST/api/auth/user | grep -i content-type)
    if [[ $CONTENT_TYPE == *"application/json"* ]]; then
        echo -e "${GREEN}✓ Resposta é do tipo application/json${NC}"
    else
        echo -e "${RED}✗ Resposta não é do tipo application/json: $CONTENT_TYPE${NC}"
    fi
    echo "Resposta completa:"
    curl -s $HOST/api/auth/user
else
    echo -e "${RED}✗ Endpoint de usuário retornou código inesperado: $USER_RESPONSE${NC}"
    echo "Resposta de erro:"
    curl -s $HOST/api/auth/user
fi
echo "----------------------------------------"

echo -e "${YELLOW}Testes concluídos!${NC}"
