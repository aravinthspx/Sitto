import { AlertCircle } from 'lucide-react';
import { Button } from './Button';

export function ErrorState({ title = 'An error occurred', message, onRetry }) {
  return (
    <div className="flex flex-col items-center justify-center p-8 text-center border rounded-lg bg-red-50/50">
      <AlertCircle className="h-10 w-10 text-red-500 mb-4" />
      <h3 className="text-lg font-semibold text-red-800">{title}</h3>
      {message && <p className="text-sm text-red-600 mt-2 max-w-md">{message}</p>}
      {onRetry && (
        <Button variant="outline" className="mt-6 border-red-200 text-red-700 hover:bg-red-100" onClick={onRetry}>
          Retry
        </Button>
      )}
    </div>
  );
}
