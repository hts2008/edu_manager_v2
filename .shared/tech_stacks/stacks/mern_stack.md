# 📦 MERN STACK (MongoDB + Express + React + Node.js)
<!-- VI: Stack MERN cho ứng dụng full-stack JavaScript -->

> **Best for**: Rapid prototyping, JavaScript-first teams, real-time apps
> **Complexity**: Medium | **Community**: Very Large

---

## 🏗️ ARCHITECTURE

```
┌─────────────────────────────────────────┐
│         React / Next.js Frontend        │
│           (Vite or CRA)                 │
├─────────────────────────────────────────┤
│           Express.js Backend            │
│              (REST API)                 │
├─────────────────────────────────────────┤
│         Mongoose ODM Layer              │
├─────────────────────────────────────────┤
│            MongoDB Atlas                │
└─────────────────────────────────────────┘
```

---

## 📁 PROJECT STRUCTURE

```
project/
├── client/                      # React frontend
│   ├── src/
│   │   ├── components/
│   │   ├── pages/
│   │   ├── hooks/
│   │   ├── services/           # API calls
│   │   ├── store/              # Zustand/Redux
│   │   └── utils/
│   ├── package.json
│   └── vite.config.ts
├── server/                      # Express backend
│   ├── src/
│   │   ├── controllers/
│   │   ├── models/             # Mongoose models
│   │   ├── routes/
│   │   ├── middleware/
│   │   ├── services/
│   │   ├── utils/
│   │   └── app.ts
│   ├── package.json
│   └── tsconfig.json
├── shared/                      # Shared types
│   └── types/
├── docker-compose.yml
└── package.json                 # Workspace root
```

---

## ⚙️ KEY DEPENDENCIES

### Backend (server/package.json)
```json
{
  "dependencies": {
    "express": "^4.18.0",
    "mongoose": "^8.0.0",
    "cors": "^2.8.0",
    "helmet": "^7.0.0",
    "express-rate-limit": "^7.0.0",
    "jsonwebtoken": "^9.0.0",
    "bcryptjs": "^2.4.0",
    "zod": "^3.23.0",
    "dotenv": "^16.0.0"
  },
  "devDependencies": {
    "typescript": "^5.5.0",
    "@types/express": "^4.17.0",
    "@types/node": "^22.0.0",
    "tsx": "^4.0.0",
    "vitest": "^2.0.0"
  }
}
```

### Frontend (client/package.json)
```json
{
  "dependencies": {
    "react": "^19.0.0",
    "react-dom": "^19.0.0",
    "react-router-dom": "^6.0.0",
    "axios": "^1.7.0",
    "zustand": "^5.0.0",
    "@tanstack/react-query": "^5.0.0"
  }
}
```

---

## 🔧 MONGOOSE MODEL PATTERN

```typescript
// server/src/models/user.model.ts
import mongoose, { Schema, Document } from 'mongoose';
import bcrypt from 'bcryptjs';

export interface IUser extends Document {
  email: string;
  password: string;
  name: string;
  role: 'user' | 'admin';
  comparePassword(candidate: string): Promise<boolean>;
}

const userSchema = new Schema<IUser>({
  email: { 
    type: String, 
    required: true, 
    unique: true,
    lowercase: true,
    trim: true
  },
  password: { 
    type: String, 
    required: true,
    select: false  // Don't include by default
  },
  name: { 
    type: String, 
    required: true 
  },
  role: { 
    type: String, 
    enum: ['user', 'admin'],
    default: 'user'
  }
}, { 
  timestamps: true 
});

// Hash password before save
userSchema.pre('save', async function(next) {
  if (!this.isModified('password')) return next();
  this.password = await bcrypt.hash(this.password, 12);
  next();
});

// Compare password method
userSchema.methods.comparePassword = async function(candidate: string) {
  return bcrypt.compare(candidate, this.password);
};

export const User = mongoose.model<IUser>('User', userSchema);
```

---

## 📊 WHEN TO USE

| Use Case | Recommendation |
|----------|----------------|
| Rapid prototyping | ✅ Excellent |
| Real-time features | ✅ Great (Socket.io) |
| Flexible schemas | ✅ MongoDB shines |
| Complex transactions | ⚠️ Consider PostgreSQL |
| Heavy relations | ⚠️ Consider PostgreSQL |

---

**Reference for**: Fullstack, Backend, Frontend Agents
