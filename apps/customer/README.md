# Customer (shop.octopus.sa)

Public storefront/booking PWA. Next.js App Router (SSR + ISR), tenant resolved by subdomain in middleware. Pure Feature-Sliced Design — no entitlement registry needed, every visitor sees the same flow.

Note: FSD's `pages` layer is named `views` here because `app/` is reserved by Next.js for routing. Route files in `app/` are thin wrappers that render the matching view from `views/`.
