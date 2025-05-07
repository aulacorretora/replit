import TextNode from './TextNode';
import ConditionNode from './ConditionNode';
import AIAgentNode from './AIAgentNode';
import OpenAINode from './OpenAINode';
import TypingNode from './TypingNode';
import AudioNode from './AudioNode';
import GenericNode from './GenericNode';

// Implementação de nó genérico para tipos ainda não especializados
// Isso garante que todos os componentes da barra lateral possam ser arrastados para o canvas
const ImageNode = (props: any) => GenericNode({ ...props, icon: 'image', color: '#84CC16' });
const DocumentNode = (props: any) => GenericNode({ ...props, icon: 'document', color: '#6366F1' });
const WaitResponseNode = (props: any) => GenericNode({ ...props, icon: 'clock', color: '#D946EF' });
const TagNode = (props: any) => GenericNode({ ...props, icon: 'tag', color: '#64748B' });
const ScheduleNode = (props: any) => GenericNode({ ...props, icon: 'schedule', color: '#0891B2' });
const ApiNode = (props: any) => GenericNode({ ...props, icon: 'api', color: '#0EA5E9' });
const HumanNode = (props: any) => GenericNode({ ...props, icon: 'human', color: '#DC2626' });
const InputNode = (props: any) => GenericNode({ ...props, icon: 'input', color: '#475569' });
const MenuNode = (props: any) => GenericNode({ ...props, icon: 'menu', color: '#9333EA' });
const FileUploadNode = (props: any) => GenericNode({ ...props, icon: 'upload', color: '#0D9488' });

// Mapeamento dos tipos de nós para seus componentes
const nodeTypes = {
  // Componentes com implementação completa
  textNode: TextNode,
  conditionNode: ConditionNode,
  aiAgentNode: AIAgentNode,
  openaiNode: OpenAINode,
  typingNode: TypingNode,
  audioNode: AudioNode,
  
  // Componentes genéricos (temporários)
  imageNode: ImageNode,
  documentNode: DocumentNode,
  waitResponseNode: WaitResponseNode,
  tagNode: TagNode,
  scheduleNode: ScheduleNode,
  apiNode: ApiNode,
  humanNode: HumanNode,
  inputNode: InputNode,
  menuNode: MenuNode,
  fileUploadNode: FileUploadNode,
};

export default nodeTypes;