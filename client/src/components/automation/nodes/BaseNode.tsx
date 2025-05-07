import React from 'react';
import { Handle, Position, NodeProps, useReactFlow } from 'reactflow';
import { Trash2 } from 'lucide-react';
import { Button } from '@/components/ui/button';

interface BaseNodeProps extends NodeProps {
  color?: string;
}

// Nó base que serve como template para todos os tipos de nós
const BaseNode: React.FC<BaseNodeProps> = ({ 
  id,
  data, 
  isConnectable, 
  selected,
  color = '#64748b',
  ...props 
}) => {
  const { deleteElements } = useReactFlow();
  
  // Função para remover o nó atual
  const handleDelete = (event: React.MouseEvent) => {
    event.stopPropagation();
    deleteElements({ nodes: [{ id }] });
  };
  
  return (
    <div 
      className={`
        relative rounded-md shadow-sm border bg-card
        ${selected ? 'ring-2 ring-primary/50' : ''}
      `}
      style={{ 
        minWidth: 200, 
        maxWidth: 280,
        borderLeftColor: color,
        borderLeftWidth: 4
      }}
    >
      {/* Entrada (handle de entrada) */}
      <Handle
        type="target"
        position={Position.Left}
        style={{ background: color, width: 8, height: 8 }}
        isConnectable={isConnectable}
      />
      
      {/* Cabeçalho do nó */}
      <div 
        className="flex items-center gap-1.5 px-3 py-1.5 border-b"
        style={{ 
          background: `${color}10`, // Cor com 10% de opacidade
        }}
      >
        <div className="p-1 rounded-sm" style={{ 
          background: `${color}20` // Cor com 20% de opacidade
        }}>
          {data.icon}
        </div>
        <div className="flex-1 text-sm font-medium truncate">{data.label}</div>
        
        {/* Botão para excluir o nó */}
        <Button
          variant="ghost"
          size="icon"
          className="h-6 w-6 rounded-full opacity-70 hover:opacity-100 hover:text-red-500"
          onClick={handleDelete}
          title="Remover nó"
        >
          <Trash2 size={14} />
        </Button>
      </div>
      
      {/* Conteúdo do nó */}
      <div className="px-3 py-2">
        <div className="text-xs text-muted-foreground">
          {data.preview || 'Sem prévia disponível'}
        </div>
      </div>
      
      {/* Saída (handle de saída) */}
      <Handle
        type="source"
        position={Position.Right}
        id="default"
        style={{ background: color, width: 8, height: 8 }}
        isConnectable={isConnectable}
      />
    </div>
  );
};

export default BaseNode;