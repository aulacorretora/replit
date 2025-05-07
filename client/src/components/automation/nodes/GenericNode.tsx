import React, { memo } from 'react';
import { NodeProps, useReactFlow } from 'reactflow';
import { 
  MessageSquare, Tag, Clock, Globe, 
  BarChart, Image, FileText, Mic, 
  Users, FileUp
} from 'lucide-react';
import BaseNode from './BaseNode';

interface GenericNodeProps extends NodeProps {
  icon: string;
  color: string;
}

// Mapeamento de nomes de ícones para componentes Lucide
const iconMap: Record<string, React.ReactNode> = {
  'image': <Image size={18} />,
  'document': <FileText size={18} />,
  'clock': <Clock size={18} />,
  'tag': <Tag size={18} />,
  'schedule': <Clock size={18} />,
  'api': <Globe size={18} />,
  'human': <Users size={18} />,
  'input': <MessageSquare size={18} />,
  'menu': <BarChart size={18} />,
  'upload': <FileUp size={18} />,
  'audio': <Mic size={18} />,
};

// Nó genérico para tipos ainda não implementados completamente
const GenericNode = memo(({ data, isConnectable, selected, id, icon, color, ...props }: GenericNodeProps) => {
  const { setNodes } = useReactFlow();
  
  // Este componente é usado quando um tipo específico de nó ainda não foi
  // totalmente implementado. Ele fornece uma visualização básica para o nó
  // enquanto a implementação completa não está disponível.
  
  return (
    <BaseNode
      id={id}
      data={{
        ...data,
        icon: iconMap[icon] || <MessageSquare size={18} />,
        preview: data.preview || 'Configuração necessária',
        label: data.label || 'Nó Genérico'
      }}
      isConnectable={isConnectable}
      selected={selected}
      color={color}
      {...props}
    />
  );
});

GenericNode.displayName = 'GenericNode';

export default GenericNode;