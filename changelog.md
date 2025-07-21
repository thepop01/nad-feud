# Changelog

All notable changes to this project will be documented in this file.

## [Unreleased]

### Fixed
- Hardened the Supabase `onAuthStateChange` handler to prevent application startup failures. The logic for retrieving the auth subscription is now safer, and the error handling within the auth callback has been improved to prevent unhandled exceptions during sign-out attempts. This resolves both the "blank screen" issue and the "cannot read properties of undefined (reading 'unsubscribe')" error.
- Resolved an initial critical bug causing a blank screen on application load by safely handling the Supabase authentication listener subscription.

### Added
- Created `changelog.md` to track all notable changes to the application.
