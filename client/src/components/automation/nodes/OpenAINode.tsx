import React, { memo } from 'react';
import { NodeProps } from 'reactflow';
import { Sparkles } from 'lucide-react';
import BaseNode from './BaseNode';

// Nó para integração direta com API da OpenAI
const OpenAINode = memo(({ data, isConnectable, selected, ...props }: NodeProps) => {
  // Formatar a prévia do modelo OpenAI para exibir no nó
  const formatPreview = () => {
    const model = data.model || 'gpt-4o';
    const temperature = data.temperature || 0.7;
    const systemPrompt = data.systemPrompt || '';
    
    let preview = `Modelo: ${model}\nTemp: ${temperature}`;
    
    if (systemPrompt && systemPrompt.length > 0) {
      const truncatedPrompt = systemPrompt.length > 50 
        ? `${systemPrompt.substring(0, 50)}...` 
        : systemPrompt;
      preview += `\nPrompt: ${truncatedPrompt}`;
    }
    
    return preview;
  };
  
  return (
    <BaseNode
      data={{
        ...data,
        icon: <Sparkles size={18} />,
        preview: formatPreview()
      }}
      isConnectable={isConnectable}
      selected={selected}
      color="#10B981" // Verde esmeralda
      {...props}
    />
  );
});

OpenAINode.displayName = 'OpenAINode';

export default OpenAINode;