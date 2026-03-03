import React from 'react';
import { Mic, MicOff } from 'lucide-react';
import { useVoiceToText } from '@/hooks/useVoiceToText';
import { Textarea } from '@/components/ui/textarea';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

interface VoiceInputProps {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  rows?: number;
  className?: string;
  label?: string;
}

export default function VoiceInput({ value, onChange, placeholder, rows = 4, className, label }: VoiceInputProps) {
  const { isListening, toggleListening, isSupported } = useVoiceToText((text) => {
    onChange(value + text);
  });

  return (
    <div className="relative">
      {label && <label className="text-sm font-medium text-foreground mb-1.5 block">{label}</label>}
      <div className="relative">
        <Textarea
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder={placeholder}
          rows={rows}
          className={cn('pr-12', className)}
        />
        {isSupported && (
          <Button
            type="button"
            size="icon"
            variant={isListening ? 'destructive' : 'outline'}
            className={cn(
              'absolute right-2 top-2 h-8 w-8',
              isListening && 'animate-pulse'
            )}
            onClick={toggleListening}
            title={isListening ? 'Stop recording' : 'Start voice input'}
          >
            {isListening ? <MicOff className="h-4 w-4" /> : <Mic className="h-4 w-4" />}
          </Button>
        )}
      </div>
      {isListening && (
        <div className="flex items-center gap-2 mt-1.5">
          <span className="w-2 h-2 rounded-full bg-destructive animate-pulse" />
          <span className="text-xs text-destructive font-medium">Recording...</span>
        </div>
      )}
    </div>
  );
}
