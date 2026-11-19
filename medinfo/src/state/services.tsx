import AsyncStorage from '@react-native-async-storage/async-storage';
import { createContext, useContext, useMemo, type ReactNode } from 'react';
import { Cache } from '@/data/cache/cache';
import { createDrugRepository, type DrugRepository } from '@/data/repositories/drugRepository';

interface Services {
  drugs: DrugRepository;
}

const ServicesContext = createContext<Services | null>(null);

/**
 * Inyección de dependencias: las pantallas obtienen el repositorio del contexto, de modo que en
 * los tests (o para otra configuración) se puede pasar una implementación distinta.
 */
export function ServicesProvider({ children, services }: { children: ReactNode; services?: Services }) {
  const value = useMemo<Services>(
    () => services ?? { drugs: createDrugRepository(new Cache(AsyncStorage)) },
    [services],
  );
  return <ServicesContext.Provider value={value}>{children}</ServicesContext.Provider>;
}

export function useServices(): Services {
  const ctx = useContext(ServicesContext);
  if (!ctx) throw new Error('useServices debe usarse dentro de <ServicesProvider>');
  return ctx;
}
