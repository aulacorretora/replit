import { useState, useEffect } from 'react';
import { useLanguage } from '@/hooks/use-language';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { AlertCircle, HelpCircle } from 'lucide-react';
import { QRCodeSVG } from 'qrcode.react';

interface QRCodeModalProps {
  open: boolean;
  onClose: () => void;
  qrCode: string | null;
  onRefresh: () => void;
  onReset?: () => void;
  isLoading: boolean;
  isResetting?: boolean;
}

export default function QRCodeModal({ 
  open, 
  onClose, 
  qrCode, 
  onRefresh, 
  onReset, 
  isLoading, 
  isResetting = false 
}: QRCodeModalProps) {
  const { t } = useLanguage();
  const [qrExpiration, setQrExpiration] = useState<number>(60); // 60 seconds
  const [qrExpired, setQrExpired] = useState<boolean>(false);

  // Auto-refresh QR code on modal open
  useEffect(() => {
    // Somente se o modal estiver aberto e não estivermos carregando ou resetando
    if (open && !isLoading && !isResetting) {
      console.log('Modal QR code está aberto - verificando necessidade de refresh');
      
      // Cria um timer quando o modal abre
      const timer = setTimeout(() => {
        // Verifica novamente se ainda não temos o QR code e se ainda não estamos carregando
        if (!qrCode && !isLoading && !isResetting) {
          console.log('Solicitando novo QR code via reset');
          if (onReset) {
            onReset();
          } else {
            console.log('Solicitando QR code via refresh padrão');
            onRefresh();
          }
        }
      }, 1500); // Pequeno delay para dar tempo de renderizar
      
      return () => clearTimeout(timer);
    }
  }, [open, qrCode, isLoading, isResetting, onRefresh, onReset]);

  // QR Code expiration timer
  useEffect(() => {
    if (!open || !qrCode) return;
    
    setQrExpired(false);
    setQrExpiration(60);
    
    const timer = setInterval(() => {
      setQrExpiration(prev => {
        if (prev <= 1) {
          clearInterval(timer);
          setQrExpired(true);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
    
    return () => {
      clearInterval(timer);
    };
  }, [open, qrCode]);

  // Format time remaining
  const formatTimeRemaining = (seconds: number): string => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs < 10 ? '0' : ''}${secs}`;
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-md max-w-[95vw] p-0 bg-zinc-900 text-white border-zinc-800 overflow-hidden">
        <DialogHeader className="p-4 pb-2">
          <DialogTitle className="text-xl font-semibold text-white">
            {t('qrcode.title')}
          </DialogTitle>
        </DialogHeader>
        
        <div className="flex flex-col items-center text-center px-6 pt-0 pb-4">
          <div className="w-full mb-4">
            <p className="text-zinc-300 mb-1">{t('qrcode.scanInstructions')}</p>
            <p className="text-sm text-zinc-400">{t('qrcode.scanInstructionsDetail')}</p>
          </div>
          
          {/* QR Code container - garantindo tamanho fixo e centralizado */}
          <div className="w-full max-w-[264px] h-[264px] mx-auto bg-white rounded-lg shadow-md border border-zinc-700 mb-4 flex items-center justify-center">
            {isLoading ? (
              <div className="flex flex-col items-center justify-center">
                <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-primary mb-4"></div>
                <p className="text-sm text-zinc-600 text-center">
                  {t('qrcode.generating')}
                </p>
              </div>
            ) : isResetting ? (
              <div className="flex flex-col items-center justify-center">
                <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-amber-500 mb-4"></div>
                <p className="text-sm text-zinc-600 text-center">
                  {t('qrcode.resetting')}
                </p>
                <p className="text-xs text-zinc-500 text-center mt-2">
                  {t('qrcode.resetDescription')}
                </p>
              </div>
            ) : qrExpired ? (
              <div className="flex flex-col items-center justify-center">
                <AlertCircle className="h-16 w-16 text-zinc-300 mb-2" />
                <p className="text-sm text-zinc-600 text-center">
                  {t('qrcode.expired')}
                </p>
                <Button 
                  variant="outline" 
                  onClick={onRefresh} 
                  className="mt-4"
                  size="sm"
                >
                  {t('qrcode.refresh')}
                </Button>
              </div>
            ) : qrCode ? (
              <div className="flex items-center justify-center">
                {qrCode.startsWith('data:image') ? (
                  <img 
                    src={qrCode} 
                    alt="QR Code" 
                    className="max-w-[244px] max-h-[244px]"
                    onError={(e) => {
                      console.error('Erro ao carregar QR Code:', e);
                      e.currentTarget.src = 'https://placehold.co/400x400/png?text=QR+Code+Indisponível';
                    }} 
                  />
                ) : (
                  <QRCodeSVG 
                    value={qrCode} 
                    size={224}
                    level="H"
                    includeMargin={true}
                  />
                )}
              </div>
            ) : (
              <div className="flex flex-col items-center justify-center">
                <HelpCircle className="h-16 w-16 text-zinc-300 mb-2" />
                <p className="text-sm text-zinc-600 text-center">
                  {t('qrcode.unavailable')}
                </p>
                <Button 
                  variant="outline" 
                  onClick={onRefresh} 
                  className="mt-4"
                  size="sm"
                >
                  {t('qrcode.generate')}
                </Button>
              </div>
            )}
          </div>
          
          {qrCode && !qrExpired && (
            <div className="flex items-center justify-center text-sm text-zinc-300 mb-2 flex-wrap">
              <div className="flex-shrink-0 w-3 h-3 bg-green-500 rounded-full mr-2"></div>
              <span>{t('qrcode.waitingForScan')}</span>
              <span className="ml-2 text-xs text-zinc-400 flex-shrink-0">
                ({t('qrcode.expiresIn')} {formatTimeRemaining(qrExpiration)})
              </span>
            </div>
          )}
        </div>
        
        {/* Footer com botões - agora dentro dos limites do card preto */}
        <div className="bg-zinc-800 w-full border-t border-zinc-700 p-4 flex flex-wrap justify-between items-center gap-2">
          <Button variant="link" className="text-sm text-zinc-400 hover:text-zinc-200 mr-auto">
            <HelpCircle className="h-4 w-4 mr-1" />
            {t('qrcode.needHelp')}
          </Button>
          
          <div className="flex flex-wrap gap-2">
            <Button 
              variant="outline"
              onClick={onClose}
              className="text-sm border-zinc-700 bg-zinc-800 text-zinc-300 hover:bg-zinc-700"
            >
              {t('qrcode.cancel')}
            </Button>
            
            {onReset && (
              <Button 
                variant="outline"
                onClick={onReset}
                className="text-sm border-amber-700 text-amber-500 hover:bg-amber-900/30"
                disabled={isLoading || isResetting}
              >
                {isResetting ? (
                  <div className="flex items-center">
                    <div className="animate-spin rounded-full h-4 w-4 border-t-2 border-b-2 border-amber-600 mr-2"></div>
                    {t('qrcode.resetting')}
                  </div>
                ) : (
                  <>
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 mr-1" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M3 2v6h6"></path>
                      <path d="M3 13a9 9 0 1 0 3-7.7L3 8"></path>
                    </svg>
                    {t('qrcode.forceReset')}
                  </>
                )}
              </Button>
            )}
            
            <Button 
              onClick={onRefresh}
              className="text-sm bg-primary text-white hover:bg-primary-dark"
              disabled={isLoading || isResetting}
            >
              {isLoading ? t('qrcode.generating') : t('qrcode.newQrCode')}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
