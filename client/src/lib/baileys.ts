import { apiRequest } from './queryClient';
import { API_ENDPOINTS } from './constants';

// Types
export interface SendMessageParams {
  chatId: number;
  message: string;
  type: 'text' | 'image' | 'video' | 'document' | 'audio';
  media?: File;
}

export interface InstanceDetails {
  id: number;
  name: string;
  status: string;
  phoneNumber?: string;
  connected: boolean;
  createdAt: string;
  lastConnectedAt?: string;
  deviceInfo?: any;
}

// Helper function to create a FormData object for media messages
const createMediaFormData = (message: string, type: string, media?: File) => {
  const formData = new FormData();
  formData.append('message', message);
  formData.append('type', type);
  
  if (media) {
    formData.append('media', media);
  }
  
  return formData;
};

// Instance Management
export const createInstance = async (name: string) => {
  try {
    console.log("Creating instance with name:", name);
    
    // Verificar se temos uma sessão ativa antes de tentar criar a instância
    const userCheckResponse = await apiRequest('GET', API_ENDPOINTS.USER);
    
    if (!userCheckResponse.ok) {
      console.error("User not authenticated. Cannot create instance.");
      throw new Error("Usuário não autenticado. Faça login para criar uma instância.");
    }
    
    // Preparar o payload apenas com o nome (o servidor identificará o usuário pela sessão)
    const payload = { name };
    
    console.log("Sending instance creation payload:", payload);
    
    // Fazer a requisição com credentials: 'include' para enviar cookies de sessão
    const response = await apiRequest('POST', API_ENDPOINTS.INSTANCES, payload);
    
    // Verificar resposta
    if (!response.ok) {
      let errorMessage = 'Failed to create instance';
      try {
        // Tentar obter mensagem de erro formatada como JSON
        const errorData = await response.json();
        errorMessage = errorData.message || errorMessage;
      } catch {
        // Se não for JSON, tentar obter como texto
        const errorText = await response.text();
        if (errorText) errorMessage = errorText;
      }
      
      console.error(`Error creating instance: ${response.status}`, errorMessage);
      throw new Error(errorMessage);
    }
    
    // Processar resposta de sucesso
    const data = await response.json();
    console.log("Instance created successfully:", data);
    return data;
  } catch (error) {
    console.error("Error in createInstance:", error);
    throw error;
  }
};

export const getInstances = async () => {
  const response = await apiRequest('GET', API_ENDPOINTS.INSTANCES);
  return await response.json();
};

export const getInstance = async (id: number) => {
  const endpoint = `${API_ENDPOINTS.INSTANCES}/${id}`;
  const response = await apiRequest('GET', endpoint);
  return await response.json();
};

export const updateInstance = async (id: number, data: Partial<InstanceDetails>) => {
  const endpoint = `${API_ENDPOINTS.INSTANCES}/${id}`;
  const response = await apiRequest('PATCH', endpoint, data);
  return await response.json();
};

export const deleteInstance = async (id: number) => {
  const endpoint = `${API_ENDPOINTS.INSTANCES}/${id}`;
  await apiRequest('DELETE', endpoint);
};

export const getInstanceQR = async (id: number) => {
  try {
    console.log(`Requesting QR code for instance ${id}`);
    const endpoint = `${API_ENDPOINTS.INSTANCES}/${id}/qr`;
    const response = await apiRequest('GET', endpoint);
    
    // Verificar se a resposta foi bem-sucedida
    if (!response.ok) {
      let errorMessage = `Failed to get QR code: ${response.status}`;
      try {
        // Tentar obter mensagem de erro formatada como JSON
        const errorData = await response.json();
        errorMessage = errorData.message || errorMessage;
      } catch {
        // Se não for JSON, tentar obter como texto
        const errorText = await response.text();
        if (errorText) errorMessage = errorText;
      }
      
      console.error(`Error getting QR code for instance ${id}:`, errorMessage);
      
      // Se o erro for 404, devemos tentar iniciar a conexão primeiro
      if (response.status === 404) {
        console.log(`QR code not found, attempting to connect instance ${id} first`);
        // Iniciar a conexão e então refazer a solicitação do QR
        try {
          await connectInstance(id);
          console.log(`Connection initiated, retrying QR code request for instance ${id}`);
          // Esperar um pouco para dar tempo do servidor gerar o QR
          await new Promise(resolve => setTimeout(resolve, 2000));
          
          // Refazer a solicitação do QR
          const retryResponse = await apiRequest('GET', endpoint);
          if (!retryResponse.ok) {
            throw new Error(`Failed to get QR code after connection: ${retryResponse.status}`);
          }
          
          const retryData = await retryResponse.json();
          console.log(`QR code successfully retrieved after connection for instance ${id}`);
          return retryData;
        } catch (retryError) {
          console.error(`Failed to get QR code after connection attempt:`, retryError);
          throw new Error('QR code not available. Try resetting the instance.');
        }
      }
      
      throw new Error(errorMessage);
    }
    
    const data = await response.json();
    
    // Verificar se temos dados válidos de QR code na resposta
    if (!data || !data.qrCode) {
      console.log(`No QR code in response for instance ${id}, attempting to generate one`);
      
      // Tentar iniciar a conexão para gerar um QR
      try {
        await connectInstance(id);
        console.log(`Connection initiated to generate QR for instance ${id}`);
        // Esperar um pouco para dar tempo do servidor gerar o QR
        await new Promise(resolve => setTimeout(resolve, 2000));
        
        // Refazer a solicitação do QR
        const retryResponse = await apiRequest('GET', endpoint);
        if (!retryResponse.ok) {
          throw new Error(`Failed to get QR code after connection: ${retryResponse.status}`);
        }
        
        const retryData = await retryResponse.json();
        console.log(`QR code successfully retrieved after connection for instance ${id}`);
        return retryData;
      } catch (retryError) {
        console.error(`Failed to generate QR code:`, retryError);
        return { qrCode: null, message: 'QR code not available. Try resetting the instance.' };
      }
    }
    
    console.log(`QR code response for instance ${id}:`, 
      data.qrCode ? `[QR code available: ${data.qrCode.substring(0, 20)}...]` : 'No QR code in response');
    
    return data;
  } catch (error) {
    console.error(`Error getting QR code for instance ${id}:`, error);
    throw error;
  }
};

