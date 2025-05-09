import { db } from './db';
import { users } from '@shared/schema';
import bcrypt from 'bcryptjs';
import { eq } from 'drizzle-orm';

/**
 * Adds a test user to the database
 */
async function seedTestUser() {
  try {
    // Check if user with this email already exists
    const existingUser = await db.select().from(users).where(eq(users.email, 'teste@zapban.com'));
    
    if (existingUser.length > 0) {
      console.log('Test user already exists');
      return;
    }
    
    // Create a hashed password
    const hashedPassword = await bcrypt.hash('senha123', 10);
    
    // Insert the test user
    const newUser = await db.insert(users).values({
      email: 'teste@zapban.com',
      password: hashedPassword,
      name: 'Usuário de Teste',
      role: 'admin', // admin role for full access
      active: true,
      language: 'pt-BR',
      createdAt: new Date(),
    }).returning();
    
    console.log('Test user created:', {
      id: newUser[0].id,
      email: newUser[0].email,
      name: newUser[0].name,
      role: newUser[0].role
    });
    
  } catch (error) {
    console.error('Error seeding test user:', error);
  }
}

// Run the seed function
seedTestUser()
  .then(() => {
    console.log('Seeding completed');
    process.exit(0);
  })
  .catch(error => {
    console.error('Seeding failed:', error);
    process.exit(1);
  });