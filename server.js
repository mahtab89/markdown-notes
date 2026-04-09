import express from "express";
import path from "path";
import { fileURLToPath } from "url";
import { dirname } from "path";
import multer from "multer";
import { marked } from "marked";
import mongoose from "mongoose";
import dotenv from "dotenv";
import fs from "fs";

const app = express();
dotenv.config();

const MDB_USERNAME = process.env.MONGODB_USERNAME;
const MDB_PASSWORD = process.env.MONGODB_PASSWORD;

const MDB_URL = `mongodb://${MDB_USERNAME}:${MDB_PASSWORD}@ac-vwteees-shard-00-00.xfvqlud.mongodb.net:27017,ac-vwteees-shard-00-01.xfvqlud.mongodb.net:27017,ac-vwteees-shard-00-02.xfvqlud.mongodb.net:27017/?ssl=true&replicaSet=atlas-c6v7zj-shard-0&authSource=admin&appName=mdnotescluster`;

mongoose
  .connect(MDB_URL)
  .then(() => console.log("MongoDB Connected"))
  .catch((err) => console.log(err));

// Path Setup
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Middleware
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(express.static(path.join(__dirname, "public")));

// Config
const PORT = process.env.PORT || 3000;
const upload = multer({ dest: "uploads/" });

// Schema
const noteSchema = new mongoose.Schema({
  username: String,
  title: String,
  content: String,
  date: String,
});

noteSchema.set("toJSON", {
  transform: (doc, ret) => {
    ret.id = ret._id;
    delete ret._id;
    delete ret.__v;
  },
});

const Note = mongoose.model("Note", noteSchema);

// Routes

// GET notes
app.get("/api/notes", async (req, res) => {
  const { username } = req.query;

  if (!username) {
    return res.status(400).json({ message: "username required" });
  }

  try {
    const notes = await Note.find({ username }).sort({ date: -1 });
    res.json(notes); // now returns id instead of _id
  } catch (err) {
    res.status(500).json({ message: "Server error" });
  }
});

// CREATE note
app.post("/api/notes", async (req, res) => {
  const { username, title, content } = req.body;

  if (!username || !content) {
    return res.status(400).json({ message: "Missing fields" });
  }

  try {
    const newNote = await Note.create({
      username,
      title,
      content,
      date: new Date().toISOString(),
    });

    res.status(201).json(newNote); // already transformed
  } catch (err) {
    res.status(500).json({ message: "Server error" });
  }
});

// UPDATE note
app.put("/api/notes/:id", async (req, res) => {
  const { id } = req.params;
  const { title, content } = req.body;

  if (!title && !content) {
    return res.status(400).json({ message: "Nothing to update" });
  }

  try {
    const updated = await Note.findByIdAndUpdate(
      id,
      { title, content, date: new Date().toISOString() },
      { new: true }
    );

    if (!updated) {
      return res.status(404).json({ message: "Note not found" });
    }

    res.json(updated); // also transformed
  } catch (err) {
    res.status(500).json({ message: "Server error" });
  }
});

// Upload Markdown
app.post("/api/upload", upload.single("file"), (req, res) => {
  if (!req.file) {
    return res.status(400).json({ message: "No file uploaded" });
  }

  try {
    const markdown = fs.readFileSync(req.file.path, "utf-8");
    const html = marked(markdown);

    fs.unlinkSync(req.file.path);

    res.json({ html });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Server error" });
  }
});

// export Server
export default app;
