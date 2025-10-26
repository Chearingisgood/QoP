# Queen of Peace - Volunteer Portal (Demo)

## What this is
A small Node.js + Express application with a simple frontend to:
- Admin login (username/password: bryandaw / bryandaw)
- Add volunteers (single or bulk CSV upload)
- Create events
- Volunteers can register for events and log hours
- Data stored in JSON files under `/data` (no database setup)

## Quick start (local)
1. Install Node.js (v16+ recommended)
2. Extract the zip, open terminal in the project folder
3. Install dependencies:
   ```
   npm install
   ```
4. Start the server:
   ```
   npm start
   ```
5. Open `http://localhost:3000` in your browser.

## Files
- server.js — Express server and API
- public/ — frontend pages (index.html, admin.html, dashboard.html)
- data/ — volunteers.json, events.json, hours.json
- package.json — project metadata

## Notes / Security
- This is a demo. Admin credentials are stored in the server file in plain text.
- For production, use a proper database, hashed passwords, HTTPS, and secure session storage.