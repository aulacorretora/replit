import React, { memo } from 'react';
import { NodeProps } from 'reactflow';
import { Hourglass } from 'lucide-react';
import BaseNode from './BaseNode';

// Nó para simular digitação no WhatsApp (feedback visual para o usuário)
const TypingNode = memo(({ data, isConnectable, selected, ...props }: NodeProps) => {
  // Formatar a prévia da duração para exibir no nó
  const formatPreview = () => {
    const duration = data.duration || 3;
    return `Duração: ${duration} segundo${duration !== 1 ? 's' : ''}`;
  };
  
  return (
    <BaseNode
      data={{
        ...data,
        icon: <Hourglass size={18} />,
        preview: formatPreview()
      }}
      isConnectable={isConnectable}
      selected={selected}
      color="#8B5CF6" // Roxo mais claro
      {...props}
    />
  );
});

TypingNode.displayName = 'TypingNode';

export default TypingNode;