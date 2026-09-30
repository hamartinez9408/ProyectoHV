# Patrón Obligatorio de 4 Estados en Componentes de Datos

En ProyectoHV, todo componente que consuma datos asíncronos DEBE contemplar y manejar explícitamente los 4 estados canónicos:

```tsx
import React from 'react';

type DataState<T> =
  | { status: 'loading' }
  | { status: 'error'; message: string; retry?: () => void }
  | { status: 'empty'; message?: string }
  | { status: 'data'; data: T };

export function ExperienceList({ state }: { state: DataState<Experience[]> }) {
  switch (state.status) {
    case 'loading':
      return <div className="animate-pulse space-y-4" role="status" aria-label="Cargando trayectoria...">...</div>;

    case 'error':
      return (
        <div className="p-4 rounded-md border border-red-500/20 bg-red-500/10 text-red-400" role="alert">
          <p>{state.message}</p>
          {state.retry && (
            <button onClick={state.retry} className="mt-2 text-sm underline hover:text-red-300">
              Reintentar
            </button>
          )}
        </div>
      );

    case 'empty':
      return (
        <div className="p-8 text-center text-muted-foreground border border-dashed rounded-lg">
          <p>{state.message || 'No hay experiencias registradas en esta vista.'}</p>
        </div>
      );

    case 'data':
      return (
        <ul className="space-y-6">
          {state.data.map((item) => (
            <li key={item.id} className="p-4 rounded-lg border bg-card text-card-foreground">
              <h3 className="font-semibold">{item.role}</h3>
              <p className="text-sm text-muted-foreground">{item.anonymizedCompany}</p>
            </li>
          ))}
        </ul>
      );
  }
}
```
