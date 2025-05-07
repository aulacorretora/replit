import React, { useState, useEffect } from 'react';
import { Node } from 'reactflow';
import { useQuery } from '@tanstack/react-query';
import { X } from 'lucide-react';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Separator } from '@/components/ui/separator';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Slider } from '@/components/ui/slider';
import { Switch } from '@/components/ui/switch';
import { Badge } from '@/components/ui/badge';
import { apiRequest } from '@/lib/queryClient';

interface NodePropertiesPanelProps {
  node: Node;
  updateNodeData: (nodeId: string, newData: any) => void;
}

const NodePropertiesPanel: React.FC<NodePropertiesPanelProps> = ({ node, updateNodeData }) => {
  const [localData, setLocalData] = useState({ ...node.data });
  
  // Buscar os agentes de IA disponíveis (para o nó AIAgentNode)
  const { data: aiAgents = [] } = useQuery({
    queryKey: ['/api/ai/agents'],
    queryFn: async () => {
      const response = await apiRequest('GET', '/api/ai/agents');
      return await response.json();
    },
    enabled: node.type === 'aiAgentNode'
  });
  
  // Buscar as chaves de API disponíveis (para o nó OpenAINode)
  const { data: apiKeys = [] } = useQuery({
    queryKey: ['/api/user/api-keys'],
    queryFn: async () => {
      const response = await apiRequest('GET', '/api/user/api-keys');
      return await response.json();
    },
    enabled: node.type === 'openaiNode'
  });
  
  // Quando o nó selecionado muda, atualiza o estado local
  useEffect(() => {
    setLocalData({ ...node.data });
  }, [node.id, node.data]);

  // Quando os dados locais mudam, atualiza o nó
  const handleChange = (key: string, value: any) => {
    const newData = { ...localData, [key]: value };
    setLocalData(newData);
    updateNodeData(node.id, { [key]: value });
  };
  
  // Renderizar o painel de propriedades com base no tipo de nó
  const renderProperties = () => {
    switch (node.type) {
      case 'textNode':
        return (
          <>
            <div className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="label">Rótulo</Label>
                <Input
                  id="label"
                  value={localData.label || ''}
                  onChange={(e) => handleChange('label', e.target.value)}
                  placeholder="Rótulo do nó"
                />
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="message">Mensagem</Label>
                <Textarea
                  id="message"
                  value={localData.message || ''}
                  onChange={(e) => handleChange('message', e.target.value)}
                  placeholder="Digite sua mensagem aqui..."
                  rows={5}
                />
              </div>
              
              <div className="flex items-center space-x-2">
                <Switch
                  id="useVariables"
                  checked={localData.useVariables || false}
                  onCheckedChange={(checked) => handleChange('useVariables', checked)}
                />
                <Label htmlFor="useVariables">Usar variáveis</Label>
              </div>
              
              {localData.useVariables && (
                <div className="bg-muted/50 p-3 rounded-md">
                  <p className="text-xs text-muted-foreground mb-2">
                    Variáveis disponíveis:
                  </p>
                  <div className="flex flex-wrap gap-1">
                    <Badge variant="outline">{'{{contato.nome}}'}</Badge>
                    <Badge variant="outline">{'{{contato.telefone}}'}</Badge>
                    <Badge variant="outline">{'{{contato.email}}'}</Badge>
                    <Badge variant="outline">{'{{data}}'}</Badge>
                    <Badge variant="outline">{'{{hora}}'}</Badge>
                  </div>
                </div>
              )}
            </div>
          </>
        );
        
      case 'conditionNode':
        return (
          <>
            <div className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="label">Rótulo</Label>
                <Input
                  id="label"
                  value={localData.label || ''}
                  onChange={(e) => handleChange('label', e.target.value)}
                  placeholder="Rótulo do nó"
                />
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="condition">Condição</Label>
                <Textarea
                  id="condition"
                  value={localData.condition || ''}
                  onChange={(e) => handleChange('condition', e.target.value)}
                  placeholder="Ex: contato.tags.includes('cliente')"
                  rows={3}
                />
                <p className="text-xs text-muted-foreground">
                  Use JavaScript para definir a condição. Retorne verdadeiro ou falso.
                </p>
              </div>
              
              <div className="bg-muted/50 p-3 rounded-md">
                <p className="text-xs text-muted-foreground mb-2">
                  Exemplos de condições:
                </p>
                <div className="space-y-1 text-xs">
                  <div>1. <code>contato.tags.includes(&apos;cliente&apos;)</code></div>
                  <div>2. <code>contato.ultima_compra &gt; 30</code></div>
                  <div>3. <code>resposta.toLowerCase() === &apos;sim&apos;</code></div>
                </div>
              </div>
            </div>
          </>
        );
        
      case 'aiAgentNode':
        return (
          <>
            <div className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="label">Rótulo</Label>
                <Input
                  id="label"
                  value={localData.label || ''}
                  onChange={(e) => handleChange('label', e.target.value)}
                  placeholder="Rótulo do nó"
                />
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="agentId">Selecionar Agente de IA</Label>
                <Select
                  value={String(localData.agentId || '')}
                  onValueChange={(value) => handleChange('agentId', Number(value))}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Selecione um agente" />
                  </SelectTrigger>
                  <SelectContent>
                    {aiAgents.map((agent: any) => (
                      <SelectItem key={agent.id} value={String(agent.id)}>
                        {agent.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="additionalContext">Contexto Adicional</Label>
                <Textarea
                  id="additionalContext"
                  value={localData.additionalContext || ''}
                  onChange={(e) => handleChange('additionalContext', e.target.value)}
                  placeholder="Forneça contexto adicional para o agente..."
                  rows={4}
                />
              </div>
              
              <div className="flex items-center space-x-2">
                <Switch
                  id="useVariables"
                  checked={localData.useVariables || false}
                  onCheckedChange={(checked) => handleChange('useVariables', checked)}
                />
                <Label htmlFor="useVariables">Usar variáveis no contexto</Label>
              </div>
            </div>
          </>
        );
        
      case 'openaiNode':
        return (
          <>
            <div className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="label">Rótulo</Label>
                <Input
                  id="label"
                  value={localData.label || ''}
                  onChange={(e) => handleChange('label', e.target.value)}
                  placeholder="Rótulo do nó"
                />
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="apiKeyId">Chave da API</Label>
                <Select
                  value={String(localData.apiKeyId || '')}
                  onValueChange={(value) => handleChange('apiKeyId', Number(value))}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Selecione uma chave API" />
                  </SelectTrigger>
                  <SelectContent>
                    {apiKeys.filter((key: any) => key.provider === 'openai').map((key: any) => (
                      <SelectItem key={key.id} value={String(key.id)}>
                        {key.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="model">Modelo</Label>
                <Select
                  value={localData.model || 'gpt-4o'}
                  onValueChange={(value) => handleChange('model', value)}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Selecione um modelo" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="gpt-4o">GPT-4o (Mais avançado)</SelectItem>
                    <SelectItem value="gpt-3.5-turbo">GPT-3.5 Turbo (Mais rápido)</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              
              <div className="space-y-2">
                <div className="flex justify-between">
                  <Label htmlFor="temperature">Temperatura: {localData.temperature || 0.7}</Label>
                </div>
                <Slider
                  id="temperature"
                  min={0}
                  max={2}
                  step={0.1}
                  value={[localData.temperature || 0.7]}
                  onValueChange={(value) => handleChange('temperature', value[0])}
                />
                <p className="text-xs text-muted-foreground">
                  Valores mais baixos = mais previsível, valores mais altos = mais criativo.
                </p>
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="systemPrompt">Prompt do Sistema</Label>
                <Textarea
                  id="systemPrompt"
                  value={localData.systemPrompt || ''}
                  onChange={(e) => handleChange('systemPrompt', e.target.value)}
                  placeholder="Você é um assistente útil e amigável."
                  rows={4}
                />
              </div>
              
              <div className="flex items-center space-x-2">
                <Switch
                  id="includeHistory"
                  checked={localData.includeHistory || false}
                  onCheckedChange={(checked) => handleChange('includeHistory', checked)}
                />
                <Label htmlFor="includeHistory">Incluir histórico de conversa</Label>
              </div>
            </div>
          </>
        );
      
      case 'typingNode':
        return (
          <>
            <div className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="label">Rótulo</Label>
                <Input
                  id="label"
                  value={localData.label || ''}
                  onChange={(e) => handleChange('label', e.target.value)}
                  placeholder="Rótulo do nó"
                />
              </div>
              
              <div className="space-y-2">
                <div className="flex justify-between">
                  <Label htmlFor="duration">Duração (segundos): {localData.duration || 3}</Label>
                </div>
                <Slider
                  id="duration"
                  min={1}
                  max={10}
                  step={1}
                  value={[localData.duration || 3]}
                  onValueChange={(value) => handleChange('duration', value[0])}
                />
              </div>
            </div>
          </>
        );
      
      case 'audioNode':
        return (
          <>
            <div className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="label">Rótulo</Label>
                <Input
                  id="label"
                  value={localData.label || ''}
                  onChange={(e) => handleChange('label', e.target.value)}
                  placeholder="Rótulo do nó"
                />
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="audioSource">Fonte do Áudio</Label>
                <Select
                  value={localData.audioSource || 'upload'}
                  onValueChange={(value) => handleChange('audioSource', value)}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Selecione a fonte" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="upload">Upload de arquivo</SelectItem>
                    <SelectItem value="text-to-speech">Texto para fala</SelectItem>
                    <SelectItem value="url">URL externa</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              
              {localData.audioSource === 'text-to-speech' && (
                <div className="space-y-2">
                  <Label htmlFor="textToSpeech">Texto para conversão</Label>
                  <Textarea
                    id="textToSpeech"
                    value={localData.textToSpeech || ''}
                    onChange={(e) => handleChange('textToSpeech', e.target.value)}
                    placeholder="Digite o texto que será convertido em áudio..."
                    rows={3}
                  />
                </div>
              )}
              
              {localData.audioSource === 'url' && (
                <div className="space-y-2">
                  <Label htmlFor="audioUrl">URL do Áudio</Label>
                  <Input
                    id="audioUrl"
                    value={localData.audioUrl || ''}
                    onChange={(e) => handleChange('audioUrl', e.target.value)}
                    placeholder="https://exemplo.com/audio.mp3"
                  />
                </div>
              )}
              
              {localData.audioSource === 'upload' && (
                <div className="p-4 border border-dashed rounded-md text-center">
                  <p className="text-sm text-muted-foreground mb-2">
                    Upload de arquivo disponível ao publicar o fluxo
                  </p>
                  <Button
                    variant="outline"
                    size="sm"
                    type="button"
                    disabled
                  >
                    Selecionar arquivo
                  </Button>
                </div>
              )}
            </div>
          </>
        );
        
      default:
        return (
          <div className="py-4 text-center text-muted-foreground">
            <p>Selecione um nó para ver suas propriedades</p>
          </div>
        );
    }
  };
  
  return (
    <Card className="w-80 border-l h-full rounded-none overflow-hidden">
      <CardHeader className="px-4 py-3 border-b">
        <div className="flex justify-between items-center">
          <CardTitle className="text-sm font-medium">Propriedades</CardTitle>
          <Badge variant="outline" className="font-normal">
            {node.type?.replace('Node', '') || 'Desconhecido'}
          </Badge>
        </div>
      </CardHeader>
      <CardContent className="p-0">
        <ScrollArea className="h-[calc(100vh-12rem)]">
          <div className="p-4">
            {renderProperties()}
          </div>
        </ScrollArea>
      </CardContent>
    </Card>
  );
};

export default NodePropertiesPanel;