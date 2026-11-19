import { MAX_INTERACTION_LIST, userDataReducer, type UserData } from '@/state/userData';
import type { DrugSummary } from '@/domain/types';

jest.mock('@react-native-async-storage/async-storage', () => ({}));

const empty: UserData = { favorites: [], recentSearches: [], interactionList: [] };
const drug = (id: string): DrugSummary => ({ id, source: 'cima', name: id, activeIngredients: [] });

describe('userDataReducer', () => {
  it('alterna favoritos', () => {
    const s1 = userDataReducer(empty, { type: 'toggleFavorite', drug: drug('a') });
    expect(s1.favorites.map((f) => f.id)).toEqual(['a']);
    expect(userDataReducer(s1, { type: 'toggleFavorite', drug: drug('a') }).favorites).toEqual([]);
  });

  it('búsquedas recientes sin duplicados y con límite', () => {
    let s = empty;
    for (const q of ['a', 'b', 'A', ...'cdefghijk']) s = userDataReducer(s, { type: 'addRecent', query: q });
    expect(s.recentSearches[0]).toBe('k');
    expect(s.recentSearches).toHaveLength(8);
    expect(s.recentSearches.filter((q) => q.toLowerCase() === 'a')).toHaveLength(0);
  });

  it('limita la lista de interacciones y evita duplicados', () => {
    let s = empty;
    for (let i = 0; i < MAX_INTERACTION_LIST + 3; i++) s = userDataReducer(s, { type: 'addToInteractions', drug: drug(String(i % 12)) });
    expect(s.interactionList).toHaveLength(MAX_INTERACTION_LIST);
    s = userDataReducer(s, { type: 'removeFromInteractions', id: '0' });
    expect(s.interactionList.find((d) => d.id === '0')).toBeUndefined();
  });
});
