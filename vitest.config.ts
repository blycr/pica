import { defineConfig } from 'vitest/config'

export default defineConfig({
    test: {
        include: ['tests/**/*.{test,spec}.{js,mjs,cjs,ts,mts,cts,jsx,tsx}'],
        environment: 'node',
        reporters: ['verbose'],
        hookTimeout: 20000,
    },
})
