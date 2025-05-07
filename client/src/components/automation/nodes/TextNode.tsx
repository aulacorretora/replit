import React, { memo } from 'react';
import { NodeProps } from 'reactflow';
import { MessageSquare } from 'lucide-react';
import BaseNode from './BaseNode';

// Nó para envio de mensagens de texto
const TextNode = memo(({ data, isConnectable, selected, ...props }: NodeProps) => {
  // Formatar a prévia do texto para exibir no nó
  const formatPreview = () => {
    const message = data.message || '';
    if (message.length > 100) {
      return `${message.substring(0, 100)}...`;
    }
    return message;
  };
  
  return (
    <BaseNode
      data={{
        ...data,
        icon: <MessageSquare size={18} />,
        preview: formatPreview()
      }}
      isConnectable={isConnectable}
      selected={selected}
      color="#2563EB" // Azul
      {...props}
    />
  );
});

TextNode.displayName = 'TextNode';

export default TextNode;