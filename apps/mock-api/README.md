# @octopus/mock-api

A tiny in-memory HTTP service that links the two portals during development.

## Why this exists

`apps/customer` (`:3000`) and `apps/merchant` (`:5173`) are **different origins** — they
cannot share `localStorage`, cookies, or any other browser-scoped storage. Until a real
backend exists, this service is the only way for an order placed in the customer storefront
to show up in the merchant console (Live Orders, KDS).

## State

All orders live in a single in-memory array (`src/store.ts`). There is no database and no
persistence — **restarting the process resets all data** to an empty order list. IDs are
sequential `OC-####` starting at `3392`, continuing the merchant's existing seeded series
(`#OC-3384`…`#OC-3391`).

## Running

```bash
npm run dev --workspace=@octopus/mock-api
```

Serves on `http://localhost:4000`.

## Endpoints

- `GET /api/health`
- `GET /api/orders`
- `GET /api/orders/:id`
- `POST /api/orders`
- `PATCH /api/orders/:id/status`

CORS is restricted to `http://localhost:3000` and `http://localhost:5173`.
