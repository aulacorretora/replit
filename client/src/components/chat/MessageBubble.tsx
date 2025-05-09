import { useState } from 'react';
import { cn } from '@/lib/utils';
import { format } from 'date-fns';
import { CheckCheck, Check, Image, File, Music, Video } from 'lucide-react';
import { Card } from '@/components/ui/card';

interface MessageBubbleProps {
  message: string;
  fromMe: boolean;
  timestamp: string;
  status?: string;
  type?: string;
  mediaUrl?: string;
  mediaType?: string;
  className?: string;
}

export default function MessageBubble({
  message,
  fromMe,
  timestamp,
  status = 'sent',
  type = 'text',
  mediaUrl,
  mediaType,
  className
}: MessageBubbleProps) {
  const [mediaLoaded, setMediaLoaded] = useState(false);
  const [mediaError, setMediaError] = useState(false);

  // Format timestamp
  const formatTime = (timestamp: string) => {
    return format(new Date(timestamp), 'HH:mm');
  };

  // Status Icon
  const StatusIcon = () => {
    if (status === 'delivered') {
      return <Check className="h-4 w-4 text-neutral-500" />;
    } else if (status === 'read') {
      return <CheckCheck className="h-4 w-4 text-blue-500" />;
    } else {
      return <Check className="h-4 w-4 text-neutral-500" />;
    }
  };

  // Media component based on type
  const MediaComponent = () => {
    if (!mediaUrl) return null;

    if (mediaType === 'image' || type === 'image') {
      return (
        <div className="mb-2 rounded-lg overflow-hidden bg-neutral-200 relative">
          {!mediaLoaded && !mediaError && (
            <div className="absolute inset-0 flex items-center justify-center">
              <div className="animate-spin rounded-full h-6 w-6 border-t-2 border-b-2 border-primary"></div>
            </div>
          )}
          <Image 
            className={cn(
              "w-full h-auto max-h-60 object-cover", 
              mediaLoaded ? "opacity-100" : "opacity-0",
              mediaError ? "hidden" : "block"
            )} 
            height={24}
            width={24}
          />
          {mediaError && (
            <div className="h-32 flex flex-col items-center justify-center text-neutral-500">
              <Image className="h-8 w-8 mb-2" />
              <span className="text-xs">Não foi possível carregar a imagem</span>
            </div>
          )}
        </div>
      );
    } else if (mediaType === 'video' || type === 'video') {
      return (
        <div className="mb-2 rounded-lg overflow-hidden bg-neutral-200">
          <div className="h-40 flex flex-col items-center justify-center text-neutral-500">
            <Video className="h-8 w-8 mb-2" />
            <span className="text-xs">Vídeo</span>
          </div>
        </div>
      );
    } else if (mediaType === 'audio' || type === 'audio') {
      return (
        <div className="mb-2 rounded-lg overflow-hidden bg-neutral-200 p-4 flex items-center">
          <Music className="h-6 w-6 text-neutral-500 mr-2" />
          <div>
            <span className="text-xs font-medium text-neutral-700">Áudio</span>
            <div className="h-2 w-32 bg-neutral-300 rounded-full mt-1"></div>
          </div>
        </div>
      );
    } else if (mediaType === 'document' || type === 'document') {
      return (
        <div className="mb-2 rounded-lg overflow-hidden bg-neutral-200 p-4 flex items-center">
          <File className="h-6 w-6 text-neutral-500 mr-2" />
          <div>
            <span className="text-xs font-medium text-neutral-700">Documento</span>
            <span className="text-xs text-neutral-500 block">PDF</span>
          </div>
        </div>
      );
    }

    return null;
  };

  return (
    <div className={cn(
      "flex items-end space-x-2",
      fromMe ? "justify-end" : "",
      className
    )}>
      <div className={cn(
        "max-w-xs md:max-w-md rounded-lg p-3 shadow",
        fromMe ? "bg-primary-light" : "bg-white"
      )}>
        {MediaComponent()}
        
        {message && (
          <p className="text-sm text-neutral-700 whitespace-pre-wrap break-words">
            {message}
          </p>
        )}
        
        <div className={cn(
          "flex items-center justify-end mt-1 space-x-1 text-xs text-neutral-500",
          fromMe ? "justify-end" : "justify-start"
        )}>
          <span>{formatTime(timestamp)}</span>
          
          {fromMe && (
            <StatusIcon />
          )}
        </div>
      </div>
    </div>
  );
}
