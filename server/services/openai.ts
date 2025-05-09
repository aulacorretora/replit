import OpenAI from "openai";
import fs from 'fs';
import path from 'path';
import { AiAgent, AiAgentDocument } from "@shared/schema";
import { storage } from "../storage";

// Configuração da OpenAI
// the newest OpenAI model is "gpt-4o" which was released May 13, 2024. do not change this unless explicitly requested by the user
const DEFAULT_MODEL = "gpt-4o";
const DEFAULT_VOICE_MODEL = "alloy";

interface OpenAIClientOptions {
  apiKey?: string;
  organizationId?: string;
}

// Cache de clientes OpenAI por API key
const clientsCache = new Map<string, OpenAI>();

// Obter um cliente OpenAI com a API key do sistema ou do usuário
export async function getOpenAIClient(userId?: number): Promise<OpenAI> {
  // Se não for fornecido ID do usuário, use a chave padrão do sistema
  if (!userId) {
    const systemApiKey = process.env.OPENAI_API_KEY;
    if (!systemApiKey) {
      throw new Error("API key da OpenAI não configurada no sistema");
    }

    if (clientsCache.has(systemApiKey)) {
      return clientsCache.get(systemApiKey)!;
    }

    const client = new OpenAI({ apiKey: systemApiKey });
    clientsCache.set(systemApiKey, client);
    return client;
  }

  // Tentar encontrar uma chave API ativa do usuário para OpenAI
  const userApiKeys = await storage.getUserApiKeys(userId, 'openai');
  
  // Se o usuário tiver uma chave ativa, use-a
  if (userApiKeys && userApiKeys.length > 0) {
    const activeKey = userApiKeys.find(key => key.active && key.validated);
    
    if (activeKey) {
      if (clientsCache.has(activeKey.key)) {
        return clientsCache.get(activeKey.key)!;
      }
      
      const client = new OpenAI({ apiKey: activeKey.key });
      clientsCache.set(activeKey.key, client);
      
      // Atualizar lastUsedAt
      await storage.updateApiKey(activeKey.id, { lastUsedAt: new Date() });
      
      return client;
    }
  }
  
  // Se não houver chave do usuário, volte para a chave do sistema
  return getOpenAIClient();
}

// Gerar texto com a OpenAI
export async function generateText(
  prompt: string, 
  systemPrompt: string = "Você é um assistente útil e preciso.",
  userId?: number,
  options?: {
    model?: string;
    temperature?: number;
    maxTokens?: number;
    responseFormat?: 'text' | 'json';
  }
): Promise<string> {
  try {
    const openai = await getOpenAIClient(userId);
    
    const response = await openai.chat.completions.create({
      model: options?.model || DEFAULT_MODEL,
      messages: [
        { role: "system", content: systemPrompt },
        { role: "user", content: prompt }
      ],
      temperature: options?.temperature || 0.7,
      max_tokens: options?.maxTokens || 2048,
      ...(options?.responseFormat === 'json' ? { response_format: { type: "json_object" } } : {})
    });

    return response.choices[0].message.content || '';
  } catch (error) {
    console.error("Erro ao gerar texto com OpenAI:", error);
    throw new Error(`Falha ao gerar texto: ${error.message}`);
  }
}

// Analisar imagem com a OpenAI
export async function analyzeImage(
  base64Image: string,
  prompt: string = "Descreva detalhadamente o que você vê nesta imagem.",
  userId?: number,
  options?: {
    model?: string;
    maxTokens?: number;
  }
): Promise<string> {
  try {
    const openai = await getOpenAIClient(userId);
    
    const response = await openai.chat.completions.create({
      model: options?.model || DEFAULT_MODEL,
      messages: [
        {
          role: "user",
          content: [
            {
              type: "text",
              text: prompt
            },
            {
              type: "image_url",
              image_url: {
                url: `data:image/jpeg;base64,${base64Image}`
              }
            }
          ],
        },
      ],
      max_tokens: options?.maxTokens || 1000,
    });

    return response.choices[0].message.content || '';
  } catch (error) {
    console.error("Erro ao analisar imagem com OpenAI:", error);
    throw new Error(`Falha ao analisar imagem: ${error.message}`);
  }
}

