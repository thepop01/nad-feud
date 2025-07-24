# Changelog

All notable changes to this project will be documented in this file.

## [Unreleased]

### Fixed
- **Critical Auth Fix:** Completely overhauled the `onAuthStateChange` listener initialization in `services/supabase.ts`. The application now correctly handles errors that occur when the listener is first created (e.g., due to a corrupted token), preventing the app from hanging on a blank screen. This ensures the app's loading sequence always completes, either to a logged-in or logged-out state.
- Hardened the Supabase `onAuthStateChange` handler to prevent application startup failures. The logic for retrieving the auth subscription is now safer, and the error handling within the auth callback has been improved to prevent unhandled exceptions during sign-out attempts. This resolves both the "blank screen" issue and the "cannot read properties of undefined (reading 'unsubscribe')" error.
- Resolved an initial critical bug causing a blank screen on application load by safely handling the Supabase authentication listener subscription.

### Added
- Created `changelog.md` to track all notable changes to the application.
