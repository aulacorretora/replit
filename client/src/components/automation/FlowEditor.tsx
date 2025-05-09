import React, { useState, useCallback, useRef, useEffect } from 'react';
import ReactFlow, {
  ReactFlowProvider,
  Controls,
  Background,
  useNodesState,
  useEdgesState,
  addEdge,
  Connection,
  Edge,
  Node,
  useReactFlow,
  ConnectionLineType,
  Panel
} from 'reactflow';
import 'reactflow/dist/style.css';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { PlusCircle, Save, Play, X, Settings } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

import NodeSidebar from './NodeSidebar';
import NodePropertiesPanel from './NodePropertiesPanel';
import nodeTypes from './nodes';

interface FlowEditorProps {
  flowId?: number;
  initialNodes?: Node[];
  initialEdges?: Edge[];
  readOnly?: boolean;
  onSave?: (nodes: Node[], edges: Edge[]) => void;
}

const getNodeId = () => `node_${Math.floor(Math.random() * 10000)}`;

const FlowEditor: React.FC<FlowEditorProps> = ({
  flowId,
  initialNodes = [],
  initialEdges = [],
  readOnly = false,
  onSave
}) => {
  // Estado do fluxo
  const [nodes, setNodes, onNodesChange] = useNodesState(initialNodes);
  const [edges, setEdges, onEdgesChange] = useEdgesState(initialEdges);
  const [selectedNode, setSelectedNode] = useState<Node | null>(null);
  const [showProperties, setShowProperties] = useState(false);
  const reactFlowWrapper = useRef<HTMLDivElement>(null);
  const { project, getNodes } = useReactFlow();
  const { toast } = useToast();
  
  // Lidar com a conexão entre nós
  const onConnect = useCallback(
    (params: Edge | Connection) => {
      // Se for um nó de condição, verifique se a conexão está saindo do handle "true" ou "false"
      if (params.sourceHandle === 'false') {
        // Para conexões que saem do handle "false" de um nó de condição,
        // atualizamos manualmente o nó para armazenar o ID do nó de destino
        // para o caminho "falso" em vez de criar uma aresta adicional
        const sourceNode = nodes.find((node) => node.id === params.source);
        if (sourceNode && sourceNode.type === 'conditionNode') {
          setNodes((nds) =>
            nds.map((node) => {
              if (node.id === params.source) {
                return {
                  ...node,
                  data: {
                    ...node.data,
                    falseNodeId: params.target
                  }
                };
              }
              return node;
            })
          );
          return; // Não criar uma aresta para o caminho "falso"
        }
      }
      
      setEdges((eds) => 
        addEdge(
          {
            ...params,
            type: 'smoothstep',
            animated: true,
            style: { stroke: '#64748b' }
          }, 
          eds
        )
      );
    },
    [nodes, setNodes, setEdges]
  );

  // Atualizar dados de um nó específico
  const updateNodeData = useCallback(
    (nodeId: string, newData: any) => {
      setNodes((nds) =>
        nds.map((node) => {
          if (node.id === nodeId) {
            return {
              ...node,
              data: {
                ...node.data,
                ...newData
              }
            };
          }
          return node;
        })
      );
    },
    [setNodes]
  );
  
  // Lidar com o drop de um novo nó da barra lateral
  const onDragOver = useCallback((event: React.DragEvent<HTMLDivElement>) => {
    event.preventDefault();
    event.dataTransfer.dropEffect = 'move';
  }, []);

  const onDrop = useCallback(
    (event: React.DragEvent<HTMLDivElement>) => {
      event.preventDefault();

      if (reactFlowWrapper.current) {
        const reactFlowBounds = reactFlowWrapper.current.getBoundingClientRect();
        const type = event.dataTransfer.getData('application/reactflow');
        
        // Verificar se o tipo é válido
        if (!type || !nodeTypes[type as keyof typeof nodeTypes]) {
          return;
        }

        const position = project({
          x: event.clientX - reactFlowBounds.left,
          y: event.clientY - reactFlowBounds.top,
        });

        // Dados padrão com base no tipo do nó
        let nodeData = { label: `Novo ${type}` };
        
        if (type === 'textNode') {
          nodeData = { ...nodeData, message: 'Digite sua mensagem aqui...' };
        } else if (type === 'conditionNode') {
          nodeData = { ...nodeData, condition: 'contato.tags.includes("cliente")' };
        } else if (type === 'openaiNode') {
          nodeData = { 
            ...nodeData, 
            model: 'gpt-4o',
            temperature: 0.7,
            systemPrompt: 'Você é um assistente útil e amigável.'
          };
        } else if (type === 'aiAgentNode') {
          nodeData = { ...nodeData, additionalContext: '' };
        } else if (type === 'typingNode') {
          nodeData = { ...nodeData, duration: 3 };
        } else if (type === 'audioNode') {
          nodeData = { ...nodeData, audioSource: 'upload' };
        }

        const newNode = {
          id: getNodeId(),
          type,
          position,
          data: nodeData,
        };

        setNodes((nds) => nds.concat(newNode));
      }
    },
    [project, setNodes]
  );

  // Manipulador para seleção de nó
  const onNodeClick = useCallback(
    (_: React.MouseEvent, node: Node) => {
      setSelectedNode(node);
      setShowProperties(true);
    },
    []
  );
  
  // Manipulador para clique em área vazia
  const onPaneClick = useCallback(() => {
    setSelectedNode(null);
    setShowProperties(false);
  }, []);

  // Validar o fluxo antes de salvar
  const validateFlow = useCallback(() => {
    const currentNodes = getNodes();
    const issues: string[] = [];
    
    // Verificar se há nós no fluxo
    if (currentNodes.length === 0) {
      issues.push("O fluxo está vazio. Adicione ao menos um nó.");
      return { valid: false, issues };
    }
    
    // Verificar se cada nó tem os dados necessários
    for (const node of currentNodes) {
      // Verificar se há nós sem conexões (isolados)
      const nodeHasConnections = edges.some(
        (edge) => edge.source === node.id || edge.target === node.id
      );
      
      if (!nodeHasConnections && currentNodes.length > 1) {
        issues.push(`O nó "${node.data.label || 'sem nome'}" está isolado. Conecte-o ao fluxo.`);
      }
      
      // Verificar se os dados específicos do tipo de nó estão preenchidos
      switch (node.type) {
        case 'textNode':
          if (!node.data.message || node.data.message.trim() === '') {
            issues.push(`O nó de texto "${node.data.label || 'sem nome'}" não tem mensagem definida.`);
          }
          break;
        case 'conditionNode':
          if (!node.data.condition || node.data.condition.trim() === '') {
            issues.push(`O nó de condição "${node.data.label || 'sem nome'}" não tem condição definida.`);
          }
          break;
        case 'openaiNode':
          if (!node.data.systemPrompt || node.data.systemPrompt.trim() === '') {
            issues.push(`O nó OpenAI "${node.data.label || 'sem nome'}" não tem prompt de sistema definido.`);
          }
          break;
        // Adicione validações para outros tipos de nós conforme implementados
      }
    }
    
    return { valid: issues.length === 0, issues };
  }, [getNodes, edges]);
  
  // Salvar o fluxo
  const handleSave = useCallback(() => {
    if (!onSave) return;
    
    const { valid, issues } = validateFlow();
    
    if (!valid) {
      // Mostrar alerta com os problemas encontrados
      toast({
        title: "Problemas no fluxo",
        description: (
          <div className="max-h-40 overflow-y-auto">
            <p className="font-medium mb-2">Corrija os seguintes problemas:</p>
            <ul className="list-disc pl-4 space-y-1 text-sm">
              {issues.map((issue, i) => (
                <li key={i}>{issue}</li>
              ))}
            </ul>
          </div>
        ),
        variant: "destructive",
      });
      return;
    }
    
    // Fluxo válido, pode salvar
    onSave(getNodes(), edges);
    toast({
      title: "Fluxo salvo com sucesso!",
      description: "Todas as alterações foram salvas.",
    });
  }, [getNodes, edges, onSave, toast, validateFlow]);

  // Efeito para carregar os dados iniciais
  useEffect(() => {
    if (initialNodes.length > 0 || initialEdges.length > 0) {
      setNodes(initialNodes);
      setEdges(initialEdges);
    }
  }, [initialNodes, initialEdges, setNodes, setEdges]);

  return (
    <div className="h-full flex">
      {/* Barra lateral de nós */}
      <NodeSidebar />

      {/* Editor de Fluxo */}
      <div className="flex-1 h-full flex flex-col">
        <Card className="h-full flex flex-col">
          <div className="px-4 py-2 border-b flex justify-between items-center">
            <h2 className="text-lg font-medium">
              {flowId ? 'Editar Fluxo' : 'Novo Fluxo'}
            </h2>
            <div className="flex space-x-2">
              <Button
                variant="outline"
                size="sm"
                className="flex items-center gap-1"
                onClick={() => setShowProperties(!showProperties)}
              >
                <Settings size={16} />
                {showProperties ? 'Ocultar' : 'Propriedades'}
              </Button>
              
              {!readOnly && (
                <Button
                  variant="default"
                  size="sm"
                  className="flex items-center gap-1"
                  onClick={handleSave}
                >
                  <Save size={16} />
                  Salvar
                </Button>
              )}
              
              <Button
                variant="secondary"
                size="sm"
                className="flex items-center gap-1"
              >
                <Play size={16} />
                Testar
              </Button>
            </div>
          </div>

          <div className="flex-1 flex" style={{ minHeight: 0 }}>
            <div className="flex-1" ref={reactFlowWrapper}>
              <ReactFlow
                nodes={nodes}
                edges={edges}
                onNodesChange={onNodesChange}
                onEdgesChange={onEdgesChange}
                onConnect={onConnect}
                onDrop={onDrop}
                onDragOver={onDragOver}
                onNodeClick={onNodeClick}
                onPaneClick={onPaneClick}
                nodeTypes={nodeTypes}
                fitView
                deleteKeyCode="Delete"
                minZoom={0.2}
                maxZoom={1.5}
                connectionLineType={ConnectionLineType.SmoothStep}
                connectionLineStyle={{ stroke: '#64748b' }}
                defaultEdgeOptions={{
                  type: 'smoothstep',
                  animated: true,
                  style: { stroke: '#64748b' }
                }}
              >
                <Controls position="bottom-right" showInteractive={false} />
                <Background gap={16} size={1} />
                
                <Panel position="top-left">
                  <Button
                    variant="secondary"
                    size="sm"
                    className="flex items-center gap-1 shadow-sm"
                    onClick={() => {
                      setNodes([]);
                      setEdges([]);
                    }}
                  >
                    <X size={16} />
                    Limpar tudo
                  </Button>
                </Panel>
                
                <Panel position="bottom-left">
                  <div className="text-xs text-muted-foreground bg-background/80 p-2 rounded shadow-sm backdrop-blur">
                    {nodes.length} nós | {edges.length} conexões
                  </div>
                </Panel>
              </ReactFlow>
            </div>

            {/* Painel de propriedades do nó */}
            {showProperties && selectedNode && (
              <NodePropertiesPanel
                node={selectedNode}
                updateNodeData={updateNodeData}
              />
            )}
          </div>
        </Card>
      </div>
    </div>
  );
};

// Componente com Provider para ReactFlow
const FlowEditorWithProvider: React.FC<FlowEditorProps> = (props) => {
  return (
    <ReactFlowProvider>
      <FlowEditor {...props} />
    </ReactFlowProvider>
  );
};

export default FlowEditorWithProvider;