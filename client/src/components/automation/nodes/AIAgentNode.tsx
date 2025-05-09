import React, { memo } from 'react';
import { NodeProps } from 'reactflow';
import { Bot } from 'lucide-react';
import BaseNode from './BaseNode';

// Nó para conexão com agentes de IA configurados pelo usuário
const AIAgentNode = memo(({ data, isConnectable, selected, ...props }: NodeProps) => {
  // Formatar a prévia do agente para exibir no nó
  const formatPreview = () => {
    const agentName = data.agentName || 'Selecione um agente';
    const additionalContext = data.additionalContext || '';
    
    let preview = `Agente: ${agentName}`;
    
    if (additionalContext && additionalContext.length > 0) {
      if (additionalContext.length > 60) {
        preview += `\nContexto: ${additionalContext.substring(0, 60)}...`;
      } else {
        preview += `\nContexto: ${additionalContext}`;
      }
    }
    
    return preview;
  };
  
  return (
    <BaseNode
      data={{
        ...data,
        icon: <Bot size={18} />,
        preview: formatPreview()
      }}
      isConnectable={isConnectable}
      selected={selected}
      color="#9333EA" // Roxo
      {...props}
    />
  );
});

AIAgentNode.displayName = 'AIAgentNode';

export default AIAgentNode;