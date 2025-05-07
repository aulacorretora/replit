import React, { memo } from 'react';
import { Handle, Position, NodeProps, useReactFlow } from 'reactflow';
import { ArrowLeftRight, Trash2 } from 'lucide-react';
import { Button } from '@/components/ui/button';

// Nó para condições (bifurcações)
const ConditionNode = memo(({ data, isConnectable, selected, id, ...props }: NodeProps) => {
  const { deleteElements } = useReactFlow();
  
  // Função para remover o nó atual
  const handleDelete = (event: React.MouseEvent) => {
    event.stopPropagation();
    deleteElements({ nodes: [{ id }] });
  };
  
  // Formatar a prévia da condição para exibir no nó
  const formatPreview = () => {
    const condition = data.condition || '';
    if (condition.length > 80) {
      return `SE (${condition.substring(0, 80)}...)`;
    }
    return `SE (${condition})`;
  };
  
  return (
    <div className="relative">
      <div 
        className={`
          relative rounded-md shadow-sm border bg-card
          ${selected ? 'ring-2 ring-primary/50' : ''}
        `}
        style={{ 
          minWidth: 220, 
          maxWidth: 280,
          borderLeftColor: '#F59E0B',
          borderLeftWidth: 4
        }}
      >
        {/* Entrada (handle de entrada) */}
        <Handle
          type="target"
          position={Position.Left}
          style={{ background: '#F59E0B', width: 8, height: 8 }}
          isConnectable={isConnectable}
        />
        
        {/* Cabeçalho do nó */}
        <div 
          className="flex items-center gap-1.5 px-3 py-1.5 border-b"
          style={{ 
            background: '#F59E0B10', // Cor com 10% de opacidade
          }}
        >
          <div className="p-1 rounded-sm" style={{ 
            background: '#F59E0B20' // Cor com 20% de opacidade
          }}>
            <ArrowLeftRight size={18} />
          </div>
          <div className="flex-1 text-sm font-medium truncate">{data.label || 'Condição'}</div>
          
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
            {formatPreview()}
          </div>
        </div>
        
        {/* Saída (handle de TRUE) */}
        <Handle
          type="source"
          position={Position.Right}
          id="true"
          style={{ background: '#16A34A', width: 8, height: 8 }}
          isConnectable={isConnectable}
        />
        
        {/* Saída (handle de FALSE) */}
        <Handle
          type="source"
          position={Position.Bottom}
          id="false"
          style={{ background: '#DC2626', width: 8, height: 8 }}
          isConnectable={isConnectable}
        />
      </div>
      
      {/* Indicador para a saída TRUE */}
      <div 
        className="absolute -right-14 top-1/3 p-0.5 px-1 bg-green-100 text-green-600 text-xs rounded border border-green-200 shadow-sm"
        style={{ transform: 'translateY(-50%)' }}
      >
        Verdadeiro
      </div>
      
      {/* Indicador para a saída FALSE */}
      <div 
        className="absolute bottom-0 left-1/2 p-0.5 px-1 bg-red-100 text-red-600 text-xs rounded border border-red-200 shadow-sm"
        style={{ transform: 'translate(-50%, 100%)' }}
      >
        Falso
      </div>
    </div>
  );
});

ConditionNode.displayName = 'ConditionNode';

export default ConditionNode;