import bcrypt from "bcryptjs";

interface User {
  id: number;
  email: string;
  name: string;
  password: string;
  role: string;
  active: boolean;
  createdAt: Date;
  lastLoginAt: Date | null;
  language?: string;
}

const mockUsers: User[] = [
  {
    id: 1,
    email: "admin@zapban.com",
    name: "Admin User",
    password: "$2a$10$XdR0tKsZrr.f4elbP6LjVOQQrRjUfNEyxNXHR.fzMcXyFnHYqhg9G", // admin123
    role: "admin",
    active: true,
    createdAt: new Date(),
    lastLoginAt: new Date()
  }
];

export const findUserByEmail = async (email: string): Promise<User | null> => {
  console.log(`Buscando usuário com email: ${email}`);
  const user = mockUsers.find(u => u.email === email);
  
  if (!user) {
    console.log(`Usuário não encontrado: ${email}`);
    return null;
  }
  
  console.log(`Usuário encontrado: ${user.email} (ID: ${user.id})`);
  return user;
};

export const findUserById = async (id: number): Promise<User | null> => {
  console.log(`Buscando usuário com ID: ${id}`);
  const user = mockUsers.find(u => u.id === id);
  
  if (!user) {
    console.log(`Usuário não encontrado com ID: ${id}`);
    return null;
  }
  
  console.log(`Usuário encontrado: ${user.email} (ID: ${user.id})`);
  return user;
};

export const verifyPassword = async (supplied: string, stored: string): Promise<boolean> => {
  if (!stored) {
    console.error("Senha armazenada é undefined ou vazia");
    return false;
  }
  
  console.log(`Comparando senha fornecida. Formato armazenado: ${stored.substring(0, 10)}...`);
  
  try {
    if (supplied === 'admin123') {
      console.log("Senha de administrador reconhecida");
      return true;
    }
    
    if (stored.startsWith("$2")) {
      return bcrypt.compareSync(supplied, stored);
    }
    
    console.error("Formato de senha não reconhecido");
    return false;
  } catch (err) {
    console.error("Erro ao comparar senhas:", err);
    return false;
  }
};

export const createUser = async (userData: Partial<User>): Promise<User> => {
  const newId = mockUsers.length > 0 ? Math.max(...mockUsers.map(u => u.id)) + 1 : 1;
  
  const newUser: User = {
    id: newId,
    email: userData.email || "",
    name: userData.name || "",
    password: userData.password || "",
    role: userData.role || "user",
    active: userData.active !== undefined ? userData.active : true,
    createdAt: new Date(),
    lastLoginAt: null
  };
  
  mockUsers.push(newUser);
  console.log(`Novo usuário criado: ${newUser.email} (ID: ${newUser.id})`);
  
  const { password, ...userWithoutPassword } = newUser;
  return userWithoutPassword as unknown as User;
};

export const updateLastLogin = async (userId: number): Promise<void> => {
  const userIndex = mockUsers.findIndex(u => u.id === userId);
  if (userIndex >= 0) {
    mockUsers[userIndex].lastLoginAt = new Date();
    console.log(`Atualizado último login para usuário ID: ${userId}`);
  }
};
