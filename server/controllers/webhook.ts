import { Request, Response } from 'express';
import { storage } from '../storage';
import crypto from 'crypto';

// Chave secreta para validar webhooks (deve ser mantida como variável de ambiente)
const WEBHOOK_SECRET = process.env.WEBHOOK_SECRET || 'zapban_webhook_secret_key';

/**
 * Manipulador de webhook para processar eventos de pagamento de diferentes plataformas
 * Suporta Hotmart, Kiwify e outras plataformas de pagamento
 */
export const handleWebhook = async (req: Request, res: Response) => {
  const platform = req.params.platform || 'generic';
  const requestBody = req.body;
  
  // Validar a assinatura do webhook (se disponível)
  const signature = req.headers['x-webhook-signature'] || req.headers['x-hotmart-signature'];
  if (signature) {
    const isValid = validateWebhookSignature(JSON.stringify(requestBody), signature as string);
    if (!isValid) {
      console.error(`Assinatura de webhook inválida para plataforma ${platform}`);
      return res.status(401).json({ 
        error: 'Assinatura inválida',
        platform,
        timestamp: new Date().toISOString()
      });
    }
  }
  
  try {
    console.log(`Webhook recebido de ${platform}:`, JSON.stringify(requestBody));
    
    // Processar o evento de acordo com a plataforma
    let webhookData;
    switch (platform.toLowerCase()) {
      case 'hotmart':
        webhookData = processHotmartWebhook(requestBody);
        break;
      case 'kiwify':
        webhookData = processKiwifyWebhook(requestBody);
        break;
      case 'monetizze':
        webhookData = processMonetizzeWebhook(requestBody);
        break;
      default:
        webhookData = processGenericWebhook(requestBody);
    }
    
    // Salvar o evento no banco de dados
    if (webhookData) {
      const event = await storage.createWebhookEvent({
        platform: webhookData.platform,
        rawData: webhookData.rawData,
        eventType: webhookData.eventType,
        buyerEmail: webhookData.buyerEmail,
        buyerName: webhookData.buyerName,
        productName: webhookData.productName,
        productId: webhookData.productId,
        planType: webhookData.planType,
        paymentStatus: webhookData.paymentStatus,
        transactionId: webhookData.transactionId,
        transactionDate: webhookData.transactionDate,
        amount: webhookData.amount,
        currency: webhookData.currency,
        processed: webhookData.processed || false,
        userId: webhookData.userId,
        createdAt: new Date()
      });
      
      console.log(`Evento de webhook salvo com sucesso, ID: ${event.id}`);
      
      // Se o webhook já tiver um usuário associado, processá-lo automaticamente
      if (webhookData.userId) {
        await processWebhookForUser(event.id, webhookData.userId);
      }
      
      return res.status(200).json({
        success: true,
        eventId: event.id,
        platform,
        status: 'processed',
        timestamp: new Date().toISOString()
      });
    } else {
      console.error(`Não foi possível processar webhook de ${platform}`);
      return res.status(422).json({
        error: 'Dados de webhook inválidos ou incompletos',
        platform,
        timestamp: new Date().toISOString()
      });
    }
  } catch (error) {
    console.error(`Erro ao processar webhook de ${platform}:`, error);
    return res.status(500).json({
      error: 'Erro ao processar webhook',
      message: error.message,
      platform,
      timestamp: new Date().toISOString()
    });
  }
};

/**
 * Recupera todos os eventos de webhook com filtros opcionais
 */
export const getWebhookEvents = async (req: Request, res: Response) => {
  try {
    const {
      platform,
      paymentStatus,
      email,
      startDate,
      endDate,
      processed
    } = req.query;
    
    const filters: any = {};
    
    if (platform) filters.platform = platform as string;
    if (paymentStatus) filters.paymentStatus = paymentStatus as string;
    if (email) filters.buyerEmail = email as string;
    if (processed !== undefined) filters.processed = processed === 'true';
    
    if (startDate || endDate) {
      filters.dateRange = {
        start: startDate ? new Date(startDate as string) : undefined,
        end: endDate ? new Date(endDate as string) : undefined
      };
    }
    
    const events = await storage.getWebhookEvents(filters);
    
    return res.status(200).json(events);
  } catch (error) {
    console.error('Erro ao buscar eventos de webhook:', error);
    return res.status(500).json({
      error: 'Erro ao buscar eventos de webhook',
      message: error.message
    });
  }
};

/**
 * Processa um evento de webhook associando-o a um usuário
 */
export const processWebhookEvent = async (req: Request, res: Response) => {
  try {
    const { eventId, userId } = req.body;
    
    if (!eventId || !userId) {
      return res.status(400).json({
        error: 'ID do evento e ID do usuário são obrigatórios'
      });
    }
    
    const result = await processWebhookForUser(eventId, userId);
    
    return res.status(200).json(result);
  } catch (error) {
    console.error('Erro ao processar evento de webhook:', error);
    return res.status(500).json({
      error: 'Erro ao processar evento de webhook',
      message: error.message
    });
  }
};

