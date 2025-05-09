import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Separator } from '@/components/ui/separator';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Search } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { 
  MessageSquare, 
  ArrowLeftRight, 
  Brain, 
  Zap, 
  Clock, 
  Mic, 
  Image, 
  FileText, 
  Tag, 
  Globe, 
  BarChart, 
  FileUp
} from 'lucide-react';

// Componente para um item na barra lateral que pode ser arrastado
const DraggableNodeItem = ({ 
  type, 
  label, 
  icon, 
  color = '#64748b', 
  description 
}: { 
  type: string; 
  label: string; 
  icon: React.ReactNode; 
  color?: string; 
  description?: string 
}) => {
  const onDragStart = (event: React.DragEvent<HTMLDivElement>) => {
    event.dataTransfer.setData('application/reactflow', type);
    event.dataTransfer.effectAllowed = 'move';
  };

  return (
    <div
      className="rounded-lg border p-2 flex items-start gap-2 cursor-grab hover:bg-accent transition-colors mb-2"
      onDragStart={onDragStart}
      draggable
    >
      <div 
        className="p-1.5 rounded-md" 
        style={{ backgroundColor: `${color}20` }}
      >
        {React.cloneElement(icon as React.ReactElement, { size: 16, color })}
      </div>
      <div>
        <div className="text-sm font-medium">{label}</div>
        {description && (
          <div className="text-xs text-muted-foreground">{description}</div>
        )}
      </div>
    </div>
  );
};

// Componente para uma categoria de nós
const NodeCategory = ({ 
  title, 
  children 
}: { 
  title: string; 
  children: React.ReactNode 
}) => {
  return (
    <div className="mb-4">
      <h3 className="text-sm font-medium mb-2">{title}</h3>
      <div>{children}</div>
    </div>
  );
};