// Transcrever áudio com a OpenAI
export async function transcribeAudio(
  audioFilePath: string,
  userId?: number,
  options?: {
    language?: string;
    prompt?: string;
  }
): Promise<{ text: string; duration: number }> {
  try {
    const openai = await getOpenAIClient(userId);
    const audioReadStream = fs.createReadStream(audioFilePath);

    const transcription = await openai.audio.transcriptions.create({
      file: audioReadStream,
      model: "whisper-1",
      language: options?.language,
      prompt: options?.prompt,
    });

    return {
      text: transcription.text,
      duration: transcription.duration || 0,
    };
  } catch (error) {
    console.error("Erro ao transcrever áudio com OpenAI:", error);
    throw new Error(`Falha ao transcrever áudio: ${error.message}`);
  }
}

// Gerar voz com a OpenAI
export async function generateSpeech(
  text: string,
  userId?: number,
  options?: {
    voice?: string;
    outputPath?: string;
  }
): Promise<{ audioPath: string; duration: number }> {
  try {
    const openai = await getOpenAIClient(userId);
    
    const voice = options?.voice || DEFAULT_VOICE_MODEL;
    const outputDir = path.resolve('./uploads/audio');
    
    // Garantir que o diretório existe
    await fs.mkdir(outputDir, { recursive: true });
    
    const timestamp = Date.now();
    const outputPath = options?.outputPath || path.join(outputDir, `speech_${timestamp}.mp3`);
    
    const mp3 = await openai.audio.speech.create({
      model: "tts-1",
      voice,
      input: text,
    });
    
    const buffer = Buffer.from(await mp3.arrayBuffer());
    await fs.writeFile(outputPath, buffer);
    
    // TODO: Calcular a duração real do áudio (atualmente retorna um valor aproximado)
    const duration = Math.ceil(text.length / 10); // Estimativa básica
    
    return {
      audioPath: outputPath,
      duration
    };
  } catch (error) {
    console.error("Erro ao gerar voz com OpenAI:", error);
    throw new Error(`Falha ao gerar voz: ${error.message}`);
  }
}

// Extrair texto de um PDF com a OpenAI
export async function extractTextFromPDF(
  pdfPath: string,
  userId?: number
): Promise<string> {
  try {
    // TODO: Implementar a extração de texto de PDFs
    // Pode ser feito com bibliotecas como pdf-parse ou pdfjs-dist
    // Por enquanto, retorna um erro
    throw new Error("Extração de texto de PDFs ainda não implementada");
  } catch (error) {
    console.error("Erro ao extrair texto do PDF:", error);
    throw new Error(`Falha ao extrair texto do PDF: ${error.message}`);
  }
}

// Validar uma API key da OpenAI
export async function validateOpenAIKey(apiKey: string): Promise<boolean> {
  try {
    const client = new OpenAI({ apiKey });
    
    // Fazer uma chamada simples para verificar se a chave é válida
    await client.models.list();
    
    return true;
  } catch (error) {
    console.error("Erro ao validar chave da OpenAI:", error);
    return false;
  }
}

