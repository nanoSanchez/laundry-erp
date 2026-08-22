import type { ReactNode } from "react";

interface Props {
  open: boolean;
  title: string;
  children: ReactNode;
  onClose: () => void;
  size?: "default" | "wide";
}

export default function Modal({ open, title, children, onClose, size = "default" }: Props) {
  if (!open) {
    return null;
  }

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/50 sm:items-center sm:p-4">
      <div className={`w-full ${size === "wide" ? "max-w-5xl" : "max-w-lg"} max-h-[92dvh] overflow-y-auto rounded-t-xl bg-white shadow-xl sm:max-h-[90vh] sm:rounded-xl`}>
        <div className="sticky top-0 z-10 flex items-center justify-between border-b bg-white p-4 sm:p-5">
          <h2 className="text-lg font-semibold sm:text-xl">{title}</h2>

          <button
            type="button"
            onClick={onClose}
            className="rounded-lg px-3 py-1 text-xl text-slate-500 hover:bg-slate-100"
            aria-label="Cerrar"
          >
            ×
          </button>
        </div>

        <div className="p-4 sm:p-5">{children}</div>
      </div>
    </div>
  );
}
