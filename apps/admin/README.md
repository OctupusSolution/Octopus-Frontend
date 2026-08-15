# Admin (admin.octopus.sa)

Internal OCTOPUS SuperAdmin console. React + Vite SPA. Reuses the identical shell + module-registry pattern as Merchant (via `@octopus/module-kit`), scoped to internal operations staff. No entitlement gating — every admin user with access sees the same surface, scoped only by internal role. Must never share a deployable bundle with `apps/merchant`.
