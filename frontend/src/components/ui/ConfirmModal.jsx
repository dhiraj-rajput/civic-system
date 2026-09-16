import { AlertTriangle } from 'lucide-react';
import Modal from './Modal';
import Button from './Button';

export default function ConfirmModal({ isOpen, onClose, onConfirm, title, message, confirmLabel = 'Confirm', variant = 'danger' }) {
  const isDanger = variant === 'danger';
  
  const footer = (
    <>
      <Button variant="ghost" onClick={onClose}>Cancel</Button>
      <Button variant={isDanger ? 'danger' : 'primary'} onClick={() => { onConfirm(); onClose(); }}>
        {confirmLabel}
      </Button>
    </>
  );

  return (
    <Modal isOpen={isOpen} onClose={onClose} title={title} footer={footer}>
      <div className="flex items-start gap-4">
        <div className={`p-2 rounded-full ${isDanger ? 'bg-red-100 text-[var(--brand-danger)] dark:bg-red-900/30' : 'bg-amber-100 text-[var(--brand-warning)] dark:bg-amber-900/30'}`}>
          <AlertTriangle size={24} />
        </div>
        <div className="flex-1 mt-1 text-[var(--text-secondary)]">
          {message}
        </div>
      </div>
    </Modal>
  );
}
