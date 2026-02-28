import express from "express";
import { createServer as createViteServer } from "vite";
import db from "./src/db.ts";
import { GoogleGenAI, Type } from "@google/genai";
import jwt from "jsonwebtoken";
import bcrypt from "bcryptjs";
import dotenv from "dotenv";

dotenv.config();

const JWT_SECRET = process.env.JWT_SECRET || "temple-finder-secret-key";

async function startServer() {
  const app = express();
  const PORT = 3000;

  app.use(express.json());

  // --- Auth Routes ---
  app.post("/api/auth/register", async (req, res) => {
    const { email, password, name } = req.body;
    const hashedPassword = await bcrypt.hash(password, 10);
    try {
      const stmt = db.prepare("INSERT INTO users (email, password, name) VALUES (?, ?, ?)");
      const info = stmt.run(email, hashedPassword, name);
      const token = jwt.sign({ userId: info.lastInsertRowid }, JWT_SECRET);
      res.json({ token, user: { id: info.lastInsertRowid, email, name } });
    } catch (e) {
      res.status(400).json({ error: "Email already exists" });
    }
  });

  app.post("/api/auth/login", async (req, res) => {
    const { email, password } = req.body;
    const user = db.prepare("SELECT * FROM users WHERE email = ?").get(email) as any;
    if (user && await bcrypt.compare(password, user.password)) {
      const token = jwt.sign({ userId: user.id }, JWT_SECRET);
      res.json({ token, user: { id: user.id, email: user.email, name: user.name } });
    } else {
      res.status(401).json({ error: "Invalid credentials" });
    }
  });

  // --- Temple Routes ---
  app.get("/api/temples", (req, res) => {
    const { city, type, lat, lng, radius = 10 } = req.query;
    let query = "SELECT * FROM temples WHERE 1=1";
    const params: any[] = [];

    if (city) {
      query += " AND city LIKE ?";
      params.push(`%${city}%`);
    }
    if (type) {
      const types = (type as string).split(",");
      query += ` AND type IN (${types.map(() => "?").join(",")})`;
      params.push(...types);
    }

    let temples = db.prepare(query).all(...params) as any[];

    // Simple Haversine distance filtering if lat/lng provided
    if (lat && lng) {
      const userLat = parseFloat(lat as string);
      const userLng = parseFloat(lng as string);
      const r = parseFloat(radius as string);

      temples = temples.filter(t => {
        const d = getDistance(userLat, userLng, t.lat, t.lng);
        t.distance = d;
        return d <= r;
      });
      temples.sort((a, b) => a.distance - b.distance);
    }

    res.json(temples);
  });

  app.get("/api/temples/:id", (req, res) => {
    const temple = db.prepare("SELECT * FROM temples WHERE id = ?").get(req.params.id);
    const reviews = db.prepare("SELECT r.*, u.name as user_name FROM reviews r JOIN users u ON r.user_id = u.id WHERE r.temple_id = ?").all(req.params.id);
    const events = db.prepare("SELECT * FROM events WHERE temple_id = ?").all(req.params.id);
    res.json({ ...temple, reviews, events });
  });

  app.post("/api/reviews", (req, res) => {
    const { temple_id, user_id, rating, comment } = req.body;
    const stmt = db.prepare("INSERT INTO reviews (temple_id, user_id, rating, comment) VALUES (?, ?, ?, ?)");
    stmt.run(temple_id, user_id, rating, comment);
    res.json({ success: true });
  });

  // --- AI Chat Route ---
  app.post("/api/chat", async (req, res) => {
    const { message, history, location } = req.body;
    const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY! });
    
    // Fetch relevant temples for context (RAG-ish)
    const allTemples = db.prepare("SELECT name, type, city, address, opening_hours FROM temples").all() as any[];
    const templeContext = allTemples.map(t => `${t.name} (${t.type}) in ${t.city}: ${t.address}. Hours: ${t.opening_hours}`).join("\n");

    try {
      const response = await ai.models.generateContent({
        model: "gemini-3-flash-preview",
        contents: [
          { role: "user", parts: [{ text: `You are a helpful Temple Finder Assistant. 
          Current User Location: ${location ? JSON.stringify(location) : "Unknown"}.
          Available Temples Data:
          ${templeContext}
          
          User Message: ${message}` }] }
        ],
        config: {
          systemInstruction: "Provide concise, helpful information about temples. If the user asks for temples near a location, use the provided data. If they ask for something not in the data, tell them you don't have that specific info but can help with what you have.",
        }
      });

      res.json({ text: response.text });
    } catch (error) {
      console.error(error);
      res.status(500).json({ error: "AI service error" });
    }
  });

  // Helper for distance
  function getDistance(lat1: number, lon1: number, lat2: number, lon2: number) {
    const R = 6371; // km
    const dLat = (lat2 - lat1) * Math.PI / 180;
    const dLon = (lon2 - lon1) * Math.PI / 180;
    const a = Math.sin(dLat / 2) * Math.sin(dLat / 2) +
      Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
      Math.sin(dLon / 2) * Math.sin(dLon / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    return R * c;
  }

  // Vite middleware for development
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    app.use(express.static("dist"));
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
}

startServer();