export const connectInstance = async (id: number) => {
  try {
    console.log(`Connecting instance ${id}`);
    const endpoint = `${API_ENDPOINTS.INSTANCES}/${id}/connect`;
    const response = await apiRequest('POST', endpoint);
    
    // Verifica se o request foi bem-sucedido
    if (!response.ok) {
      const errorText = await response.text();
      console.error(`Error connecting instance ${id}:`, errorText);
      throw new Error(errorText || `Failed to connect instance: ${response.status}`);
    }
    
    const data = await response.json();
    console.log(`Instance ${id} connect response:`, data);
    return data;
  } catch (error) {
    console.error(`Error connecting instance ${id}:`, error);
    throw error;
  }
};

export const disconnectInstance = async (id: number) => {
  const endpoint = `${API_ENDPOINTS.INSTANCES}/${id}/disconnect`;
  const response = await apiRequest('POST', endpoint);
  return await response.json();
};

export const resetInstance = async (id: number) => {
  try {
    console.log(`Forcing reset for instance ${id}`);
    const endpoint = `${API_ENDPOINTS.INSTANCES}/${id}/reset`;
    const response = await apiRequest('POST', endpoint);
    
    // Verifica se o request foi bem-sucedido
    if (!response.ok) {
      const errorText = await response.text();
      console.error(`Error resetting instance ${id}:`, errorText);
      throw new Error(errorText || `Failed to reset instance: ${response.status}`);
    }
    
    const data = await response.json();
    console.log(`Instance ${id} reset response:`, data);
    return data;
  } catch (error) {
    console.error(`Error resetting instance ${id}:`, error);
    throw error;
  }
};

export const getInstanceStatus = async (id: number) => {
  const endpoint = `${API_ENDPOINTS.INSTANCES}/${id}/status`;
  const response = await apiRequest('GET', endpoint);
  return await response.json();
};

// Chat Management
export const getChats = async (instanceId: number) => {
  const endpoint = `${API_ENDPOINTS.INSTANCES}/${instanceId}/chats`;
  const response = await apiRequest('GET', endpoint);
  return await response.json();
};

export const getChat = async (id: number) => {
  const endpoint = `${API_ENDPOINTS.CHATS}/${id}`;
  const response = await apiRequest('GET', endpoint);
  return await response.json();
};

export const getChatMessages = async (chatId: number) => {
  const endpoint = `${API_ENDPOINTS.CHAT_MESSAGES(chatId)}`;
  const response = await apiRequest('GET', endpoint);
  return await response.json();
};

// Send Messages
export const sendTextMessage = async ({ chatId, message }: Pick<SendMessageParams, 'chatId' | 'message'>) => {
  const endpoint = `${API_ENDPOINTS.CHATS}/${chatId}/send`;
  const response = await apiRequest('POST', endpoint, { 
    message, 
    type: 'text' 
  });
  return await response.json();
};

export const sendMediaMessage = async ({ chatId, message, type, media }: SendMessageParams) => {
  if (!media) {
    throw new Error('Media file is required for media messages');
  }
  
  const endpoint = `${API_ENDPOINTS.CHATS}/${chatId}/send`;
  const formData = createMediaFormData(message, type, media);
  
  // Special handling for FormData
  const response = await fetch(endpoint, {
    method: 'POST',
    body: formData,
    credentials: 'include',
  });
  
  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(errorText || response.statusText);
  }
  
  return await response.json();
};