// Componente da barra lateral com nós disponíveis
const NodeSidebar = () => {
  const [searchTerm, setSearchTerm] = useState('');
  
  // Filtra os nós com base no termo de pesquisa
  const filterNodes = (label: string, description?: string) => {
    if (!searchTerm) return true;
    
    const termLower = searchTerm.toLowerCase();
    return (
      label.toLowerCase().includes(termLower) ||
      (description && description.toLowerCase().includes(termLower))
    );
  };

  return (
    <Card className="h-full w-64 border-r border-t-0 border-b-0 rounded-none">
      <CardHeader className="px-3 py-2 border-b">
        <CardTitle className="text-sm">Componentes</CardTitle>
        <div className="relative">
          <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
          <Input 
            placeholder="Pesquisar..."
            className="pl-8 h-9"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>
      </CardHeader>
      <CardContent className="p-0">
        <ScrollArea className="h-[calc(100vh-10rem)]">
          <div className="p-3">
            
            {/* Categoria: Mensagens Básicas */}
            <NodeCategory title="Mensagens Básicas">
              {filterNodes('Mensagem de Texto', 'Envia uma mensagem de texto simples para o contato') && (
                <DraggableNodeItem
                  type="textNode"
                  label="Mensagem de Texto"
                  icon={<MessageSquare />}
                  color="#2563EB"
                  description="Envia uma mensagem de texto simples para o contato"
                />
              )}
              
              {filterNodes('Digitando...', 'Simula a animação de digitação antes de enviar a próxima mensagem') && (
                <DraggableNodeItem
                  type="typingNode"
                  label="Digitando..."
                  icon={<Clock />}
                  color="#0EA5E9"
                  description="Simula a animação de digitação antes de enviar a próxima mensagem"
                />
              )}
              
              {filterNodes('Áudio', 'Envia uma mensagem de áudio para o contato') && (
                <DraggableNodeItem
                  type="audioNode"
                  label="Áudio"
                  icon={<Mic />}
                  color="#EC4899"
                  description="Envia uma mensagem de áudio para o contato"
                />
              )}
              
              {filterNodes('Imagem', 'Envia uma imagem para o contato') && (
                <DraggableNodeItem
                  type="imageNode"
                  label="Imagem"
                  icon={<Image />}
                  color="#84CC16"
                  description="Envia uma imagem para o contato"
                />
              )}
              
              {filterNodes('Documento', 'Envia um documento ou arquivo para o contato') && (
                <DraggableNodeItem
                  type="documentNode"
                  label="Documento"
                  icon={<FileText />}
                  color="#6366F1"
                  description="Envia um documento ou arquivo para o contato"
                />
              )}
            </NodeCategory>
            
            <Separator className="my-3" />
            
            {/* Categoria: Fluxo e Lógica */}
            <NodeCategory title="Fluxo e Lógica">
              {filterNodes('Condição', 'Define caminhos alternativos baseados em uma condição') && (
                <DraggableNodeItem
                  type="conditionNode"
                  label="Condição"
                  icon={<ArrowLeftRight />}
                  color="#F59E0B"
                  description="Define caminhos alternativos baseados em uma condição"
                />
              )}
              
              {filterNodes('Esperar Resposta', 'Pausa o fluxo até receber uma resposta do contato') && (
                <DraggableNodeItem
                  type="waitResponseNode"
                  label="Esperar Resposta"
                  icon={<Clock />}
                  color="#D946EF"
                  description="Pausa o fluxo até receber uma resposta do contato"
                />
              )}
              
              {filterNodes('Adicionar Tag', 'Adiciona uma tag ou etiqueta ao contato') && (
                <DraggableNodeItem
                  type="tagNode"
                  label="Adicionar Tag"
                  icon={<Tag />}
                  color="#64748B"
                  description="Adiciona uma tag ou etiqueta ao contato"
                />
              )}
              
              {filterNodes('Agendamento', 'Agenda uma ação para ser executada posteriormente') && (
                <DraggableNodeItem
                  type="scheduleNode"
                  label="Agendamento"
                  icon={<Clock />}
                  color="#0891B2"
                  description="Agenda uma ação para ser executada posteriormente"
                />
              )}
            </NodeCategory>
            
            <Separator className="my-3" />
            
            {/* Categoria: IA e Integração */}
            <NodeCategory title="IA e Integração">
              {filterNodes('Agente IA', 'Utiliza um agente de IA previamente configurado') && (
                <DraggableNodeItem
                  type="aiAgentNode"
                  label="Agente IA"
                  icon={<Brain />}
                  color="#8B5CF6"
                  description="Utiliza um agente de IA previamente configurado"
                />
              )}
              
              {filterNodes('OpenAI', 'Integração direta com a API da OpenAI') && (
                <DraggableNodeItem
                  type="openaiNode"
                  label="OpenAI"
                  icon={<Zap />}
                  color="#10B981"
                  description="Integração direta com a API da OpenAI"
                />
              )}
              
              {filterNodes('API Externa', 'Faz chamada para uma API externa') && (
                <DraggableNodeItem
                  type="apiNode"
                  label="API Externa"
                  icon={<Globe />}
                  color="#0EA5E9"
                  description="Faz chamada para uma API externa"
                />
              )}
              
              {filterNodes('Transferir para Humano', 'Transfere a conversa para um atendente humano') && (
                <DraggableNodeItem
                  type="humanNode"
                  label="Transferir para Humano"
                  icon={<MessageSquare />}
                  color="#DC2626"
                  description="Transfere a conversa para um atendente humano"
                />
              )}
            </NodeCategory>
            
            <Separator className="my-3" />
            
            {/* Categoria: CRM e Dados */}
            <NodeCategory title="CRM e Dados">
              {filterNodes('Entrada de Dados', 'Coleta uma informação específica do contato') && (
                <DraggableNodeItem
                  type="inputNode"
                  label="Entrada de Dados"
                  icon={<MessageSquare />}
                  color="#475569"
                  description="Coleta uma informação específica do contato"
                />
              )}
              
              {filterNodes('Menu de Opções', 'Apresenta um menu de opções para o contato escolher') && (
                <DraggableNodeItem
                  type="menuNode"
                  label="Menu de Opções"
                  icon={<BarChart />}
                  color="#9333EA"
                  description="Apresenta um menu de opções para o contato escolher"
                />
              )}
              
              {filterNodes('Upload de Arquivo', 'Solicita que o contato envie um arquivo') && (
                <DraggableNodeItem
                  type="fileUploadNode"
                  label="Upload de Arquivo"
                  icon={<FileUp />}
                  color="#0D9488"
                  description="Solicita que o contato envie um arquivo"
                />
              )}
            </NodeCategory>
          </div>
        </ScrollArea>
      </CardContent>
    </Card>
  );
};

export default NodeSidebar;