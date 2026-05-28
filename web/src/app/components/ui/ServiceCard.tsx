import React from 'react';
import { Edit2, X } from 'lucide-react';

interface ServiceCardProps {
  name: string;
  duration: number;
  price: number;
  onEdit: () => void;
  onDelete: () => void;
}

export function ServiceCard({ name, duration, price, onEdit, onDelete }: ServiceCardProps) {
  return (
    <div className="flex items-center justify-between bg-white border border-[var(--auralynne-border)] rounded-xl p-4 hover:border-[var(--auralynne-primary)] hover:shadow-sm transition-all">
      <div className="flex-1">
        <h3 className="font-['Inter'] font-semibold text-[var(--auralynne-text)]">{name}</h3>
        <p className="text-sm font-['Inter'] text-[var(--auralynne-muted)]">
          {duration} min - R$ {price.toFixed(2)}
        </p>
      </div>
      <div className="flex gap-2">
        <button
          type="button"
          onClick={onEdit}
          className="p-2 text-[var(--auralynne-muted)] hover:text-[var(--auralynne-primary)] transition-colors"
          aria-label="Editar servico"
        >
          <Edit2 size={18} />
        </button>
        <button
          type="button"
          onClick={onDelete}
          className="p-2 text-[var(--auralynne-muted)] hover:text-[#E53935] transition-colors"
          aria-label="Remover servico"
        >
          <X size={18} />
        </button>
      </div>
    </div>
  );
}
