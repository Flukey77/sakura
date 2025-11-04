# ---------- deps ----------
# Stage 1: ติดตั้ง dependencies
FROM node:20-alpine AS deps
WORKDIR /app
COPY package*.json ./
# ใช้ npm install ให้ทนทานกว่าเมื่อ lockfile มีความเบี้ยว
RUN npm install --no-audit --no-fund

# ---------- build ----------
# Stage 2: Build แอป
FROM node:20-alpine AS builder
WORKDIR /app
ENV NEXT_TELEMETRY_DISABLED=1
# ดึง node_modules จาก stage ก่อนหน้า
COPY --from=deps /app/node_modules ./node_modules
# คัดลอกโค้ดทั้งหมดของแอป (รวม prisma ในโฟลเดอร์นี้ด้วย)
COPY . .
# ไลบรารีที่ Prisma engine ต้องใช้บน Alpine
RUN apk add --no-cache libc6-compat openssl
# generate client จาก prisma ในโฟลเดอร์นี้
RUN npx prisma generate --schema=./prisma/schema.prisma
# build Next.js
RUN npm run build

# ---------- run ----------
# Stage 3: รันแอป
FROM node:20-alpine AS runner
WORKDIR /app
ENV NODE_ENV=production
ENV PORT=3000
ENV AUTH_TRUST_HOST=true

# runtime deps ของ Prisma
RUN apk add --no-cache libc6-compat openssl

# คัดลอกผล build + ไฟล์ที่ต้องใช้ตอนรัน
COPY --from=builder /app/.next ./.next
COPY --from=builder /app/public ./public
COPY --from=builder /app/package*.json ./
COPY --from=builder /app/node_modules ./node_modules
# สำคัญ: คัดลอก prisma (รวม schema/migrations) มาด้วย
COPY --from=builder /app/prisma ./prisma

EXPOSE 3000

# รัน migrate deploy ก่อน แล้วค่อย start (ใช้ schema ภายในโฟลเดอร์นี้)
CMD sh -c "npx prisma migrate deploy --schema=./prisma/schema.prisma && npm run start"
