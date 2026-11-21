import "dotenv/config";
import express from "express";
import cors from "cors";
import helmet from "helmet";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import { PrismaClient } from "@prisma/client";
import { z } from "zod";

const prisma = new PrismaClient();
const app = express();
app.use(helmet());
app.use(cors({ origin: process.env.CLIENT_ORIGIN || "http://localhost:5173" }));
app.use(express.json({ limit: "1mb" }));

const PORT = Number(process.env.PORT || 4000);
const JWT_SECRET = process.env.JWT_SECRET;
if (!JWT_SECRET || JWT_SECRET.includes("replace-this")) {
  console.warn("WARNING: server/.env ichida JWT_SECRET qiymatini almashtiring.");
}

const asyncRoute = fn => (req, res, next) => Promise.resolve(fn(req, res, next)).catch(next);
const tokenFor = user => jwt.sign(
  { userId: user.id, storeId: user.storeId, role: user.role },
  JWT_SECRET || "local-development-only-secret",
  { expiresIn: "12h" }
);

function auth(req, res, next) {
  const token = req.headers.authorization?.replace(/^Bearer\s+/i, "");
  if (!token) return res.status(401).json({ message: "Tizimga kiring." });
  try {
    req.auth = jwt.verify(token, JWT_SECRET || "local-development-only-secret");
    next();
  } catch {
    return res.status(401).json({ message: "Sessiya tugagan. Qayta kiring." });
  }
}

const registerSchema = z.object({
  name: z.string().trim().min(2).max(80),
  storeName: z.string().trim().min(2).max(100),
  email: z.string().trim().email().max(160),
  password: z.string().min(8).max(100)
});
app.get("/api/health", (req, res) => res.json({ status: "ok", service: "VoiceShop AI API" }));

app.post("/api/auth/register", asyncRoute(async (req, res) => {
  const parsed = registerSchema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ message: parsed.error.issues[0].message });
  const { name, storeName, email, password } = parsed.data;
  const exists = await prisma.user.findUnique({ where: { email } });
  if (exists) return res.status(409).json({ message: "Bu email allaqachon ro‘yxatdan o‘tgan." });
  const passwordHash = await bcrypt.hash(password, 12);
  const user = await prisma.$transaction(async tx => {
    const store = await tx.store.create({ data: { name: storeName } });
    return tx.user.create({ data: { name, email, passwordHash, storeId: store.id } });
  });
  res.status(201).json({
    token: tokenFor(user),
    user: { id: user.id, name: user.name, email: user.email, role: user.role, storeId: user.storeId }
  });
}));

app.post("/api/auth/login", asyncRoute(async (req, res) => {
  const email = String(req.body.email || "").trim();
  const password = String(req.body.password || "");
  const user = await prisma.user.findUnique({ where: { email } });
  if (!user || !(await bcrypt.compare(password, user.passwordHash))) {
    return res.status(401).json({ message: "Email yoki parol noto‘g‘ri." });
  }
  res.json({
    token: tokenFor(user),
    user: { id: user.id, name: user.name, email: user.email, role: user.role, storeId: user.storeId }
  });
}));

app.get("/api/auth/me", auth, asyncRoute(async (req, res) => {
  const user = await prisma.user.findFirst({
    where: { id: req.auth.userId, storeId: req.auth.storeId },
    include: { store: true }
  });
  if (!user) return res.status(404).json({ message: "Foydalanuvchi topilmadi." });
  res.json({ id: user.id, name: user.name, email: user.email, role: user.role, store: user.store });
}));

app.use("/api", auth);

const productSchema = z.object({
  name: z.string().trim().min(1).max(120),
  category: z.string().trim().max(80).optional(),
  sku: z.string().trim().max(60).optional().nullable(),
  unit: z.string().trim().max(20).default("dona"),
  price: z.coerce.number().nonnegative(),
  cost: z.coerce.number().nonnegative().default(0),
  stock: z.coerce.number().nonnegative().default(0),
  minStock: z.coerce.number().nonnegative().default(0)
});
const employeeSchema = z.object({
  name: z.string().trim().min(2).max(100),
  email: z.string().trim().email().optional().or(z.literal("")),
  phone: z.string().trim().max(30).optional(),
  position: z.string().trim().max(60).default("Sotuvchi"),
  salary: z.coerce.number().nonnegative().optional()
});
const expenseSchema = z.object({
  title: z.string().trim().min(2).max(120),
  category: z.string().trim().max(60).default("Boshqa"),
  amount: z.coerce.number().positive(),
  note: z.string().trim().max(500).optional()
});

app.get("/api/products", asyncRoute(async (req, res) => {
  const rows = await prisma.product.findMany({ where: { storeId: req.auth.storeId }, orderBy: { createdAt: "desc" } });
  res.json(rows);
}));
app.post("/api/products", asyncRoute(async (req, res) => {
  const parsed = productSchema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ message: parsed.error.issues[0].message });
  const row = await prisma.product.create({ data: { ...parsed.data, storeId: req.auth.storeId } });
  res.status(201).json(row);
}));
app.put("/api/products/:id", asyncRoute(async (req, res) => {
  const parsed = productSchema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ message: parsed.error.issues[0].message });
  const found = await prisma.product.findFirst({ where: { id: req.params.id, storeId: req.auth.storeId } });
  if (!found) return res.status(404).json({ message: "Mahsulot topilmadi." });
  res.json(await prisma.product.update({ where: { id: found.id }, data: parsed.data }));
}));
app.delete("/api/products/:id", asyncRoute(async (req, res) => {
  const found = await prisma.product.findFirst({ where: { id: req.params.id, storeId: req.auth.storeId } });
  if (!found) return res.status(404).json({ message: "Mahsulot topilmadi." });
  const used = await prisma.saleItem.count({ where: { productId: found.id } });
  if (used) return res.status(409).json({ message: "Savdoda ishlatilgan mahsulotni o‘chirish mumkin emas. Uni katalogdan yashirish funksiyasi keyin qo‘shiladi." });
  await prisma.product.delete({ where: { id: found.id } });
  res.json({ message: "Mahsulot o‘chirildi." });
}));

