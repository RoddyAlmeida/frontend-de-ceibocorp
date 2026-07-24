import { create } from 'zustand';
import type { User } from '../types/user';
import type { Role } from '../types/role';
import { computeRoleFlags } from '../types/role';
import {
  clearAuthToken,
  getMe,
  loadTokenFromStorage,
  logout as apiLogout,
  resolveUserHeadquarter,
} from '../services/api';

interface AuthState {
  user: User | null;
  token: string | null;
  role: Role | null;
  isAuthenticated: boolean;
  isSuperAdmin: boolean;
  isAdmin: boolean;
  isBodeguero: boolean;
  canEditPlants: boolean;
  isHydrating: boolean;
  setUser: (user: User | null) => void;
  setToken: (token: string | null) => void;
  hydrate: () => Promise<void>;
  clearSession: () => void;
  logout: () => Promise<void>;
}

const EMPTY_ROLE_FLAGS = {
  role: null as Role | null,
  isSuperAdmin: false,
  isAdmin: false,
  isBodeguero: false,
  canEditPlants: true,
};

function applyUser(user: User | null) {
  const role = user?.role ?? null;
  return {
    user,
    role,
    isAuthenticated: !!user,
    ...computeRoleFlags(role),
  };
}

export const useAuthStore = create<AuthState>((set) => ({
  user: null,
  token: null,
  ...EMPTY_ROLE_FLAGS,
  isAuthenticated: false,
  isHydrating: true,

  setUser: (user) => set(applyUser(user)),

  setToken: (token) => set({ token, isAuthenticated: !!token }),

  hydrate: async () => {
    set({ isHydrating: true });
    const token = loadTokenFromStorage();
    if (!token) {
      set({ isHydrating: false, token: null, isAuthenticated: false });
      return;
    }

    set({ token, isAuthenticated: true });
    try {
      const user = await getMe();
      if (!user.headquarter_id && (user.role === 'admin' || user.role === 'bodeguero')) {
        const hqId = await resolveUserHeadquarter(user);
        if (hqId) {
          user.headquarter_id = hqId;
        }
      }
      set({ ...applyUser(user), isHydrating: false });
    } catch (err) {
      console.error('[auth] Error al hidratar sesión:', err);
      clearAuthToken();
      set({
        user: null,
        token: null,
        isAuthenticated: false,
        isHydrating: false,
        ...EMPTY_ROLE_FLAGS,
      });
    }
  },

  clearSession: () => {
    clearAuthToken();
    set({
      user: null,
      token: null,
      isAuthenticated: false,
      ...EMPTY_ROLE_FLAGS,
    });
  },

  logout: async () => {
    try {
      await apiLogout();
    } catch (err) {
      console.error('[auth] Error al cerrar sesión en el servidor:', err);
    } finally {
      set({
        user: null,
        token: null,
        isAuthenticated: false,
        ...EMPTY_ROLE_FLAGS,
      });
    }
  },
}));
