import { Info } from 'lucide-react';
import { Button } from './Button';

export function EmptyState({ title = 'No data found', message, icon: Icon = Info, actionLabel, onAction }) {
  return (
    <div className="flex flex-col items-center justify-center p-12 text-center border rounded-lg bg-gray-50 border-dashed">
      <Icon className="h-12 w-12 text-gray-400 mb-4" />
      <h3 className="text-lg font-medium text-gray-900">{title}</h3>
      {message && <p className="text-sm text-gray-500 mt-2 max-w-sm">{message}</p>}
      {actionLabel && onAction && (
        <Button className="mt-6" onClick={onAction}>
          {actionLabel}
        </Button>
      )}
    </div>
  );
}
