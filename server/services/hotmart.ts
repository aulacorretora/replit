import crypto from 'crypto';
import { storage } from '../storage';
import { InsertUser, InsertWebhookEvent } from '@shared/schema';
import { supabaseAuth } from './supabase';

// Types for Hotmart webhook payloads
interface HotmartWebhookPayload {
  id: string;
  event: string;
  version: string;
  data: HotmartTransactionData;
}

interface HotmartTransactionData {
  purchase: {
    transaction: string;
    status: 'APPROVED' | 'CANCELED' | 'COMPLETE' | 'REFUNDED' | 'CHARGEBACK' | 'EXPIRED' | 'DELAYED';
    warranty_date?: string;
    payment_engine: string;
    payment_type: string;
  };
  product: {
    id: string;
    name: string;
    ucode?: string;
  };
  producer: {
    name: string;
    document?: string;
    email?: string;
  };
  buyer: {
    name: string;
    email: string;
    birth_date?: string;
    document?: string;
  };
  commissions?: {
    affiliate?: {
      name: string;
      email: string;
      document?: string;
    }[];
  };
  subscription?: {
    plan?: {
      name: string;
      price: number;
    };
    status?: string;
    subscriber?: {
      code: string;
    };
  };
}

// Process Hotmart webhook
export async function processHotmartWebhook(payload: HotmartWebhookPayload, signature: string): Promise<{ success: boolean; message: string }> {
  try {
    // Store webhook event in database
    const event: InsertWebhookEvent = {
      provider: 'hotmart',
      event: payload.event,
      payload: payload as any,
      processed: false
    };
    
    const webhookEvent = await storage.createWebhookEvent(event);
    
    // Verify signature if a hotmart secret is configured
    if (process.env.HOTMART_SECRET) {
      const isValid = verifyHotmartSignature(JSON.stringify(payload), signature, process.env.HOTMART_SECRET);
      
      if (!isValid) {
        await storage.updateWebhookEvent(webhookEvent.id, {
          error: 'Invalid signature',
          processed: false
        });
        
        return { success: false, message: 'Invalid signature' };
      }
    }
    
    // Process the webhook based on the event type
    switch (payload.event) {
      case 'PURCHASE_APPROVED':
      case 'PURCHASE_COMPLETE':
        // Create or activate user
        await handlePurchaseApproved(payload, webhookEvent.id);
        break;
        
      case 'PURCHASE_CANCELED':
      case 'PURCHASE_REFUNDED':
      case 'PURCHASE_CHARGEBACK':
      case 'SUBSCRIPTION_CANCELED':
        // Deactivate user
        await handlePurchaseCanceled(payload, webhookEvent.id);
        break;
        
      case 'SUBSCRIPTION_RESTARTED':
      case 'PURCHASE_DELAYED':
        // Reactivate user
        await handleSubscriptionRestarted(payload, webhookEvent.id);
        break;
        
      default:
        // Unknown event, just log it
        await storage.updateWebhookEvent(webhookEvent.id, {
          processed: true,
          processedAt: new Date().toISOString()
        });
        
        return { success: true, message: `Event ${payload.event} logged but not processed` };
    }
    
    return { success: true, message: `Event ${payload.event} processed successfully` };
  } catch (error) {
    console.error('Error processing Hotmart webhook:', error);
    
    return { success: false, message: error instanceof Error ? error.message : 'Unknown error' };
  }
}

// Handle purchase approved or completed
async function handlePurchaseApproved(payload: HotmartWebhookPayload, webhookEventId: number) {
  const { buyer } = payload.data;
  
  try {
    // Check if user already exists
    let user = await storage.getUserByEmail(buyer.email);
    
    if (!user) {
      // User doesn't exist, create a new one with a random password
      const randomPassword = crypto.randomBytes(12).toString('hex');
      
      const newUser: InsertUser = {
        name: buyer.name,
        email: buyer.email,
        password: randomPassword, // This will be hashed by the auth service
        role: 'user',
        active: true,
        language: 'pt-BR' // Default to Portuguese
      };
      
      // Create user
      user = await supabaseAuth.createUser(newUser);
      
      if (!user) {
        throw new Error('Failed to create user');
      }
    } else {
      // User exists, activate if not already active
      if (!user.active) {
        await storage.updateUser(user.id, { active: true });
      }
    }
    
    // Mark webhook event as processed
    await storage.updateWebhookEvent(webhookEventId, {
      processed: true,
      processedAt: new Date().toISOString()
    });
    
    return true;
  } catch (error) {
    console.error('Error handling purchase approved:', error);
    
    // Mark webhook event as failed
    await storage.updateWebhookEvent(webhookEventId, {
      error: error instanceof Error ? error.message : 'Unknown error',
      processed: false
    });
    
    throw error;
  }
}

