import AsyncStorage from '@react-native-async-storage/async-storage';
import { createContext, useCallback, useContext, useEffect, useMemo, useReducer, useState, type ReactNode } from 'react';
import type { DrugSummary } from '@/domain/types';

/**
 * Datos del usuario guardados solo en el dispositivo: favoritos, búsquedas recientes y la lista
 * de medicamentos para comprobar interacciones. No se envían a ningún servidor.
 */
export interface UserData {
  favorites: DrugSummary[];
  recentSearches: string[];
  interactionList: DrugSummary[];
}

const STORAGE_KEY = 'medinfo:user:v1';
const MAX_RECENT = 8;
export const MAX_INTERACTION_LIST = 10;

const initialState: UserData = { favorites: [], recentSearches: [], interactionList: [] };

type Action =
  | { type: 'hydrate'; data: Partial<UserData> }
  | { type: 'toggleFavorite'; drug: DrugSummary }
  | { type: 'addRecent'; query: string }
  | { type: 'clearRecent' }
  | { type: 'addToInteractions'; drug: DrugSummary }
  | { type: 'removeFromInteractions'; id: string }
  | { type: 'clearInteractions' };

/** Copia mínima del resumen para no persistir campos innecesarios. */
const slim = (d: DrugSummary): DrugSummary => ({
  id: d.id,
  source: d.source,
  name: d.name,
  activeIngredients: d.activeIngredients,
  presentation: d.presentation,
  manufacturer: d.manufacturer,
  requiresPrescription: d.requiresPrescription,
});

export function userDataReducer(state: UserData, action: Action): UserData {
  switch (action.type) {
    case 'hydrate':
      return { ...state, ...action.data };
    case 'toggleFavorite': {
      const exists = state.favorites.some((f) => f.id === action.drug.id);
      return {
        ...state,
        favorites: exists
          ? state.favorites.filter((f) => f.id !== action.drug.id)
          : [slim(action.drug), ...state.favorites],
      };
    }
    case 'addRecent': {
      const q = action.query.trim();
      if (!q) return state;
      const rest = state.recentSearches.filter((r) => r.toLowerCase() !== q.toLowerCase());
      return { ...state, recentSearches: [q, ...rest].slice(0, MAX_RECENT) };
    }
    case 'clearRecent':
      return { ...state, recentSearches: [] };
    case 'addToInteractions':
      if (state.interactionList.some((d) => d.id === action.drug.id)) return state;
      if (state.interactionList.length >= MAX_INTERACTION_LIST) return state;
      return { ...state, interactionList: [...state.interactionList, slim(action.drug)] };
    case 'removeFromInteractions':
      return { ...state, interactionList: state.interactionList.filter((d) => d.id !== action.id) };
    case 'clearInteractions':
      return { ...state, interactionList: [] };
  }
}

interface UserDataApi extends UserData {
  ready: boolean;
  isFavorite(id: string): boolean;
  isInInteractions(id: string): boolean;
  toggleFavorite(drug: DrugSummary): void;
  addRecent(query: string): void;
  clearRecent(): void;
  addToInteractions(drug: DrugSummary): boolean;
  removeFromInteractions(id: string): void;
  clearInteractions(): void;
}

const UserDataContext = createContext<UserDataApi | null>(null);

export function UserDataProvider({ children }: { children: ReactNode }) {
  const [state, dispatch] = useReducer(userDataReducer, initialState);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    AsyncStorage.getItem(STORAGE_KEY)
      .then((raw) => {
        if (raw) dispatch({ type: 'hydrate', data: JSON.parse(raw) as Partial<UserData> });
      })
      .catch(() => {
        // Datos corruptos o almacenamiento no disponible: se empieza de cero.
      })
      .finally(() => setReady(true));
  }, []);

  useEffect(() => {
    // No se escribe hasta haber leído lo guardado, para no sobrescribirlo con el estado vacío.
    if (!ready) return;
    AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(state)).catch(() => {});
  }, [state, ready]);

  const addToInteractions = useCallback(
    (drug: DrugSummary) => {
      if (state.interactionList.length >= MAX_INTERACTION_LIST) return false;
      dispatch({ type: 'addToInteractions', drug });
      return true;
    },
    [state.interactionList.length],
  );

  const api = useMemo<UserDataApi>(
    () => ({
      ...state,
      ready,
      isFavorite: (id) => state.favorites.some((f) => f.id === id),
      isInInteractions: (id) => state.interactionList.some((d) => d.id === id),
      toggleFavorite: (drug) => dispatch({ type: 'toggleFavorite', drug }),
      addRecent: (query) => dispatch({ type: 'addRecent', query }),
      clearRecent: () => dispatch({ type: 'clearRecent' }),
      addToInteractions,
      removeFromInteractions: (id) => dispatch({ type: 'removeFromInteractions', id }),
      clearInteractions: () => dispatch({ type: 'clearInteractions' }),
    }),
    [state, addToInteractions, ready],
  );

  return <UserDataContext.Provider value={api}>{children}</UserDataContext.Provider>;
}

export function useUserData(): UserDataApi {
  const ctx = useContext(UserDataContext);
  if (!ctx) throw new Error('useUserData debe usarse dentro de <UserDataProvider>');
  return ctx;
}
