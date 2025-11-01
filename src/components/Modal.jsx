import React from 'react';

export function AlertModal({ isOpen, onClose, title, message, type = 'info' }) {
  if (!isOpen) return null;

  const icons = {
    success: '✅',
    error: '❌',
    warning: '⚠️',
    info: 'ℹ️',
  };

  const colors = {
    success: 'from-emerald-900/40 to-emerald-950/40 border-emerald-700/30',
    error: 'from-rose-900/40 to-rose-950/40 border-rose-700/30',
    warning: 'from-amber-900/40 to-amber-950/40 border-amber-700/30',
    info: 'from-blue-900/40 to-blue-950/40 border-blue-700/30',
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
      <div className={`bg-gradient-to-br ${colors[type]} border rounded-xl shadow-2xl max-w-md w-full p-6 animate-fadeIn`}>
        <div className="flex items-start gap-4">
          <span className="text-4xl">{icons[type]}</span>
          <div className="flex-1">
            {title && <h3 className="text-xl font-bold text-white mb-2">{title}</h3>}
            <p className="text-slate-200 text-base whitespace-pre-line">{message}</p>
          </div>
        </div>
        <div className="mt-6 flex justify-end">
          <button
            onClick={onClose}
            className="px-6 py-2 bg-white/10 hover:bg-white/20 text-white rounded-lg font-semibold transition-colors"
          >
            OK
          </button>
        </div>
      </div>
    </div>
  );
}

export function ConfirmModal({ isOpen, onClose, onConfirm, title, message, confirmText = 'Confirm', cancelText = 'Cancel' }) {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
      <div className="bg-gradient-to-br from-slate-800/95 to-slate-900/95 border border-slate-700/50 rounded-xl shadow-2xl max-w-md w-full p-6 animate-fadeIn">
        <div className="flex items-start gap-4">
          <span className="text-4xl">❓</span>
          <div className="flex-1">
            {title && <h3 className="text-xl font-bold text-white mb-2">{title}</h3>}
            <p className="text-slate-200 text-base whitespace-pre-line">{message}</p>
          </div>
        </div>
        <div className="mt-6 flex gap-3 justify-end">
          <button
            onClick={onClose}
            className="px-6 py-2 bg-white/10 hover:bg-white/20 text-white rounded-lg font-semibold transition-colors"
          >
            {cancelText}
          </button>
          <button
            onClick={() => {
              onConfirm();
              onClose();
            }}
            className="px-6 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg font-semibold transition-colors"
          >
            {confirmText}
          </button>
        </div>
      </div>
    </div>
  );
}
