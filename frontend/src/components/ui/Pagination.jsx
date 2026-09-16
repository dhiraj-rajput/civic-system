import Button from './Button';
import { ChevronLeft, ChevronRight } from 'lucide-react';

export default function Pagination({ total, perPage, currentPage, onChange }) {
  const totalPages = Math.ceil(total / perPage) || 1;
  const start = (currentPage - 1) * perPage + 1;
  const end = Math.min(currentPage * perPage, total);

  if (total === 0) return null;

  return (
    <div className="flex items-center justify-between py-3 px-4 bg-[var(--surface-card)] border-t border-[var(--border-default)]">
      <div className="text-sm text-[var(--text-secondary)]">
        Showing <span className="font-medium text-[var(--text-primary)]">{start}</span>–<span className="font-medium text-[var(--text-primary)]">{end}</span> of <span className="font-medium text-[var(--text-primary)]">{total}</span>
      </div>
      
      <div className="flex items-center gap-2">
        <Button 
          variant="outline" 
          size="sm" 
          disabled={currentPage <= 1} 
          onClick={() => onChange(currentPage - 1)}
          className="gap-1 px-2"
        >
          <ChevronLeft size={16} /> Prev
        </Button>
        
        <span className="text-sm text-[var(--text-secondary)] px-2">
          Page {currentPage} of {totalPages}
        </span>
        
        <Button 
          variant="outline" 
          size="sm" 
          disabled={currentPage >= totalPages} 
          onClick={() => onChange(currentPage + 1)}
          className="gap-1 px-2"
        >
          Next <ChevronRight size={16} />
        </Button>
      </div>
    </div>
  );
}
