# Fishing Tackle Store Live Lucky Draw — Frontend scaffold

React + Vite frontend starter for the Fishing Tackle Store lucky draw.

## Run on Windows
1. Install Node.js LTS.
2. Extract the ZIP and open this folder in VS Code.
3. Open Terminal and run `npm install`.
4. Copy `.env.example` to `.env` and add your Firebase Web App configuration.
5. Run `npm run dev` and open the local URL shown in the terminal.

## Included
- Dark red/gold event-style public pages: Home, Participants, Winners, Live Draw.
- Admin sign-in shell and protected admin dashboard.
- CSV preview for Google Forms exports.
- Firebase initialization and Firestore subscription placeholders.
- Firebase Hosting SPA configuration.

## Important before using real customer data
This is a frontend starter, not a complete production draw system. CSV preview does not upload records or assign lucky numbers. Implement the import and number assignment in a trusted Firebase Cloud Function, with a transaction that guarantees unique numbers 1–700. Winner selection must also happen server-side, select 13 distinct participants, and enforce one win per participant. Do not put admin secrets in frontend code. Configure Firestore Security Rules to deny public writes and expose only the minimum public participant fields (for example name and luckyNumber); do not publish phone numbers or full addresses. Restrict admin operations to authenticated admin accounts/custom claims.

## Deploy
After the backend and security rules are implemented and tested: `npm run build`, then `firebase deploy --only hosting`.
