import create from 'zustand'

export const useAuthStore = create((set) => ({
  user: null,
  userType: null, // 'individual' or 'ngo'
  token: null,
  isLoading: false,
  
  setUser: (user) => set({ user }),
  setUserType: (userType) => set({ userType }),
  setToken: (token) => set({ token }),
  setIsLoading: (isLoading) => set({ isLoading }),
  
  logout: () => set({ user: null, userType: null, token: null })
}))

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
