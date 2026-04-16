# Architecture v1

## Why this setup is lightweight

- React + Vite starts quickly and ships only essential JS.
- UI keeps static regions server/cache friendly and pushes interactivity only to lecture playback.
- No dependency on heavyweight player wrappers.

## Evolution path to Astro

If you want even lower JS on listing pages:
- Keep this player component as an Astro island.
- Render course/lecture catalog through Astro static routes.
- Hydrate only the theater player route.

This keeps UX quality while trimming client-side JavaScript for browsing pages.
