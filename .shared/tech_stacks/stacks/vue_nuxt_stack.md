# 📦 VUE + NUXT STACK
<!-- VI: Stack Vue 3 + Nuxt 3 cho ứng dụng full-stack -->

> **Best for**: Progressive web apps, SSR/SSG, gentle learning curve
> **Complexity**: Low-Medium | **Community**: Large

---

## 🏗️ ARCHITECTURE

```
┌─────────────────────────────────────────┐
│          Nuxt 3 (Vue 3)                 │
│   (SSR / SSG / SPA / Hybrid)            │
├─────────────────────────────────────────┤
│         Nitro Server Engine             │
│           (API Routes)                  │
├─────────────────────────────────────────┤
│         Prisma / Drizzle ORM            │
├─────────────────────────────────────────┤
│           PostgreSQL                    │
└─────────────────────────────────────────┘
```

---

## 📁 PROJECT STRUCTURE

```
nuxt-app/
├── app.vue                      # Root component
├── nuxt.config.ts              # Nuxt configuration
├── pages/                      # File-based routing
│   ├── index.vue
│   ├── about.vue
│   └── users/
│       ├── index.vue
│       └── [id].vue
├── components/                 # Auto-imported components
│   ├── TheHeader.vue
│   └── ui/
│       ├── Button.vue
│       └── Input.vue
├── composables/                # Auto-imported composables
│   ├── useAuth.ts
│   └── useApi.ts
├── server/                     # Nitro server
│   ├── api/                   # API routes
│   │   └── users/
│   │       ├── index.get.ts
│   │       └── [id].get.ts
│   ├── middleware/
│   └── utils/
├── stores/                     # Pinia stores
│   └── auth.ts
├── types/                      # TypeScript types
├── assets/                     # CSS, images
└── public/                     # Static files
```

---

## ⚙️ KEY DEPENDENCIES

```json
{
  "dependencies": {
    "nuxt": "^3.12.0",
    "@pinia/nuxt": "^0.5.0",
    "pinia": "^2.2.0",
    "@vueuse/nuxt": "^10.0.0"
  },
  "devDependencies": {
    "@nuxt/devtools": "^1.0.0",
    "@nuxtjs/tailwindcss": "^6.12.0",
    "@nuxt/image": "^1.7.0",
    "typescript": "^5.5.0"
  }
}
```

---

## 🔧 VUE 3 PATTERNS

### Composition API Component
```vue
<!-- components/UserCard.vue -->
<script setup lang="ts">
interface Props {
  user: {
    id: string
    name: string
    email: string
  }
}

const props = defineProps<Props>()
const emit = defineEmits<{
  edit: [id: string]
  delete: [id: string]
}>()
</script>

<template>
  <div class="user-card">
    <h3>{{ user.name }}</h3>
    <p>{{ user.email }}</p>
    <button @click="emit('edit', user.id)">Edit</button>
    <button @click="emit('delete', user.id)">Delete</button>
  </div>
</template>
```

### Pinia Store
```typescript
// stores/auth.ts
import { defineStore } from 'pinia'

interface User {
  id: string
  email: string
  name: string
}

export const useAuthStore = defineStore('auth', {
  state: () => ({
    user: null as User | null,
    token: null as string | null,
  }),
  
  getters: {
    isAuthenticated: (state) => !!state.token,
  },
  
  actions: {
    async login(email: string, password: string) {
      const { data } = await useFetch('/api/auth/login', {
        method: 'POST',
        body: { email, password }
      })
      this.user = data.value.user
      this.token = data.value.token
    },
    
    logout() {
      this.user = null
      this.token = null
    }
  },
  
  persist: true // Requires pinia-plugin-persistedstate
})
```

### Nuxt API Route
```typescript
// server/api/users/index.get.ts
import { prisma } from '~/server/utils/prisma'

export default defineEventHandler(async (event) => {
  const query = getQuery(event)
  
  const users = await prisma.user.findMany({
    take: Number(query.limit) || 20,
    skip: Number(query.offset) || 0,
  })
  
  return { success: true, data: users }
})
```

### Composable
```typescript
// composables/useApi.ts
export function useApi<T>(url: string) {
  const data = ref<T | null>(null)
  const error = ref<Error | null>(null)
  const loading = ref(false)

  const fetch = async () => {
    loading.value = true
    try {
      const response = await $fetch<T>(url)
      data.value = response
    } catch (e) {
      error.value = e as Error
    } finally {
      loading.value = false
    }
  }

  return { data, error, loading, fetch }
}
```

---

## 📊 WHEN TO USE

| Use Case | Recommendation |
|----------|----------------|
| Progressive enhancement | ✅ Vue excels |
| Team new to frameworks | ✅ Gentle learning curve |
| SSR/SSG needed | ✅ Nuxt is powerful |
| Large ecosystem needed | ⚠️ React has more libs |
| Finding developers | ⚠️ React has more devs |

---

**Reference for**: Fullstack, Frontend Agents
