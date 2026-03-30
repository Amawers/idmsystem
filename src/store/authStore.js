import { create } from 'zustand'
import supabase from '../../config/supabase'

// Lifecycle labels used by UI and guards.
const AUTH_STATUS = {
	IDLE: 'idle',
	INITIALIZING: 'initializing',
	AUTHENTICATED: 'authenticated',
	UNAUTHENTICATED: 'unauthenticated',
}

// Any profile with these statuses is denied access.
const BLOCKED_PROFILE_STATUSES = new Set(['inactive', 'banned'])

// Central initial state so resets stay consistent.
const DEFAULT_STATE = {
	authStatus: AUTH_STATUS.IDLE,
	user: null,
	session: null,
	profile: null,
	isInitializing: false,
	isLoading: false,
	error: null,
	isBlocked: false,
	blockedReason: null,
	authSubscription: null,
}

// Treat missing/empty statuses as active by default.
const normalizeProfileStatus = (status) => {
	if (!status) {
		return 'active'
	}

	return String(status).trim().toLowerCase()
}

const buildBlockedReason = (status) => {
	if (status === 'banned') {
		return 'Your account has been banned.'
	}

	if (status === 'inactive') {
		return 'Your account is inactive.'
	}

	return 'Your account is not allowed to sign in.'
}

