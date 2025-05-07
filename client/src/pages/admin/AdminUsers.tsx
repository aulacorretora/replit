import { useState } from 'react';
import { useLanguage } from '@/hooks/use-language';
import { useAuth } from '@/hooks/use-auth';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { API_ENDPOINTS } from '@/lib/constants';
import { apiRequest } from '@/lib/queryClient';
import Sidebar from '@/components/layout/Sidebar';
import Header from '@/components/layout/Header';
import { useMobile } from '@/hooks/use-mobile';
import { format } from 'date-fns';
import { ptBR, enUS } from 'date-fns/locale';
import { User } from '@shared/schema';
import { 
  Loader2, 
  Search, 
  UserPlus, 
  Check, 
  X, 
  MoreHorizontal, 
  Edit,
  Trash2,
  UserCog 
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Label } from '@/components/ui/label';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { useToast } from '@/hooks/use-toast';
import { Switch } from '@/components/ui/switch';

interface UserFormValues {
  name: string;
  email: string;
  password: string;
  role: string;
  active: boolean;
}

export default function AdminUsers() {
  const { t, language } = useLanguage();
  const { user } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const isMobile = useMobile();
  const [sidebarOpen, setSidebarOpen] = useState(!isMobile);
  
  // Search and filtering state
  const [searchQuery, setSearchQuery] = useState('');
  
  // User management state
  const [userDialogOpen, setUserDialogOpen] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [selectedUser, setSelectedUser] = useState<User | null>(null);
  const [formValues, setFormValues] = useState<UserFormValues>({
    name: '',
    email: '',
    password: '',
    role: 'user',
    active: true,
  });
  
  // Fetch users
  const { data: users, isLoading: loadingUsers } = useQuery({
    queryKey: [API_ENDPOINTS.ADMIN_USERS],
    enabled: user?.role === 'admin',
  });
  
  // Create/Update user mutation
  const userMutation = useMutation({
    mutationFn: async (userData: any) => {
      if (selectedUser) {
        // Update existing user
        const response = await apiRequest('PATCH', `${API_ENDPOINTS.ADMIN_USERS}/${selectedUser.id}`, userData);
        return response.json();
      } else {
        // Create new user
        const response = await apiRequest('POST', API_ENDPOINTS.ADMIN_USERS, userData);
        return response.json();
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [API_ENDPOINTS.ADMIN_USERS] });
      setUserDialogOpen(false);
      toast({
        title: selectedUser ? t('admin.userUpdated') : t('admin.userCreated'),
        description: selectedUser ? t('admin.userUpdatedDesc') : t('admin.userCreatedDesc'),
      });
    },
    onError: (error) => {
      toast({
        title: t('admin.error'),
        description: error.toString(),
        variant: 'destructive',
      });
    },
  });
  
  // Delete user mutation
  const deleteMutation = useMutation({
    mutationFn: async (userId: number) => {
      await apiRequest('DELETE', `${API_ENDPOINTS.ADMIN_USERS}/${userId}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [API_ENDPOINTS.ADMIN_USERS] });
      setDeleteDialogOpen(false);
      toast({
        title: t('admin.userDeleted'),
        description: t('admin.userDeletedDesc'),
      });
    },
    onError: (error) => {
      toast({
        title: t('admin.error'),
        description: error.toString(),
        variant: 'destructive',
      });
    },
  });
  
  // Toggle user active status mutation
  const toggleStatusMutation = useMutation({
    mutationFn: async ({ userId, active }: { userId: number, active: boolean }) => {
      const response = await apiRequest('PATCH', `${API_ENDPOINTS.ADMIN_USERS}/${userId}`, { active });
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [API_ENDPOINTS.ADMIN_USERS] });
      toast({
        title: t('admin.statusUpdated'),
        description: t('admin.statusUpdatedDesc'),
      });
    },
    onError: (error) => {
      toast({
        title: t('admin.error'),
        description: error.toString(),
        variant: 'destructive',
      });
    },
  });
  
  // Create new user
  const handleCreateUser = () => {
    setSelectedUser(null);
    setFormValues({
      name: '',
      email: '',
      password: '',
      role: 'user',
      active: true,
    });
    setUserDialogOpen(true);
  };
  
  // Edit user
  const handleEditUser = (user: User) => {
    setSelectedUser(user);
    setFormValues({
      name: user.name,
      email: user.email,
      password: '',
      role: user.role,
      active: user.active,
    });
    setUserDialogOpen(true);
  };
  
  // Delete user
  const handleDeleteUser = (user: User) => {
    setSelectedUser(user);
    setDeleteDialogOpen(true);
  };
  
  // Toggle user status
  const handleToggleStatus = (userId: number, active: boolean) => {
    toggleStatusMutation.mutate({ userId, active });
  };
  
  // Handle form submission
  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    const userData = { ...formValues };
    
    // If password is empty and we're editing a user, remove it
    if (selectedUser && !userData.password) {
      delete userData.password;
    }
    
    userMutation.mutate(userData);
  };
  
  // Format date
  const formatDate = (date?: string) => {
    if (!date) return '';
    
    return format(new Date(date), 'dd/MM/yyyy HH:mm', {
      locale: language === 'pt-BR' ? ptBR : enUS
    });
  };
  
  // Filter users by search query
  const filteredUsers = users?.filter(user => 
    user.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    user.email.toLowerCase().includes(searchQuery.toLowerCase())
  ) || [];
  
  // Redirect non-admin users
  if (user?.role !== 'admin') {
    return (
      <div className="flex items-center justify-center h-screen bg-neutral-100">
        <Card className="w-96">
          <CardContent className="pt-6">
            <div className="text-center">
              <h2 className="text-xl font-semibold mb-2">{t('admin.accessDenied')}</h2>
              <p className="text-neutral-500 mb-6">{t('admin.adminOnly')}</p>
              <Button asChild className="bg-primary hover:bg-primary-dark">
                <a href="/">{t('admin.backToDashboard')}</a>
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="flex h-screen overflow-hidden bg-neutral-800 text-white">
      <Sidebar isMobileOpen={sidebarOpen} closeMobileMenu={() => setSidebarOpen(false)} />
      
      <div className="flex-1 flex flex-col overflow-hidden">
        <Header title={t('admin.users')} openMobileMenu={() => setSidebarOpen(true)} />
        
        <main className="flex-1 overflow-auto p-4 md:p-6">
          <div className="flex flex-col md:flex-row items-start md:items-center justify-between mb-6">
            <div>
              <h1 className="text-2xl font-bold text-white">{t('admin.users')}</h1>
              <p className="text-neutral-400">{t('admin.manageUsersDesc')}</p>
            </div>
            
            <Button 
              onClick={handleCreateUser} 
              className="mt-4 md:mt-0 bg-primary hover:bg-primary-dark"
            >
              <UserPlus className="mr-2 h-4 w-4" />
              {t('admin.newUser')}
            </Button>
          </div>
          
          {/* Search and Filters */}
          <div className="mb-6">
            <div className="relative">
              <Search className="absolute left-3 top-3 h-4 w-4 text-neutral-400" />
              <Input 
                placeholder={t('admin.searchUsers')}
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10 bg-neutral-900 border-neutral-700 text-white placeholder:text-neutral-400"
              />
            </div>
          </div>
          
          {/* Users Table */}
          <Card className="bg-neutral-900 border-neutral-800 text-white">
            <CardHeader className="pb-2">
              <CardTitle>{t('admin.usersList')}</CardTitle>
            </CardHeader>
            <CardContent>
              {loadingUsers ? (
                <div className="flex items-center justify-center h-64">
                  <Loader2 className="h-8 w-8 text-primary animate-spin" />
                  <span className="ml-2 text-neutral-400">{t('admin.loadingUsers')}</span>
                </div>
              ) : filteredUsers.length > 0 ? (
                <div className="overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow className="border-neutral-700">
                        <TableHead>{t('admin.user')}</TableHead>
                        <TableHead>{t('admin.status')}</TableHead>
                        <TableHead>{t('admin.role')}</TableHead>
                        <TableHead>{t('admin.createdAt')}</TableHead>
                        <TableHead>{t('admin.lastLogin')}</TableHead>
                        <TableHead className="text-right">{t('admin.actions')}</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {filteredUsers.map((user) => (
                        <TableRow key={user.id} className="border-neutral-700">
                          <TableCell className="font-medium">
                            <div className="flex items-center">
                              <div className="w-10 h-10 rounded-full bg-neutral-800 flex items-center justify-center text-neutral-400 mr-3">
                                {user.name.charAt(0).toUpperCase()}
                              </div>
                              <div>
                                <div className="text-white">{user.name}</div>
                                <div className="text-neutral-400 text-sm">{user.email}</div>
                              </div>
                            </div>
                          </TableCell>
                          <TableCell>
                            <Switch 
                              checked={user.active} 
                              onCheckedChange={(checked) => handleToggleStatus(user.id, checked)}
                              disabled={toggleStatusMutation.isPending}
                            />
                          </TableCell>
                          <TableCell>
                            <Badge 
                              variant="outline" 
                              className={user.role === 'admin' ? 'border-primary text-primary' : 'border-neutral-500 text-neutral-400'}
                            >
                              {user.role}
                            </Badge>
                          </TableCell>
                          <TableCell>{formatDate(user.createdAt)}</TableCell>
                          <TableCell>{user.lastLoginAt ? formatDate(user.lastLoginAt) : '-'}</TableCell>
                          <TableCell className="text-right">
                            <DropdownMenu>
                              <DropdownMenuTrigger asChild>
                                <Button variant="ghost" className="h-8 w-8 p-0">
                                  <MoreHorizontal className="h-4 w-4" />
                                </Button>
                              </DropdownMenuTrigger>
                              <DropdownMenuContent align="end" className="bg-neutral-800 border-neutral-700 text-white">
                                <DropdownMenuLabel>{t('admin.actions')}</DropdownMenuLabel>
                                <DropdownMenuSeparator className="bg-neutral-700" />
                                <DropdownMenuItem 
                                  onClick={() => handleEditUser(user)}
                                  className="cursor-pointer hover:bg-neutral-700"
                                >
                                  <Edit className="mr-2 h-4 w-4" />
                                  {t('admin.edit')}
                                </DropdownMenuItem>
                                <DropdownMenuItem 
                                  onClick={() => handleDeleteUser(user)}
                                  className="cursor-pointer text-red-500 hover:bg-neutral-700 focus:text-red-500"
                                >
                                  <Trash2 className="mr-2 h-4 w-4" />
                                  {t('admin.delete')}
                                </DropdownMenuItem>
                              </DropdownMenuContent>
                            </DropdownMenu>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              ) : (
                <div className="text-center py-12">
                  <UserCog className="h-12 w-12 text-neutral-600 mx-auto mb-4" />
                  <h3 className="text-lg font-medium text-neutral-300 mb-1">
                    {searchQuery ? t('admin.noSearchResults') : t('admin.noUsers')}
                  </h3>
                  <p className="text-neutral-400 mb-4">
                    {searchQuery ? t('admin.tryDifferentSearch') : t('admin.createFirstUser')}
                  </p>
                  {!searchQuery && (
                    <Button 
                      onClick={handleCreateUser} 
                      className="bg-primary hover:bg-primary-dark"
                    >
                      <UserPlus className="mr-2 h-4 w-4" />
                      {t('admin.newUser')}
                    </Button>
                  )}
                </div>
              )}
            </CardContent>
          </Card>
        </main>
      </div>
      
      {/* Create/Edit User Dialog */}
      <Dialog open={userDialogOpen} onOpenChange={setUserDialogOpen}>
        <DialogContent className="bg-neutral-900 border-neutral-800 text-white">
          <DialogHeader>
            <DialogTitle>
              {selectedUser ? t('admin.editUser') : t('admin.createUser')}
            </DialogTitle>
            <DialogDescription className="text-neutral-400">
              {selectedUser ? t('admin.editUserDesc') : t('admin.createUserDesc')}
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={handleSubmit}>
            <div className="space-y-4 py-2">
              <div className="space-y-2">
                <Label htmlFor="name" className="text-white">{t('admin.name')}</Label>
                <Input
                  id="name"
                  value={formValues.name}
                  onChange={(e) => setFormValues(prev => ({ ...prev, name: e.target.value }))}
                  className="bg-neutral-800 border-neutral-700 text-white"
                  required
                />
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="email" className="text-white">{t('admin.email')}</Label>
                <Input
                  id="email"
                  type="email"
                  value={formValues.email}
                  onChange={(e) => setFormValues(prev => ({ ...prev, email: e.target.value }))}
                  className="bg-neutral-800 border-neutral-700 text-white"
                  required
                />
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="password" className="text-white">
                  {selectedUser ? t('admin.newPassword') : t('admin.password')}
                </Label>
                <Input
                  id="password"
                  type="password"
                  value={formValues.password}
                  onChange={(e) => setFormValues(prev => ({ ...prev, password: e.target.value }))}
                  className="bg-neutral-800 border-neutral-700 text-white"
                  required={!selectedUser}
                  placeholder={selectedUser ? t('admin.leaveBlankToKeep') : ''}
                />
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="role" className="text-white">{t('admin.role')}</Label>
                <select
                  id="role"
                  value={formValues.role}
                  onChange={(e) => setFormValues(prev => ({ ...prev, role: e.target.value }))}
                  className="w-full p-2 rounded-md bg-neutral-800 border border-neutral-700 text-white"
                >
                  <option value="user">{t('admin.roleUser')}</option>
                  <option value="admin">{t('admin.roleAdmin')}</option>
                </select>
              </div>
              
              <div className="flex items-center space-x-2">
                <Switch
                  id="active"
                  checked={formValues.active}
                  onCheckedChange={(checked) => setFormValues(prev => ({ ...prev, active: checked }))}
                />
                <Label htmlFor="active" className="text-white">{t('admin.active')}</Label>
              </div>
            </div>
            <DialogFooter className="pt-4">
              <Button
                type="button"
                variant="outline"
                onClick={() => setUserDialogOpen(false)}
                className="border-neutral-700 text-white hover:bg-neutral-800"
              >
                {t('common.cancel')}
              </Button>
              <Button
                type="submit"
                className="bg-primary hover:bg-primary-dark"
                disabled={userMutation.isPending}
              >
                {userMutation.isPending ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : selectedUser ? (
                  <Check className="h-4 w-4 mr-2" />
                ) : (
                  <UserPlus className="h-4 w-4 mr-2" />
                )}
                {selectedUser ? t('admin.saveChanges') : t('admin.createUser')}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
      
      {/* Delete Confirmation Dialog */}
      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent className="bg-neutral-900 border-neutral-800 text-white">
          <AlertDialogHeader>
            <AlertDialogTitle>{t('admin.confirmDelete')}</AlertDialogTitle>
            <AlertDialogDescription className="text-neutral-400">
              {t('admin.deleteUserConfirm', { name: selectedUser?.name })}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel className="bg-transparent border-neutral-700 text-white hover:bg-neutral-800">
              {t('common.cancel')}
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={() => selectedUser && deleteMutation.mutate(selectedUser.id)}
              className="bg-red-600 text-white hover:bg-red-700"
            >
              {deleteMutation.isPending ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Trash2 className="h-4 w-4 mr-2" />
              )}
              {t('admin.deleteUser')}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
