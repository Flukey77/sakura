# ---------- deps ----------
# Stage 1: Cài đặt dependencies
FROM node:20-alpine AS deps
WORKDIR /app
COPY package*.json ./
# Dùng npm ci để cài đặt dependencies chính xác từ package-lock.json
RUN npm ci

# ---------- build ----------
# Stage 2: Build ứng dụng
FROM node:20-alpine AS builder
WORKDIR /app
ENV NEXT_TELEMETRY_DISABLED=1
COPY --from=deps /app/node_modules ./node_modules
COPY . .

# Cài đặt các thư viện cần thiết cho Prisma (như openssl)
RUN apk add --no-cache libc6-compat openssl
# Chạy prisma generate để tạo client
RUN npx prisma generate
# Build ứng dụng Next.js
RUN npm run build

# ---------- run ----------
# Stage 3: Chạy ứng dụng
FROM node:20-alpine AS runner
WORKDIR /app
ENV NODE_ENV=production
ENV PORT=3000
# Giữ lại ENV này từ Dockerfile gốc của bạn
ENV AUTH_TRUST_HOST=true

# Cài đặt các thư viện runtime cần thiết cho Prisma Engine
RUN apk add --no-cache libc6-compat openssl

# Sao chép các file đã build từ stage 'builder'
COPY --from=builder /app/.next ./.next
COPY --from=builder /app/public ./public
COPY --from=builder /app/package*.json ./
COPY --from=builder /app/node_modules ./node_modules

# !! สำคัญ: คัดลอก schema และ migrations ของ Prisma ไปด้วย
# เพื่อให้คำสั่ง 'migrate deploy' ทำงานได้
COPY --from=builder /app/prisma ./prisma

EXPOSE 3000

# นี่คือ CMD ที่คุณขอ: รัน migrate deploy ก่อน แล้วค่อย start app
CMD sh -c "npx prisma migrate deploy && npm run start"