const useAuthStore = create((set, get) => ({
	...DEFAULT_STATE,

	setError: (error) => set({ error }),

	clearError: () => set({ error: null }),

	// Clears all user/session data after sign-out or expired sessions.
	_resetAuthState: () => {
		set({
			authStatus: AUTH_STATUS.UNAUTHENTICATED,
			user: null,
			session: null,
			profile: null,
			isInitializing: false,
			isLoading: false,
			isBlocked: false,
			blockedReason: null,
			error: null,
		})
	},

	// Enforce ban/inactive rules by forcing sign-out and surfacing reason.
	_markBlockedAndLogout: async (status) => {
		const reason = buildBlockedReason(status)

		set({
			isBlocked: true,
			blockedReason: reason,
			error: reason,
			user: null,
			session: null,
			profile: null,
			authStatus: AUTH_STATUS.UNAUTHENTICATED,
		})

		await supabase.auth.signOut()

		return { blocked: true, reason }
	},

	// Reads one profile row that matches the authenticated user id.
	fetchProfile: async (userId) => {
		if (!userId) {
			return null
		}

		const { data, error } = await supabase
			.from('profile')
			.select('*')
			.eq('id', userId)
			.maybeSingle()

		if (error) {
			throw new Error(error.message || 'Failed to load user profile.')
		}

		return data
	},

	// Gate access according to profile status.
	_validateProfileStatus: async (profile) => {
		const status = normalizeProfileStatus(profile?.status)

		if (BLOCKED_PROFILE_STATUSES.has(status)) {
			return get()._markBlockedAndLogout(status)
		}

		set({
			isBlocked: false,
			blockedReason: null,
		})

		return { blocked: false, reason: null }
	},

	// Single place that writes authenticated state to the store.
	_setAuthenticatedState: ({ session, user, profile }) => {
		set({
			session,
			user,
			profile,
			authStatus: AUTH_STATUS.AUTHENTICATED,
			isInitializing: false,
			isLoading: false,
			error: null,
		})
	},

	// Bootstraps auth from an existing Supabase session (page/app load).
	initialize: async () => {
		const { isInitializing } = get()
		if (isInitializing) {
			return
		}

		set({
			authStatus: AUTH_STATUS.INITIALIZING,
			isInitializing: true,
			isLoading: true,
			error: null,
		})

		try {
			const {
				data: { session },
				error: sessionError,
			} = await supabase.auth.getSession()

			if (sessionError) {
				throw new Error(sessionError.message || 'Unable to initialize auth session.')
			}

			if (!session?.user) {
				get()._resetAuthState()
				return
			}

			const profile = await get().fetchProfile(session.user.id)
			const validation = await get()._validateProfileStatus(profile)

			if (validation.blocked) {
				set({ isInitializing: false, isLoading: false })
				return
			}

			get()._setAuthenticatedState({
				session,
				user: session.user,
				profile,
			})
		} catch (error) {
			set({
				...DEFAULT_STATE,
				authStatus: AUTH_STATUS.UNAUTHENTICATED,
				error: error instanceof Error ? error.message : 'Authentication initialization failed.',
			})
		}
	},

	// Signs in then immediately validates profile access rules.
	login: async ({ email, password }) => {
		set({ isLoading: true, error: null, isBlocked: false, blockedReason: null })

		try {
			const { data, error } = await supabase.auth.signInWithPassword({ email, password })

			if (error) {
				throw new Error(error.message || 'Login failed.')
			}

			const session = data?.session
			const user = data?.user

			if (!user || !session) {
				throw new Error('No active session was returned after login.')
			}

			const profile = await get().fetchProfile(user.id)
			const validation = await get()._validateProfileStatus(profile)

			if (validation.blocked) {
				return { success: false, blocked: true, message: validation.reason }
			}

			get()._setAuthenticatedState({ session, user, profile })

			return { success: true, blocked: false, user, profile }
		} catch (error) {
			const message = error instanceof Error ? error.message : 'Login failed.'

			set({
				authStatus: AUTH_STATUS.UNAUTHENTICATED,
				user: null,
				session: null,
				profile: null,
				isLoading: false,
				isInitializing: false,
				error: message,
			})

			return { success: false, blocked: false, message }
		}
	},

	// Creates a new auth user account; can be used by hidden/direct-access routes.
	signup: async ({ fullName, email, password, role = 'social_worker' }) => {
		set({ isLoading: true, error: null, isBlocked: false, blockedReason: null })

		try {
			const { data, error } = await supabase.auth.signUp({
				email,
				password,
				options: {
					data: {
						full_name: fullName,
						role,
					},
				},
			})

			if (error) {
				throw new Error(error.message || 'Signup failed.')
			}

			const session = data?.session ?? null
			const user = data?.user ?? null
			const requiresEmailConfirmation = Boolean(user) && !session

			if (session && user) {
				let profile = null

				try {
					profile = await get().fetchProfile(user.id)
				} catch {
					profile = null
				}

				if (profile) {
					const validation = await get()._validateProfileStatus(profile)

					if (validation.blocked) {
						set({ isLoading: false })
						return { success: false, blocked: true, message: validation.reason }
					}
				}

				set({
					session,
					user,
					profile,
					authStatus: AUTH_STATUS.AUTHENTICATED,
					isInitializing: false,
					isLoading: false,
					error: null,
				})
			} else {
				set({
					authStatus: AUTH_STATUS.UNAUTHENTICATED,
					isInitializing: false,
					isLoading: false,
					error: null,
				})
			}

			return {
				success: true,
				blocked: false,
				requiresEmailConfirmation,
				user,
				session,
			}
		} catch (error) {
			const message = error instanceof Error ? error.message : 'Signup failed.'

			set({
				isLoading: false,
				isInitializing: false,
				error: message,
			})

			return { success: false, blocked: false, message }
		}
	},

	// Signs out remotely and clears local auth state.
	logout: async () => {
		set({ isLoading: true, error: null })

		try {
			const { error } = await supabase.auth.signOut()
			if (error) {
				throw new Error(error.message || 'Logout failed.')
			}

			get()._resetAuthState()
			return { success: true }
		} catch (error) {
			const message = error instanceof Error ? error.message : 'Logout failed.'
			set({ isLoading: false, error: message })
			return { success: false, message }
		}
	},

	// Re-fetch profile data when profile fields are changed elsewhere.
	refreshProfile: async () => {
		const { user } = get()
		if (!user?.id) {
			return null
		}

		set({ isLoading: true, error: null })

		try {
			const profile = await get().fetchProfile(user.id)
			const validation = await get()._validateProfileStatus(profile)

			if (validation.blocked) {
				return null
			}

			set({ profile, isLoading: false })
			return profile
		} catch (error) {
			set({
				isLoading: false,
				error: error instanceof Error ? error.message : 'Failed to refresh user profile.',
			})

			return null
		}
	},

	// Keeps store synced with Supabase auth events (sign-in/out/token refresh).
	subscribeToAuthChanges: () => {
		const currentSubscription = get().authSubscription
		if (currentSubscription) {
			return () => currentSubscription.unsubscribe()
		}

		const {
			data: { subscription },
		} = supabase.auth.onAuthStateChange(async (_event, session) => {
			if (!session?.user) {
				get()._resetAuthState()
				return
			}

			try {
				const profile = await get().fetchProfile(session.user.id)
				const validation = await get()._validateProfileStatus(profile)

				if (validation.blocked) {
					return
				}

				get()._setAuthenticatedState({
					session,
					user: session.user,
					profile,
				})
			} catch (error) {
				set({
					authStatus: AUTH_STATUS.UNAUTHENTICATED,
					user: null,
					session: null,
					profile: null,
					isInitializing: false,
					isLoading: false,
					error: error instanceof Error ? error.message : 'Failed to process auth state change.',
				})
			}
		})

		set({ authSubscription: subscription })

		return () => {
			subscription.unsubscribe()
			set({ authSubscription: null })
		}
	},

	// Call during app teardown to avoid dangling subscriptions.
	dispose: () => {
		const currentSubscription = get().authSubscription
		if (currentSubscription) {
			currentSubscription.unsubscribe()
		}

		set({ authSubscription: null })
	},
}))

export const useAuth = () => useAuthStore((state) => state)
export const useAuthSession = () => useAuthStore((state) => state.session)
export const useAuthUser = () => useAuthStore((state) => state.user)
export const useAuthProfile = () => useAuthStore((state) => state.profile)
export const useIsAuthenticated = () =>
	useAuthStore((state) => state.authStatus === AUTH_STATUS.AUTHENTICATED && Boolean(state.user))
export const useAuthBlockedState = () =>
	useAuthStore((state) => ({
		isBlocked: state.isBlocked,
		blockedReason: state.blockedReason,
	}))

export { AUTH_STATUS, useAuthStore }
export default useAuthStore
