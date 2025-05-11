import { useState, useEffect } from 'react';
import { useLanguage } from '@/hooks/use-language';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { formatDistanceToNow } from 'date-fns';
import { ptBR, enUS } from 'date-fns/locale';
import { Instance } from '@shared/schema';

interface DeviceInfo {
  phone?: {
    device_model?: string;
    os_version?: string;
    battery?: string;
    [key: string]: any;
  };
  [key: string]: any;
}

interface InstanceStatusModalProps {
  open: boolean;
  onClose: () => void;
  instance: Instance | null;
  onDisconnect: () => void;
  onReconnect: () => void;
  onReset?: () => void;
  isLoading: boolean;
  isResetting?: boolean;
}

export default function InstanceStatusModal({ 
  open, 
  onClose, 
  instance, 
  onDisconnect, 
  onReconnect,
  onReset,
  isLoading,
  isResetting = false
}: InstanceStatusModalProps) {
  const { t, language } = useLanguage();
  
  // Format time string
  const formatTime = (timestamp?: string | Date | null) => {
    if (!timestamp) return '';
    
    const date = typeof timestamp === 'string' ? new Date(timestamp) : timestamp;
    const dateLocale = language === 'pt-BR' ? ptBR : enUS;
    
    return formatDistanceToNow(date, { 
      addSuffix: true,
      locale: dateLocale
    });
  };

  if (!instance) return null;

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="text-xl font-semibold text-neutral-700">
            {t('instance.statusTitle')}
          </DialogTitle>
        </DialogHeader>
        
        <div className="p-2">
          <div className="mb-6">
            <div className="flex items-center mb-2">
              <div className={cn(
                "w-3 h-3 rounded-full mr-2",
                instance.status === 'connected' ? "bg-green-500" : "bg-neutral-300"
              )}></div>
              <h3 className="font-medium text-neutral-700">{instance.name}</h3>
            </div>
            <div className="pl-5">
              <p className="text-sm text-neutral-600 mb-1">
                {instance.connected 
                  ? t('instance.connectedSince').replace('{time}', formatTime(instance.lastConnectedAt))
                  : t('instance.disconnected')
                }
              </p>
              <p className="text-sm text-neutral-600">
                {instance.phoneNumber || t('instance.noPhoneNumber')}
              </p>
            </div>
          </div>
          
          <div className="space-y-4">
            {(() => {
              if (!instance.deviceInfo) return null;
              
              return (
                <div className="p-4 bg-neutral-50 rounded-lg">
                  <h4 className="text-sm font-medium text-neutral-700 mb-2">{t('instance.deviceInfo')}</h4>
                  <div className="grid grid-cols-2 gap-2 text-sm">
                    <div className="text-neutral-500">{t('instance.deviceModel')}:</div>
                    <div className="text-neutral-700">
                      {(() => {
                        try {
                          const deviceInfo = instance.deviceInfo as any;
                          return deviceInfo && 
                            deviceInfo.phone && 
                            deviceInfo.phone.device_model ? 
                            String(deviceInfo.phone.device_model) : '-';
                        } catch (e) {
                          return '-';
                        }
                      })()}
                    </div>
                    <div className="text-neutral-500">{t('instance.os')}:</div>
                    <div className="text-neutral-700">
                      {(() => {
                        try {
                          const deviceInfo = instance.deviceInfo as any;
                          return deviceInfo && 
                            deviceInfo.phone && 
                            deviceInfo.phone.os_version ? 
                            String(deviceInfo.phone.os_version) : '-';
                        } catch (e) {
                          return '-';
                        }
                      })()}
                    </div>
                    <div className="text-neutral-500">{t('instance.battery')}:</div>
                    <div className="text-neutral-700">
                      {(() => {
                        try {
                          const deviceInfo = instance.deviceInfo as any;
                          return deviceInfo && 
                            deviceInfo.phone && 
                            deviceInfo.phone.battery ? 
                            String(deviceInfo.phone.battery) : '-';
                        } catch (e) {
                          return '-';
                        }
                      })()}
                    </div>
                  </div>
                </div>
              );
            })()}
            
            <div className="p-4 bg-neutral-50 rounded-lg">
              <h4 className="text-sm font-medium text-neutral-700 mb-2">{t('instance.statistics')}</h4>
              <div className="grid grid-cols-2 gap-2 text-sm">
                <div className="text-neutral-500">{t('instance.createdAt')}:</div>
                <div className="text-neutral-700">{formatTime(instance.createdAt)}</div>
                <div className="text-neutral-500">{t('instance.status')}:</div>
                <div className="flex items-center">
                  {instance.status === 'connected' ? (
                    <span className="inline-flex items-center text-green-600">
                      <div className="w-2 h-2 bg-green-500 rounded-full mr-2"></div>
                      {t('instance.connected')}
                    </span>
                  ) : instance.status === 'connecting' ? (
                    <span className="inline-flex items-center text-blue-600">
                      <div className="w-2 h-2 bg-blue-500 rounded-full animate-pulse mr-2"></div>
                      {t('instance.connecting')}
                    </span>
                  ) : instance.status === 'qr_ready' ? (
                    <span className="inline-flex items-center text-purple-600">
                      <div className="w-2 h-2 bg-purple-500 rounded-full mr-2"></div>
                      {t('instance.qrReady')}
                    </span>
                  ) : instance.status === 'error' ? (
                    <span className="inline-flex items-center text-red-600">
                      <div className="w-2 h-2 bg-red-500 rounded-full mr-2"></div>
                      {t('instance.error')}
                    </span>
                  ) : (
                    <span className="inline-flex items-center text-amber-600">
                      <div className="w-2 h-2 bg-amber-500 rounded-full mr-2"></div>
                      {t('instance.disconnected')}
                    </span>
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>
        
        <DialogFooter className="bg-neutral-50 rounded-b-lg border-t border-neutral-200">
          <div className="flex justify-end space-x-2 w-full">
            <Button 
              variant="outline" 
              className="border-red-500 text-red-500 hover:bg-red-50"
              onClick={onDisconnect}
              disabled={!instance.connected || isLoading || isResetting}
            >
              {t('instance.disconnect')}
            </Button>
            
            {onReset && (
              <Button 
                variant="outline"
                onClick={onReset}
                className="border-amber-500 text-amber-600 hover:bg-amber-50"
                disabled={isLoading || isResetting}
              >
                {isResetting ? (
                  <div className="flex items-center">
                    <div className="animate-spin rounded-full h-4 w-4 border-t-2 border-b-2 border-amber-600 mr-2"></div>
                    {t('instance.resetting')}
                  </div>
                ) : (
                  <>
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 mr-1" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M3 2v6h6"></path>
                      <path d="M3 13a9 9 0 1 0 3-7.7L3 8"></path>
                    </svg>
                    {t('instance.forceReset')}
                  </>
                )}
              </Button>
            )}
            
            <Button 
              variant="outline"
              onClick={onReconnect}
              disabled={isLoading || isResetting}
            >
              {t('instance.reconnect')}
            </Button>
            <Button 
              onClick={onClose}
              className="bg-primary text-white hover:bg-primary-dark"
            >
              {t('instance.close')}
            </Button>
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
