import { createClient } from '@supabase/supabase-js';
import bcrypt from 'bcryptjs';
import { User, InsertUser } from '@shared/schema';

// Supabase setup
const supabaseUrl = 'https://gqjfbdqgcjvdnbvcupcf.supabase.co';
const supabaseKey = process.env.SUPABASE_SERVICE_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImdxamZiZHFnY2p2ZG5idmN1cGNmIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc0NjQwMDM2OSwiZXhwIjoyMDYxOTc2MzY5fQ.wI3QXmtlkUlNjBHsd-HPlbQfQF0fX0sysoNoOYviqHo';

// Create the Supabase client
const supabase = createClient(supabaseUrl, supabaseKey);

// User Auth service
export const supabaseAuth = {
  // Sign in a user
  async signIn(email: string, password: string): Promise<User | null> {
    try {
      // Get user by email from database
      const { data, error } = await supabase
        .from('users')
        .select('*')
        .eq('email', email)
        .single();
      
      if (error || !data) {
        console.error('User not found:', error);
        return null;
      }
      
      // Verify password
      const user = data as User;
      const match = await bcrypt.compare(password, user.password);
      
      if (!match) {
        console.error('Password does not match');
        return null;
      }
      
      // Update last login timestamp
      await supabase
        .from('users')
        .update({ last_login_at: new Date().toISOString() })
        .eq('id', user.id);
      
      // Remove password from returned user object
      const { password: _, ...userWithoutPassword } = user;
      
      return userWithoutPassword as User;
    } catch (error) {
      console.error('Error signing in user:', error);
      return null;
    }
  },
  
  // Create a new user
  async createUser(userData: InsertUser): Promise<User | null> {
    try {
      // Hash the password
      const hashedPassword = await bcrypt.hash(userData.password, 10);
      
      // Create user with hashed password
      const { data, error } = await supabase
        .from('users')
        .insert({
          ...userData,
          password: hashedPassword,
          created_at: new Date().toISOString()
        })
        .select()
        .single();
      
      if (error) {
        console.error('Error creating user:', error);
        return null;
      }
      
      // Remove password from returned user object
      const user = data as User;
      const { password: _, ...userWithoutPassword } = user;
      
      return userWithoutPassword as User;
    } catch (error) {
      console.error('Error creating user:', error);
      return null;
    }
  },
  
  // Reset password
  async resetPassword(email: string, newPassword: string): Promise<boolean> {
    try {
      // Hash the new password
      const hashedPassword = await bcrypt.hash(newPassword, 10);
      
      // Update user password
      const { error } = await supabase
        .from('users')
        .update({ password: hashedPassword })
        .eq('email', email);
      
      if (error) {
        console.error('Error resetting password:', error);
        return false;
      }
      
      return true;
    } catch (error) {
      console.error('Error resetting password:', error);
      return false;
    }
  },
  
  // Update user profile
  async updateUserProfile(userId: number, userData: Partial<User>): Promise<User | null> {
    try {
      // Update user data
      const { data, error } = await supabase
        .from('users')
        .update(userData)
        .eq('id', userId)
        .select()
        .single();
      
      if (error) {
        console.error('Error updating user profile:', error);
        return null;
      }
      
      // Remove password from returned user object
      const user = data as User;
      const { password: _, ...userWithoutPassword } = user;
      
      return userWithoutPassword as User;
    } catch (error) {
      console.error('Error updating user profile:', error);
      return null;
    }
  },
  
  // Get user profile
  async getUserProfile(userId: number): Promise<User | null> {
    try {
      // Get user by ID
      const { data, error } = await supabase
        .from('users')
        .select('*')
        .eq('id', userId)
        .single();
      
      if (error) {
        console.error('Error getting user profile:', error);
        return null;
      }
      
      // Remove password from returned user object
      const user = data as User;
      const { password: _, ...userWithoutPassword } = user;
      
      return userWithoutPassword as User;
    } catch (error) {
      console.error('Error getting user profile:', error);
      return null;
    }
  }
};

export default supabase;
