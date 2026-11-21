# VoiceShop AI — Full-stack MVP

VoiceShop AI uchun React + Vite frontend, Express API va PostgreSQL ma'lumotlar bazasi.

## Talablar
- Node.js 20+
- Docker Desktop (PostgreSQL uchun) yoki alohida PostgreSQL serveri

## 1. PostgreSQL'ni ishga tushirish
Loyiha asosiy papkasida:
```bash
docker compose up -d
```

## 2. Backend
Yangi terminal:
```bash
cd server
npm install
copy .env.example .env
npx prisma generate
npx prisma migrate dev --name init
npm run dev
```
Windows PowerShell'da `copy .env.example .env` ishlaydi. Git Bash'da `cp .env.example .env` deb yozing.

Backend: http://localhost:4000
API health: http://localhost:4000/api/health

## 3. Frontend
Yana yangi terminal:
```bash
cd client
npm install
npm run dev
```
Frontend: http://localhost:5173

## 4. Birinchi kirish
Saytda "Hisob yaratish" orqali do'kon egasi hisobini yarating. Dastlab mahsulotlar, xodimlar, savdolar va xarajatlar bo'sh bo'ladi.

## Muhim
- Bu sinov uchun MVP. Real savdoda ishlatishdan oldin HTTPS, backup, email tasdiqlash, rate limit, audit log, to'lov integratsiyasi va xavfsizlik auditi kerak.
- AI/STT hozircha brauzerning SpeechRecognition API'si bilan demo qilinadi; o'zbek tilidagi tanish sifati brauzer va qurilmaga bog'liq.
- Xodimlar katalogi hozircha ma'lumot sifatida boshqariladi; xodimlarning alohida login/rol ruxsatlari keyingi bosqich.
