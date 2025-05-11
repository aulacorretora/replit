import { useState, useEffect } from 'react';
import { useLanguage } from '@/hooks/use-language';
import Sidebar from '@/components/layout/Sidebar';
import Header from '@/components/layout/Header';
import { useMobile } from '@/hooks/use-mobile';
import { useTheme } from 'next-themes';
import { Loader2, Save, MoonStar, Sun, Monitor, Globe, BellRing, BellOff } from 'lucide-react';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Button } from '@/components/ui/button';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useToast } from '@/hooks/use-toast';

export default function Settings() {
  const { t, language, changeLanguage, languages } = useLanguage();
  const { theme, setTheme } = useTheme();
  const { toast } = useToast();
  const isMobile = useMobile();
  const [sidebarOpen, setSidebarOpen] = useState(!isMobile);
  const [isCollapsed, setIsCollapsed] = useState(false);
  
  const toggleSidebar = () => {
    setIsCollapsed(!isCollapsed);
  };
  
  // State for notification settings
  const [notifications, setNotifications] = useState({
    newMessages: true,
    connectionEvents: true,
    systemNotifications: true,
    sounds: true,
  });
  
  // State for loading
  const [isSaving, setIsSaving] = useState(false);
  
  // Load settings from localStorage on mount
  useEffect(() => {
    const savedNotifications = localStorage.getItem('zapban_notifications');
    if (savedNotifications) {
      setNotifications(JSON.parse(savedNotifications));
    }
  }, []);
  
  // Save notification settings
  const saveNotificationSettings = () => {
    setIsSaving(true);
    
    // Simulating API call with a timeout
    setTimeout(() => {
      localStorage.setItem('zapban_notifications', JSON.stringify(notifications));
      
      toast({
        title: t('settings.saved'),
        description: t('settings.settingsSaved'),
      });
      
      setIsSaving(false);
    }, 1000);
  };
  
  // Save appearance settings
  const saveAppearanceSettings = () => {
    setIsSaving(true);
    
    // Simulating API call with a timeout
    setTimeout(() => {
      toast({
        title: t('settings.saved'),
        description: t('settings.settingsSaved'),
      });
      
      setIsSaving(false);
    }, 1000);
  };
  
  return (
    <div className="flex h-screen overflow-hidden bg-neutral-100">
      <Sidebar 
        isMobileOpen={sidebarOpen} 
        closeMobileMenu={() => setSidebarOpen(false)} 
        isCollapsed={isCollapsed}
        toggleSidebar={toggleSidebar}
      />
      
      <div className="flex-1 flex flex-col overflow-hidden">
        <Header 
          title={t('settings.title')} 
          openMobileMenu={() => setSidebarOpen(true)} 
          toggleSidebar={toggleSidebar}
          isSidebarCollapsed={isCollapsed}
        />
        
        <main className="flex-1 overflow-auto p-4 md:p-6">
          <div className="mb-6">
            <h1 className="text-2xl font-bold text-neutral-800">{t('settings.title')}</h1>
            <p className="text-neutral-500">{t('settings.subtitle')}</p>
          </div>
          
          <div className="max-w-3xl mx-auto">
            <Tabs defaultValue="appearance" className="w-full">
              <TabsList className="grid w-full grid-cols-2 mb-6">
                <TabsTrigger value="appearance">{t('settings.appearance')}</TabsTrigger>
                <TabsTrigger value="notifications">{t('settings.notifications')}</TabsTrigger>
              </TabsList>
              
              <TabsContent value="appearance">
                <Card>
                  <CardHeader>
                    <CardTitle>{t('settings.appearance')}</CardTitle>
                    <CardDescription>{t('settings.appearanceDesc')}</CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-6">
                    <div className="space-y-4">
                      <div>
                        <h3 className="text-sm font-medium mb-3">{t('settings.theme')}</h3>
                        <RadioGroup
                          value={theme}
                          onValueChange={setTheme}
                          className="flex flex-wrap gap-4"
                        >
                          <div>
                            <RadioGroupItem
                              value="light"
                              id="theme-light"
                              className="peer sr-only"
                            />
                            <Label
                              htmlFor="theme-light"
                              className="flex flex-col items-center justify-between rounded-md border-2 border-muted bg-white p-4 hover:bg-gray-50 hover:border-gray-300 peer-data-[state=checked]:border-primary [&:has([data-state=checked])]:border-primary"
                            >
                              <Sun className="mb-2 h-6 w-6 text-neutral-600" />
                              <span className="text-sm font-medium">{t('settings.light')}</span>
                            </Label>
                          </div>
                          
                          <div>
                            <RadioGroupItem
                              value="dark"
                              id="theme-dark"
                              className="peer sr-only"
                            />
                            <Label
                              htmlFor="theme-dark"
                              className="flex flex-col items-center justify-between rounded-md border-2 border-muted bg-white p-4 hover:bg-gray-50 hover:border-gray-300 peer-data-[state=checked]:border-primary [&:has([data-state=checked])]:border-primary"
                            >
                              <MoonStar className="mb-2 h-6 w-6 text-neutral-600" />
                              <span className="text-sm font-medium">{t('settings.dark')}</span>
                            </Label>
                          </div>
                          
                          <div>
                            <RadioGroupItem
                              value="system"
                              id="theme-system"
                              className="peer sr-only"
                            />
                            <Label
                              htmlFor="theme-system"
                              className="flex flex-col items-center justify-between rounded-md border-2 border-muted bg-white p-4 hover:bg-gray-50 hover:border-gray-300 peer-data-[state=checked]:border-primary [&:has([data-state=checked])]:border-primary"
                            >
                              <Monitor className="mb-2 h-6 w-6 text-neutral-600" />
                              <span className="text-sm font-medium">{t('settings.system')}</span>
                            </Label>
                          </div>
                        </RadioGroup>
                      </div>
                      
                      <div className="space-y-2">
                        <Label htmlFor="language">{t('settings.language')}</Label>
                        <div className="flex items-center space-x-2">
                          <Globe className="h-4 w-4 text-neutral-400" />
                          <Select
                            value={language}
                            onValueChange={changeLanguage}
                          >
                            <SelectTrigger id="language" className="w-full max-w-xs">
                              <SelectValue placeholder={t('settings.selectLanguage')} />
                            </SelectTrigger>
                            <SelectContent>
                              {Object.entries(languages).map(([code, name]) => (
                                <SelectItem key={code} value={code}>
                                  {name}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </div>
                      </div>
                    </div>
                  </CardContent>
                  <CardFooter className="flex justify-end">
                    <Button 
                      onClick={saveAppearanceSettings}
                      className="bg-primary hover:bg-primary-dark"
                      disabled={isSaving}
                    >
                      {isSaving ? (
                        <>
                          <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                          {t('settings.saving')}
                        </>
                      ) : (
                        <>
                          <Save className="mr-2 h-4 w-4" />
                          {t('settings.saveChanges')}
                        </>
                      )}
                    </Button>
                  </CardFooter>
                </Card>
              </TabsContent>
              
              <TabsContent value="notifications">
                <Card>
                  <CardHeader>
                    <CardTitle>{t('settings.notifications')}</CardTitle>
                    <CardDescription>{t('settings.notificationsDesc')}</CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-6">
                    <div className="space-y-4">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center space-x-2">
                          <BellRing className="h-4 w-4 text-neutral-500" />
                          <Label htmlFor="new-messages" className="font-medium">
                            {t('settings.newMessages')}
                          </Label>
                        </div>
                        <Switch
                          id="new-messages"
                          checked={notifications.newMessages}
                          onCheckedChange={(checked) => 
                            setNotifications(prev => ({ ...prev, newMessages: checked }))
                          }
                        />
                      </div>
                      
                      <div className="flex items-center justify-between">
                        <div className="flex items-center space-x-2">
                          <BellRing className="h-4 w-4 text-neutral-500" />
                          <Label htmlFor="connection-events" className="font-medium">
                            {t('settings.connectionEvents')}
                          </Label>
                        </div>
                        <Switch
                          id="connection-events"
                          checked={notifications.connectionEvents}
                          onCheckedChange={(checked) => 
                            setNotifications(prev => ({ ...prev, connectionEvents: checked }))
                          }
                        />
                      </div>
                      
                      <div className="flex items-center justify-between">
                        <div className="flex items-center space-x-2">
                          <BellRing className="h-4 w-4 text-neutral-500" />
                          <Label htmlFor="system-notifications" className="font-medium">
                            {t('settings.systemNotifications')}
                          </Label>
                        </div>
                        <Switch
                          id="system-notifications"
                          checked={notifications.systemNotifications}
                          onCheckedChange={(checked) => 
                            setNotifications(prev => ({ ...prev, systemNotifications: checked }))
                          }
                        />
                      </div>
                      
                      <div className="flex items-center justify-between">
                        <div className="flex items-center space-x-2">
                          <BellRing className="h-4 w-4 text-neutral-500" />
                          <Label htmlFor="sounds" className="font-medium">
                            {t('settings.sounds')}
                          </Label>
                        </div>
                        <Switch
                          id="sounds"
                          checked={notifications.sounds}
                          onCheckedChange={(checked) => 
                            setNotifications(prev => ({ ...prev, sounds: checked }))
                          }
                        />
                      </div>
                      
                      <div className="pt-4 border-t">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center space-x-2">
                            <BellOff className="h-4 w-4 text-neutral-500" />
                            <Label htmlFor="do-not-disturb" className="font-medium">
                              {t('settings.doNotDisturb')}
                            </Label>
                          </div>
                          <Switch
                            id="do-not-disturb"
                            checked={!notifications.newMessages && !notifications.sounds}
                            onCheckedChange={(checked) => 
                              setNotifications(prev => ({ 
                                ...prev, 
                                newMessages: !checked,
                                sounds: !checked
                              }))
                            }
                          />
                        </div>
                        <p className="text-xs text-neutral-500 mt-1 ml-6">
                          {t('settings.doNotDisturbDesc')}
                        </p>
                      </div>
                    </div>
                  </CardContent>
                  <CardFooter className="flex justify-end">
                    <Button 
                      onClick={saveNotificationSettings}
                      className="bg-primary hover:bg-primary-dark"
                      disabled={isSaving}
                    >
                      {isSaving ? (
                        <>
                          <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                          {t('settings.saving')}
                        </>
                      ) : (
                        <>
                          <Save className="mr-2 h-4 w-4" />
                          {t('settings.saveChanges')}
                        </>
                      )}
                    </Button>
                  </CardFooter>
                </Card>
              </TabsContent>
            </Tabs>
          </div>
        </main>
      </div>
    </div>
  );
}
