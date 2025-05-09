import React, { memo } from 'react';
import { NodeProps } from 'reactflow';
import { Music } from 'lucide-react';
import BaseNode from './BaseNode';

// Nó para envio de mensagens de áudio
const AudioNode = memo(({ data, isConnectable, selected, ...props }: NodeProps) => {
  // Formatar a prévia do áudio para exibir no nó
  const formatPreview = () => {
    const audioSource = data.audioSource || 'upload';
    
    let preview = 'Fonte: ';
    
    switch (audioSource) {
      case 'upload':
        preview += 'Upload de arquivo';
        break;
      case 'text-to-speech':
        const text = data.textToSpeech || '';
        if (text.length > 0) {
          preview += `TTS - "${text.length > 30 ? text.substring(0, 30) + '...' : text}"`;
        } else {
          preview += 'Texto para fala';
        }
        break;
      case 'url':
        preview += data.audioUrl ? 'URL externa' : 'URL não definida';
        break;
      default:
        preview += 'Não configurado';
    }
    
    return preview;
  };
  
  return (
    <BaseNode
      data={{
        ...data,
        icon: <Music size={18} />,
        preview: formatPreview()
      }}
      isConnectable={isConnectable}
      selected={selected}
      color="#EC4899" // Rosa
      {...props}
    />
  );
});

AudioNode.displayName = 'AudioNode';

export default AudioNode;