// "server-only" is a Next.js build-time module that only exists as a
// webpack/turbopack alias — it doesn't resolve under plain Node/Vite.
// vitest.config.ts aliases the real specifier to this no-op so service
// files can be imported in tests unmodified.
export {};
