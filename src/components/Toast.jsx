import { memo } from 'react';

export const Toast = memo(({ toast }) => {
    if (!toast) return null;
    return <div className={`toast ${toast.type}`} role="status" aria-live="polite">{toast.message}</div>;
});
Toast.displayName = 'Toast';