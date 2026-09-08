# WebNest Studio Android

Native Android client for WebNest Studio. The app is built with React Native bare CLI, TypeScript, React Navigation, TanStack Query, Axios, React Hook Form, Zod, Keychain token storage, and `react-native-config`.

## Scope

- Public content: Home, Services, Portfolio, Blog.
- Lead capture: `POST /api/leads` with `source: "contact_form"`.
- Client account: signup, login, optional OTP verification, secure token refresh.
- Project tracking: `GET /api/me/project-status` from the existing FastAPI backend.
- Android only. iOS scaffold and scripts are intentionally excluded.

## API

The app reads `API_BASE_URL` from `.env`. Current default:

```sh
API_BASE_URL=https://webneststudiobackend-n00h.onrender.com
```

Backend API paths keep the existing `/api` prefix and do not use `/api/v1`.

## Structure

```text
src/
  api/              Axios client, token store, WebNest route wrappers
  assets/           Images and future brand assets
  components/       Shared UI primitives
  features/auth/    Session context
  navigation/       Root stack and bottom tabs
  screens/          App screens
  theme/            Design tokens
  types/            API and env types
  utils/            Formatting helpers
```

## Development

```sh
npm install
npm start
npm run android
```

## Android Release

Generate a production upload keystore before Play Store submission and replace the temporary debug signing config in `android/app/build.gradle`.

```sh
npm run bundle:android
```