app.get("/api/employees", asyncRoute(async (req, res) => {
  res.json(await prisma.employee.findMany({ where: { storeId: req.auth.storeId }, orderBy: { createdAt: "desc" } }));
}));
app.post("/api/employees", asyncRoute(async (req, res) => {
  const parsed = employeeSchema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ message: parsed.error.issues[0].message });
  const data = parsed.data;
  res.status(201).json(await prisma.employee.create({
    data: { name: data.name, email: data.email || null, phone: data.phone || null, position: data.position, salary: data.salary ?? null, storeId: req.auth.storeId }
  }));
}));
app.delete("/api/employees/:id", asyncRoute(async (req, res) => {
  const found = await prisma.employee.findFirst({ where: { id: req.params.id, storeId: req.auth.storeId } });
  if (!found) return res.status(404).json({ message: "Xodim topilmadi." });
  await prisma.employee.delete({ where: { id: found.id } });
  res.json({ message: "Xodim o‘chirildi." });
}));

app.get("/api/expenses", asyncRoute(async (req, res) => {
  res.json(await prisma.expense.findMany({ where: { storeId: req.auth.storeId }, orderBy: { createdAt: "desc" } }));
}));
app.post("/api/expenses", asyncRoute(async (req, res) => {
  const parsed = expenseSchema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ message: parsed.error.issues[0].message });
  res.status(201).json(await prisma.expense.create({ data: { ...parsed.data, storeId: req.auth.storeId } }));
}));
app.delete("/api/expenses/:id", asyncRoute(async (req, res) => {
  const found = await prisma.expense.findFirst({ where: { id: req.params.id, storeId: req.auth.storeId } });
  if (!found) return res.status(404).json({ message: "Xarajat topilmadi." });
  await prisma.expense.delete({ where: { id: found.id } });
  res.json({ message: "Xarajat o‘chirildi." });
}));

app.get("/api/sales", asyncRoute(async (req, res) => {
  const rows = await prisma.sale.findMany({
    where: { storeId: req.auth.storeId },
    include: { items: { include: { product: { select: { name: true, unit: true } } } } },
    orderBy: { createdAt: "desc" },
    take: 100
  });
  res.json(rows);
}));
app.post("/api/sales", asyncRoute(async (req, res) => {
  const schema = z.object({
    paymentType: z.enum(["CASH", "CARD", "TRANSFER"]).default("CASH"),
    note: z.string().max(500).optional(),
    items: z.array(z.object({ productId: z.string(), quantity: z.coerce.number().positive() })).min(1)
  });
  const parsed = schema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ message: parsed.error.issues[0].message });
  const storeId = req.auth.storeId;
  const result = await prisma.$transaction(async tx => {
    let total = 0;
    const prepared = [];
    for (const item of parsed.data.items) {
      const product = await tx.product.findFirst({ where: { id: item.productId, storeId } });
      if (!product) throw Object.assign(new Error("Savdodagi mahsulot topilmadi."), { status: 400 });
      const price = Number(product.price);
      if (Number(product.stock) < item.quantity) {
        throw Object.assign(new Error(`${product.name}: omborda yetarli qoldiq yo‘q.`), { status: 400 });
      }
      const lineTotal = price * item.quantity;
      total += lineTotal;
      prepared.push({ product, quantity: item.quantity, price, lineTotal });
    }
    const sale = await tx.sale.create({
      data: {
        storeId, total, paymentType: parsed.data.paymentType, note: parsed.data.note,
        items: { create: prepared.map(x => ({
          productId: x.product.id, quantity: x.quantity, unitPrice: x.price, lineTotal: x.lineTotal
        })) }
      },
      include: { items: { include: { product: { select: { name: true, unit: true } } } } }
    });
    for (const item of prepared) {
      await tx.product.update({
        where: { id: item.product.id },
        data: { stock: { decrement: item.quantity } }
      });
    }
    return sale;
  });
  res.status(201).json(result);
}));

app.get("/api/dashboard", asyncRoute(async (req, res) => {
  const storeId = req.auth.storeId;
  const [sales, products, productRows, employees, expenses] = await Promise.all([
    prisma.sale.findMany({ where: { storeId, createdAt: { gte: new Date(new Date().setHours(0,0,0,0)) } }, select: { total: true } }),
    prisma.product.count({ where: { storeId } }),
    prisma.product.findMany({ where: { storeId }, select: { stock: true, minStock: true } }),
    prisma.employee.count({ where: { storeId } }),
    prisma.expense.findMany({ where: { storeId, createdAt: { gte: new Date(new Date().setHours(0,0,0,0)) } }, select: { amount: true } })
  ]);
  const revenue = sales.reduce((sum, s) => sum + Number(s.total), 0);
  const expenseTotal = expenses.reduce((sum, e) => sum + Number(e.amount), 0);
  const lowStockCount = productRows.filter(p => Number(p.stock) <= Number(p.minStock)).length;
  res.json({ revenue, expenseTotal, estimatedGross: revenue - expenseTotal, salesCount: sales.length, productCount: products, employeeCount: employees, lowStockCount });
}));

app.use((err, req, res, next) => {
  console.error(err);
  const status = err.status || (err.code === "P2002" ? 409 : 500);
  res.status(status).json({ message: status === 500 ? "Serverda xatolik yuz berdi." : err.message });
});
app.listen(PORT, () => console.log(`VoiceShop API: http://localhost:${PORT}`));