/**
 * Processa um evento para um usuário específico
 * Atualiza o plano e outros detalhes da conta
 */
async function processWebhookForUser(eventId: number, userId: number) {
  try {
    // Buscar o evento de webhook
    const event = await storage.getWebhookEvent(eventId);
    if (!event) {
      throw new Error(`Evento de webhook não encontrado: ${eventId}`);
    }
    
    // Verificar se o evento já foi processado
    if (event.processed) {
      return {
        success: false,
        message: 'Evento já foi processado anteriormente',
        eventId,
        userId
      };
    }
    
    // Buscar o usuário
    const user = await storage.getUser(userId);
    if (!user) {
      throw new Error(`Usuário não encontrado: ${userId}`);
    }
    
    // Processar o pagamento de acordo com o status
    const paymentStatus = event.paymentStatus?.toLowerCase();
    
    if (paymentStatus === 'approved' || 
        paymentStatus === 'completed' || 
        paymentStatus === 'paid' || 
        paymentStatus === 'pago') {
      
      // Atualizar o plano do usuário
      const planUpdates: any = {
        planType: event.planType || 'standard',
        planStatus: 'active',
        planStartDate: new Date(),
        planEndDate: calculatePlanEndDate(event.planType)
      };
      
      // Atualizar o usuário com o novo plano
      await storage.updateUser(userId, planUpdates);
      
      // Marcar o evento como processado
      await storage.updateWebhookEvent(eventId, {
        processed: true,
        userId,
        processedAt: new Date()
      });
      
      return {
        success: true,
        message: 'Pagamento processado com sucesso',
        eventId,
        userId,
        planType: event.planType,
        planEndDate: planUpdates.planEndDate
      };
    } else if (paymentStatus === 'refunded' || 
               paymentStatus === 'refund' || 
               paymentStatus === 'reembolsado') {
      
      // Processar reembolso - desativar o plano
      await storage.updateUser(userId, {
        planStatus: 'refunded',
        planEndDate: new Date() // Termina o plano imediatamente
      });
      
      // Marcar o evento como processado
      await storage.updateWebhookEvent(eventId, {
        processed: true,
        userId,
        processedAt: new Date()
      });
      
      return {
        success: true,
        message: 'Reembolso processado com sucesso',
        eventId,
        userId
      };
    } else if (paymentStatus === 'cancelled' || 
               paymentStatus === 'canceled' || 
               paymentStatus === 'cancelado') {
      
      // Processar cancelamento
      await storage.updateUser(userId, {
        planStatus: 'cancelled'
        // Neste caso, mantemos a data de término original
      });
      
      // Marcar o evento como processado
      await storage.updateWebhookEvent(eventId, {
        processed: true,
        userId,
        processedAt: new Date()
      });
      
      return {
        success: true,
        message: 'Cancelamento processado com sucesso',
        eventId,
        userId
      };
    } else {
      // Status de pagamento não processável (ex: pendente)
      return {
        success: false,
        message: `Status de pagamento não processável: ${paymentStatus}`,
        eventId,
        userId
      };
    }
  } catch (error) {
    console.error('Erro ao processar evento para usuário:', error);
    throw error;
  }
}

/**
 * Valida a assinatura de um webhook usando HMAC SHA-256
 */
function validateWebhookSignature(payload: string, signature: string): boolean {
  try {
    const computedSignature = crypto
      .createHmac('sha256', WEBHOOK_SECRET)
      .update(payload)
      .digest('hex');
    
    return crypto.timingSafeEqual(
      Buffer.from(computedSignature),
      Buffer.from(signature)
    );
  } catch (error) {
    console.error('Erro ao validar assinatura de webhook:', error);
    return false;
  }
}

/**
 * Calcula a data de término do plano com base no tipo do plano
 */
function calculatePlanEndDate(planType: string): Date {
  const now = new Date();
  const planType_lower = planType?.toLowerCase() || '';
  
  // Adicionar dias ou meses de acordo com o tipo de plano
  if (planType_lower.includes('mensal') || planType_lower.includes('monthly')) {
    now.setMonth(now.getMonth() + 1);
  } else if (planType_lower.includes('trimestral') || planType_lower.includes('quarterly')) {
    now.setMonth(now.getMonth() + 3);
  } else if (planType_lower.includes('semestral') || planType_lower.includes('semiannual')) {
    now.setMonth(now.getMonth() + 6);
  } else if (planType_lower.includes('anual') || planType_lower.includes('yearly') || planType_lower.includes('annual')) {
    now.setFullYear(now.getFullYear() + 1);
  } else if (planType_lower.includes('vitalício') || planType_lower.includes('lifetime')) {
    now.setFullYear(now.getFullYear() + 100); // Prazo muito longo para representar vitalício
  } else {
    // Padrão de 30 dias
    now.setDate(now.getDate() + 30);
  }
  
  return now;
}