// Handle purchase canceled, refunded, or chargeback
async function handlePurchaseCanceled(payload: HotmartWebhookPayload, webhookEventId: number) {
  const { buyer } = payload.data;
  
  try {
    // Find user by email
    const user = await storage.getUserByEmail(buyer.email);
    
    if (user) {
      // Deactivate user
      await storage.updateUser(user.id, { active: false });
    }
    
    // Mark webhook event as processed
    await storage.updateWebhookEvent(webhookEventId, {
      processed: true,
      processedAt: new Date().toISOString()
    });
    
    return true;
  } catch (error) {
    console.error('Error handling purchase canceled:', error);
    
    // Mark webhook event as failed
    await storage.updateWebhookEvent(webhookEventId, {
      error: error instanceof Error ? error.message : 'Unknown error',
      processed: false
    });
    
    throw error;
  }
}

// Handle subscription restarted
async function handleSubscriptionRestarted(payload: HotmartWebhookPayload, webhookEventId: number) {
  const { buyer } = payload.data;
  
  try {
    // Find user by email
    const user = await storage.getUserByEmail(buyer.email);
    
    if (user) {
      // Reactivate user
      await storage.updateUser(user.id, { active: true });
    }
    
    // Mark webhook event as processed
    await storage.updateWebhookEvent(webhookEventId, {
      processed: true,
      processedAt: new Date().toISOString()
    });
    
    return true;
  } catch (error) {
    console.error('Error handling subscription restarted:', error);
    
    // Mark webhook event as failed
    await storage.updateWebhookEvent(webhookEventId, {
      error: error instanceof Error ? error.message : 'Unknown error',
      processed: false
    });
    
    throw error;
  }
}

// Verify Hotmart webhook signature
function verifyHotmartSignature(payload: string, signature: string, secret: string): boolean {
  try {
    // Calculate HMAC SHA-256 hash
    const hmac = crypto.createHmac('sha256', secret);
    const calculatedSignature = hmac.update(payload).digest('hex');
    
    // Compare with received signature
    return crypto.timingSafeEqual(
      Buffer.from(calculatedSignature),
      Buffer.from(signature)
    );
  } catch (error) {
    console.error('Error verifying Hotmart signature:', error);
    return false;
  }
}

// Reprocess a webhook event
export async function reprocessWebhookEvent(webhookEventId: number): Promise<boolean> {
  try {
    // Get webhook event
    const webhookEvent = await storage.getWebhookEvent(webhookEventId);
    
    if (!webhookEvent) {
      throw new Error('Webhook event not found');
    }
    
    // Only process Hotmart events
    if (webhookEvent.provider !== 'hotmart') {
      throw new Error('Only Hotmart webhook events can be reprocessed');
    }
    
    // Process based on event type
    const payload = webhookEvent.payload as HotmartWebhookPayload;
    
    switch (payload.event) {
      case 'PURCHASE_APPROVED':
      case 'PURCHASE_COMPLETE':
        await handlePurchaseApproved(payload, webhookEventId);
        break;
        
      case 'PURCHASE_CANCELED':
      case 'PURCHASE_REFUNDED':
      case 'PURCHASE_CHARGEBACK':
      case 'SUBSCRIPTION_CANCELED':
        await handlePurchaseCanceled(payload, webhookEventId);
        break;
        
      case 'SUBSCRIPTION_RESTARTED':
      case 'PURCHASE_DELAYED':
        await handleSubscriptionRestarted(payload, webhookEventId);
        break;
        
      default:
        // Unknown event, just mark as processed
        await storage.updateWebhookEvent(webhookEventId, {
          processed: true,
          processedAt: new Date().toISOString(),
          error: null
        });
        break;
    }
    
    return true;
  } catch (error) {
    console.error('Error reprocessing webhook event:', error);
    
    // Update error message
    if (webhookEventId) {
      await storage.updateWebhookEvent(webhookEventId, {
        error: error instanceof Error ? error.message : 'Unknown error',
        processed: false
      });
    }
    
    throw error;
  }
}