// Obter resposta de um agente de IA com base no histórico de conversa
export async function getAgentResponse(
  agentId: number,
  userId: number,
  conversationId: number,
  input: string,
  options?: {
    useVoice?: boolean;
  }
): Promise<{
  text: string;
  audioPath?: string;
  audioDuration?: number;
}> {
  try {
    // Buscar o agente
    const agent = await storage.getAiAgent(agentId);
    if (!agent) {
      throw new Error("Agente não encontrado");
    }
    
    // Verificar se o agente pertence ao usuário
    if (agent.userId !== userId) {
      throw new Error("Acesso negado a este agente");
    }
    
    // Buscar histórico da conversa
    const conversation = await storage.getAiAgentConversation(conversationId);
    if (!conversation || conversation.agentId !== agentId) {
      throw new Error("Conversa não encontrada ou não pertence a este agente");
    }
    
    const messages = await storage.getAiAgentMessages(conversationId);
    
    // Construir o histórico para o prompt
    const promptMessages = messages.map(msg => {
      return {
        role: msg.role as "user" | "assistant" | "system",
        content: msg.content
      };
    });
    
    // Se não houver um prompt do sistema no histórico, adicione-o
    if (!promptMessages.some(msg => msg.role === "system")) {
      promptMessages.unshift({
        role: "system",
        content: agent.systemPrompt
      });
    }
    
    // Adicionar a nova mensagem do usuário
    promptMessages.push({
      role: "user",
      content: input
    });
    
    // Obter o cliente OpenAI
    const openai = await getOpenAIClient(userId);
    
    // Fazer a chamada para o modelo
    const response = await openai.chat.completions.create({
      model: agent.model || DEFAULT_MODEL,
      messages: promptMessages,
      temperature: Number(agent.temperature) || 0.7,
      max_tokens: agent.maxTokens || 2048
    });
    
    const textResponse = response.choices[0].message.content || '';
    
    // Armazenar a mensagem do usuário no histórico
    await storage.createAiAgentMessage({
      conversationId,
      role: "user",
      content: input
    });
    
    // Armazenar a resposta no histórico
    await storage.createAiAgentMessage({
      conversationId,
      role: "assistant",
      content: textResponse
    });
    
    // Se a opção de voz estiver habilitada e o agente tiver suporte a voz, gerar áudio
    let audioPath, audioDuration;
    if (options?.useVoice && agent.voiceEnabled) {
      const speech = await generateSpeech(textResponse, userId, {
        voice: agent.voiceModel || DEFAULT_VOICE_MODEL
      });
      
      audioPath = speech.audioPath;
      audioDuration = speech.duration;
    }
    
    return {
      text: textResponse,
      audioPath,
      audioDuration
    };
  } catch (error) {
    console.error("Erro ao obter resposta do agente:", error);
    throw new Error(`Falha ao obter resposta do agente: ${error.message}`);
  }
}

// Processar um documento para a base de conhecimento de um agente
export async function processAgentDocument(
  documentId: number,
  userId: number
): Promise<boolean> {
  try {
    // Buscar o documento
    const document = await storage.getAiAgentDocument(documentId);
    if (!document) {
      throw new Error("Documento não encontrado");
    }
    
    // Buscar o agente para verificar permissões
    const agent = await storage.getAiAgent(document.agentId);
    if (!agent || agent.userId !== userId) {
      throw new Error("Acesso negado a este documento");
    }
    
    // Marcar como em processamento
    await storage.updateAiAgentDocument(documentId, {
      processed: false,
      processingError: null
    });
    
    let extractedContent = '';
    
    // Processar de acordo com o tipo
    switch (document.type) {
      case 'text':
        // Se já for texto, usar diretamente
        extractedContent = document.content || '';
        break;
        
      case 'pdf':
        // Extração de PDF (a implementar)
        if (document.filePath) {
          extractedContent = await extractTextFromPDF(document.filePath, userId);
        }
        break;
        
      case 'image':
        // Análise de imagem com OCR
        if (document.filePath) {
          const buffer = await fs.readFile(document.filePath);
          const base64Image = buffer.toString('base64');
          extractedContent = await analyzeImage(
            base64Image, 
            "Extraia todo o texto visível nesta imagem. Se houver tabelas, extraia seu conteúdo em formato estruturado.",
            userId
          );
        }
        break;
        
      case 'audio':
        // Transcrição de áudio
        if (document.filePath) {
          const transcription = await transcribeAudio(document.filePath, userId);
          extractedContent = transcription.text;
        }
        break;
        
      case 'video':
        // TODO: Implementar processamento de vídeo (extração de áudio + transcrição)
        throw new Error("Processamento de vídeos ainda não implementado");
        
      default:
        throw new Error(`Tipo de documento não suportado: ${document.type}`);
    }
    
    // Atualizar o documento com o conteúdo extraído
    await storage.updateAiAgentDocument(documentId, {
      content: extractedContent,
      processed: true,
      processedAt: new Date()
    });
    
    return true;
  } catch (error) {
    console.error("Erro ao processar documento:", error);
    
    // Registrar erro no documento
    try {
      await storage.updateAiAgentDocument(documentId, {
        processed: true,
        processingError: error.message,
        processedAt: new Date()
      });
    } catch (updateError) {
      console.error("Erro ao atualizar status do documento:", updateError);
    }
    
    return false;
  }
}