import express from "express";
import dotenv from "dotenv";
import path from "path";
import { fileURLToPath } from "url";
import { connectDB } from "./lib/db.js";
import authRoutes from "./routes/auth.route.js";
import productRoutes from "./routes/store/product.route.js";
import cartRoutes from "./routes/store/cart.route.js";
import orderRoutes from "./routes/store/order.route.js";
import categoryRoutes from "./routes/store/category.route.js";
import admin_productRoutes from "./routes/dashboard/product.route.js";
import admin_categoryRoutes from "./routes/dashboard/category.route.js";
import userRoutes from "./routes/user.route.js";
import cookieParser from "cookie-parser";
import { EventEmitter } from "events";
import bodyParser from "body-parser";

import cors from "cors";
EventEmitter.defaultMaxListeners = 20;

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

dotenv.config({ path: path.join(__dirname, ".env") });

const app = express();
const PORT = process.env.PORT || 3001;
app.use(bodyParser.json({ limit: "20mb" }));
app.use(bodyParser.urlencoded({ extended: true, limit: "20mb" }));
app.use(express.json());
app.use(cookieParser());
const allowedOrigins = [
  "http://localhost:3000",
  "http://localhost:3002",
  "https://vexa-dashboard.vercel.app",
  "https://vexa-store.vercel.app",
];

app.use(
  cors({
    origin: function (origin, callback) {
      if (!origin || allowedOrigins.includes(origin)) {
        callback(null, true);
      } else {
        callback(new Error("Not allowed by CORS"));
      }
    },
    credentials: true,
    methods: ["GET", "POST", "PUT", "DELETE", "PATCH", "OPTIONS"],
    allowedHeaders: ["Content-Type", "Authorization"],
  })
);
app.options("*", cors());

// routes
app.use("/api/auth", authRoutes);
app.use("/api/users", userRoutes);
app.use("/api/products", productRoutes);
app.use("/api/categories", categoryRoutes);
app.use("/api/cart", cartRoutes);
app.use("/api/orders", orderRoutes);
app.use("/api/dashboard/products", admin_productRoutes);
app.use("/api/dashboard/categories", admin_categoryRoutes);

// Error handling middleware
app.use((err, req, res, next) => {
  console.error("global error:", err);
  res.status(500).json({ status: "error", message: "Internal Server Error" });
});

const startApp = async () => {
  try {
    await connectDB();
    app.listen(PORT, () => {
      console.log("Server is running on port", PORT);
    });
  } catch (error) {
    console.error("Failed to start server:", error);
    process.exit(1);
  }
};

startApp();
