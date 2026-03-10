import { Loader2 } from "lucide-react";

export function LoadingSpinner({ className = "" }: { className?: string }) {
  return (
    <div className={`flex flex-col items-center justify-center p-8 space-y-4 ${className}`}>
      <div className="relative">
        <Loader2 className="w-10 h-10 animate-spin text-primary opacity-50" />
        <Loader2 className="w-10 h-10 animate-spin text-primary absolute top-0 left-0" style={{ animationDirection: 'reverse', animationDuration: '2s' }} />
      </div>
      <p className="text-sm font-serif text-primary tracking-widest uppercase">Curating Collection</p>
    </div>
  );
}
