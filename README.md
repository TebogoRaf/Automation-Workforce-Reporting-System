# Automation Workforce System — Excel upload backend

This repository adds a minimal Node.js backend that accepts Excel file uploads from the front-end, parses each sheet into JSON and stores the parsed data in MongoDB. The original file is saved to GridFS.

Quick start

1. Install Node.js (v16+ recommended).
2. Copy `.env.example` to `.env` and set `MONGODB_URI` (use MongoDB Atlas for an online DB).
3. Install dependencies and start server:

```bash
npm install
npm start
```

4. Open `http://localhost:3000/index.html` in your browser and use the "Upload Excel File" form.

What it does

- Parses each sheet and stores one document per sheet in the `sheets` collection.
- Stores the original uploaded file in GridFS (bucket name `files`).

New pages

- `employee_management.html` — add/list/delete employees (uses `/api/employees`).
- `task_scheduling.html` — create and list tasks, assign to employees (uses `/api/tasks`).
- `performance_tracking.html` — record simple performance metrics (uses `/api/performance`).
- `reporting.html` — overview counts and quick summary.

Start the server and open the pages to interact with the system.

Offline usage (no Node/npm required)

- Open `index.html` directly in your browser (double-click or drag into browser).
- The app uses IndexedDB to store uploaded Excel files and also stores local copies of employees, tasks and performance entries when the server is unavailable.
- UI elements: "Sync local" buttons on Employee, Task and Performance pages attempt to send local entries to `/api/*` when the server becomes available.
- An "Offline" banner appears on every page when the app cannot contact the server and will continue functioning locally.


Notes & production

- For production file storage (large files, scale) prefer S3 or other object storage and store only metadata in the DB.
- Use MongoDB Atlas for a managed, online database; set `MONGODB_URI` accordingly.
