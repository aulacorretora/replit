import { createClient } from '@supabase/supabase-js';
import { SUPABASE_TABLES } from './constants';

// Supabase setup
const supabaseUrl = 'https://gqjfbdqgcjvdnbvcupcf.supabase.co';
const supabaseKey = process.env.SUPABASE_ANON_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImdxamZiZHFnY2p2ZG5idmN1cGNmIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDY0MDAzNjksImV4cCI6MjA2MTk3NjM2OX0.x-hqQJYG2dcdmAxu6MGdWEdUFI3GjffxGBvzat2oAX4';

export const supabase = createClient(supabaseUrl, supabaseKey);

// Auth functions
export const signIn = async (email: string, password: string) => {
  const { data, error } = await supabase.auth.signInWithPassword({
    email,
    password,
  });
  
  return { data, error };
};

export const signOut = async () => {
  const { error } = await supabase.auth.signOut();
  return { error };
};

export const resetPassword = async (email: string) => {
  const { data, error } = await supabase.auth.resetPasswordForEmail(email, {
    redirectTo: `${window.location.origin}/reset-password`,
  });
  
  return { data, error };
};

export const updatePassword = async (password: string) => {
  const { data, error } = await supabase.auth.updateUser({
    password,
  });
  
  return { data, error };
};

export const getCurrentUser = async () => {
  const { data: { user }, error } = await supabase.auth.getUser();
  return { user, error };
};

// Realtime subscription functions
export const subscribeToMessages = (instanceId: number, onNewMessage: (message: any) => void) => {
  const channel = supabase
    .channel(`messages:instance=${instanceId}`)
    .on(
      'postgres_changes',
      {
        event: 'INSERT',
        schema: 'public',
        table: SUPABASE_TABLES.MESSAGES,
        filter: `instance_id=eq.${instanceId}`,
      },
      (payload) => {
        onNewMessage(payload.new);
      }
    )
    .subscribe();

  return () => {
    supabase.removeChannel(channel);
  };
};

export const subscribeToInstance = (instanceId: number, onUpdate: (instance: any) => void) => {
  const channel = supabase
    .channel(`instance:${instanceId}`)
    .on(
      'postgres_changes',
      {
        event: '*',
        schema: 'public',
        table: SUPABASE_TABLES.INSTANCES,
        filter: `id=eq.${instanceId}`,
      },
      (payload) => {
        onUpdate(payload.new);
      }
    )
    .subscribe();

  return () => {
    supabase.removeChannel(channel);
  };
};

export const subscribeToChats = (instanceId: number, onUpdate: (chat: any) => void) => {
  const channel = supabase
    .channel(`chats:instance=${instanceId}`)
    .on(
      'postgres_changes',
      {
        event: '*',
        schema: 'public',
        table: SUPABASE_TABLES.CHATS,
        filter: `instance_id=eq.${instanceId}`,
      },
      (payload) => {
        onUpdate(payload.new);
      }
    )
    .subscribe();

  return () => {
    supabase.removeChannel(channel);
  };
};

export default supabase;
