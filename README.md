# Booking widget

Small appointment-booking widget. Express + React, TypeScript end-to-end.

## Run

```bash
npm install
npm run dev:server    # in one terminal — starts the API on :3000
npm run dev:client    # in another — starts the React app on :5173 (proxies /api -> :3000)
```

Open http://localhost:5173

## What's known broken

Users are reporting three issues:

1. Sometimes the same time slot ends up double-booked (two confirmation emails for the same slot).
2. The list of available slots sometimes shows times that are clearly in the past.
3. The booking confirmation shows the wrong time for users in different timezones than the office.

There may be more. Find what you can.
