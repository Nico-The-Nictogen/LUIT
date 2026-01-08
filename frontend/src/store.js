import create from 'zustand'
import { persist, createJSONStorage } from 'zustand/middleware'

export const useAuthStore = create(
  persist(
    (set, get) => ({
      user: null,
      userType: null, // 'individual' or 'ngo'
      token: null,
      isLoading: false,
      hydrated: false,

      setUser: (user) => set({ user }),
      setUserType: (userType) => set({ userType }),
      setToken: (token) => set({ token }),
      setIsLoading: (isLoading) => set({ isLoading }),
      setHydrated: () => set({ hydrated: true }),

      logout: () => set({ user: null, userType: null, token: null })
    }),
    {
      name: 'auth-store',
      version: 1,
      storage: createJSONStorage(() => localStorage),
      partialize: (state) => ({ user: state.user, userType: state.userType, token: state.token }),
      onRehydrateStorage: () => (state, error) => {
        state?.setHydrated()
      }
    }
  )
)

export const useLocationStore = create((set) => ({
  latitude: null,
  longitude: null,
  accuracy: null,
  lastUpdated: null,
  
  setLocation: (latitude, longitude, accuracy) => 
    set({ latitude, longitude, accuracy, lastUpdated: new Date() })
}))

export const useReportStore = create((set) => ({
  reports: [],
  selectedReport: null,
  
  setReports: (reports) => set({ reports }),
  setSelectedReport: (report) => set({ selectedReport: report })
}))
