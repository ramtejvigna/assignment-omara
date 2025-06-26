import { create } from 'zustand'
import { User } from 'firebase/auth'
import { 
  signInWithEmailAndPassword, 
  createUserWithEmailAndPassword, 
  signOut as firebaseSignOut,
  onAuthStateChanged,
  signInWithPopup,
  GoogleAuthProvider,
  updateProfile
} from 'firebase/auth'
import { auth } from '@/lib/firebase'

interface AuthState {
  user: User | null
  loading: boolean
  error: string | null
  signIn: (email: string, password: string) => Promise<void>
  signUp: (email: string, password: string, displayName: string) => Promise<void>
  signInWithGoogle: () => Promise<void>
  signOut: () => Promise<void>
  clearError: () => void
}

export const useAuthStore = create<AuthState>((set, get) => ({
  user: null,
  loading: true,
  error: null,

  signIn: async (email: string, password: string) => {
    try {
      set({ loading: true, error: null })
      await signInWithEmailAndPassword(auth, email, password)
    } catch (error: any) {
      set({ error: error.message, loading: false })
      throw error
    }
  },

  signUp: async (email: string, password: string, displayName: string) => {
    try {
      set({ loading: true, error: null })
      const result = await createUserWithEmailAndPassword(auth, email, password)
      
      // Update the user's profile with the display name
      await updateProfile(result.user, {
        displayName: displayName.trim()
      })
      
      // Reload the user to get updated profile
      await result.user.reload()
    } catch (error: any) {
      set({ error: error.message, loading: false })
      throw error
    }
  },

  signInWithGoogle: async () => {
    try {
      set({ loading: true, error: null })
      const provider = new GoogleAuthProvider()
      provider.addScope('email')
      provider.addScope('profile')
      await signInWithPopup(auth, provider)
    } catch (error: any) {
      set({ error: error.message, loading: false })
      throw error
    }
  },

  signOut: async () => {
    try {
      set({ loading: true, error: null })
      await firebaseSignOut(auth)
      set({ user: null, loading: false })
    } catch (error: any) {
      set({ error: error.message, loading: false })
      throw error
    }
  },

  clearError: () => set({ error: null })
}))

// Set up auth state listener
onAuthStateChanged(auth, (user) => {
  useAuthStore.setState({ user, loading: false })
}) 