/**
 * Processa webhooks da Hotmart
 */
function processHotmartWebhook(data: any) {
  try {
    if (!data || !data.data) {
      console.error('Dados inválidos do webhook Hotmart');
      return null;
    }
    
    const hotmartData = data.data;
    const purchase = hotmartData.purchase || {};
    const product = purchase.product || {};
    const buyer = purchase.buyer || {};
    
    return {
      platform: 'hotmart',
      rawData: JSON.stringify(data),
      eventType: data.event || 'purchase',
      buyerEmail: buyer.email,
      buyerName: `${buyer.name || ''} ${buyer.surname || ''}`.trim(),
      productName: product.name,
      productId: product.id?.toString(),
      planType: product.payment?.installments_number > 1 ? 'parcelado' : 'à vista',
      paymentStatus: purchase.status || 'unknown',
      transactionId: purchase.transaction || purchase.order_id,
      transactionDate: purchase.purchase_date ? new Date(purchase.purchase_date) : new Date(),
      amount: purchase.price?.value || 0,
      currency: purchase.price?.currency_code || 'BRL',
      processed: false
    };
  } catch (error) {
    console.error('Erro ao processar webhook da Hotmart:', error);
    return null;
  }
}

/**
 * Processa webhooks da Kiwify
 */
function processKiwifyWebhook(data: any) {
  try {
    if (!data || !data.data) {
      console.error('Dados inválidos do webhook Kiwify');
      return null;
    }
    
    const kiwifyData = data.data;
    
    return {
      platform: 'kiwify',
      rawData: JSON.stringify(data),
      eventType: data.event_type || 'sale',
      buyerEmail: kiwifyData.customer?.email,
      buyerName: kiwifyData.customer?.name,
      productName: kiwifyData.product?.name,
      productId: kiwifyData.product?.id,
      planType: kiwifyData.plan_name || 'standard',
      paymentStatus: kiwifyData.status,
      transactionId: kiwifyData.transaction_id || kiwifyData.order_id,
      transactionDate: kiwifyData.created_at ? new Date(kiwifyData.created_at) : new Date(),
      amount: kiwifyData.amount || 0,
      currency: kiwifyData.currency || 'BRL',
      processed: false
    };
  } catch (error) {
    console.error('Erro ao processar webhook da Kiwify:', error);
    return null;
  }
}

/**
 * Processa webhooks da Monetizze
 */
function processMonetizzeWebhook(data: any) {
  try {
    if (!data || !data.venda) {
      console.error('Dados inválidos do webhook Monetizze');
      return null;
    }
    
    const venda = data.venda;
    
    return {
      platform: 'monetizze',
      rawData: JSON.stringify(data),
      eventType: data.tipo || 'venda',
      buyerEmail: venda.email,
      buyerName: venda.nome,
      productName: venda.produto || data.produto?.nome,
      productId: venda.produto_id || data.produto?.id,
      planType: venda.plano || 'standard',
      paymentStatus: venda.status,
      transactionId: venda.codigo || venda.id,
      transactionDate: venda.data ? new Date(venda.data) : new Date(),
      amount: venda.valor || 0,
      currency: 'BRL',
      processed: false
    };
  } catch (error) {
    console.error('Erro ao processar webhook da Monetizze:', error);
    return null;
  }
}

/**
 * Processa webhooks genéricos
 */
function processGenericWebhook(data: any) {
  try {
    // Detectar o formato mais comum de cada plataforma
    // e tentar extrair os dados relevantes
    return {
      platform: 'generic',
      rawData: JSON.stringify(data),
      eventType: data.event || data.event_type || data.tipo || 'unknown',
      buyerEmail: data.email || data.customer?.email || data.buyer?.email || data.client?.email,
      buyerName: data.name || data.customer?.name || data.buyer?.name || data.client?.name,
      productName: data.product?.name || data.product_name || data.product || data.item,
      productId: data.product?.id || data.product_id,
      planType: data.plan || data.plan_name || data.plano || 'standard',
      paymentStatus: data.status || data.payment_status || data.payment?.status,
      transactionId: data.transaction_id || data.transaction || data.order_id || data.id,
      transactionDate: data.created_at || data.date || data.transaction_date ? new Date(data.created_at || data.date || data.transaction_date) : new Date(),
      amount: data.amount || data.value || data.price || 0,
      currency: data.currency || 'BRL',
      processed: false
    };
  } catch (error) {
    console.error('Erro ao processar webhook genérico:', error);
    return null;
  }
}