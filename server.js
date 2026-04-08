import express from "express";
import path from "path";
import { fileURLToPath } from "url";
import { dirname } from "path";
import fs from "fs";
import multer from "multer";
import { marked } from "marked";

const app = express();

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(express.static(path.join(__dirname, "public")));

const PORT = process.env.PORT || 3000;
const NOTES_FILE = path.join(__dirname, "notes.json");
const upload = multer({ dest: "uploads/" });

if (!fs.existsSync(NOTES_FILE)) {
    fs.writeFileSync(NOTES_FILE, "[]");
}

app.get("/api/notes", (req, res) => {
    const { username } = req.query;
    if (!username) {
        return res.status(400).json({ message: "username required" });
    }
    let data;
    try {
        data = JSON.parse(fs.readFileSync(NOTES_FILE));
    } catch (err) {
        return res.status(500).json({ message: "Server error" });
    }
    const userNotes = data.filter((note) => note.username === username);
    res.json(userNotes);
});

app.post("/api/notes", (req, res) => {
    const { username, title, content } = req.body;
    if (!username || !content) {
        return res.status(400).json({ message: "Missing fields" });
    }
    let data;
    try {
        data = JSON.parse(fs.readFileSync(NOTES_FILE));
    } catch (err) {
        return res.status(500).json({ message: "Server error" });
    }

    const newNote = {
        id: Date.now().toString(),
        username,
        title,
        content,
        date: new Date().toISOString(),
    };

    data.push(newNote);
    fs.writeFileSync(NOTES_FILE, JSON.stringify(data, null, 2));
    res.status(201).json({ message: "Note created" });
});

app.put("/api/notes/:id", (req, res) => {
    const { id } = req.params;
    const { title, content } = req.body;

    if (!title && !content) {
        return res.status(400).json({ message: "Nothing to update" });
    }

    let data;
    try {
        data = JSON.parse(fs.readFileSync(NOTES_FILE));
    } catch (err) {
        return res.status(500).json({ message: "Server error" });
    }
    const index = data.findIndex((note) => note.id === id);

    if (index === -1) {
        return res.status(404).json({ message: "Note not found" });
    }
    data[index].title = title;
    data[index].content = content;

    fs.writeFileSync(NOTES_FILE, JSON.stringify(data, null, 2));
    res.json({ message: "Note updated" });
});

app.post("/api/upload", upload.single("file"), (req, res) => {
    if (!req.file) {
        return res.status(400).json({ message: "No file uploaded" });
    }

    const filePath = req.file.path;
    try {
        const markdown = fs.readFileSync(filePath, "utf-8");
        const html = marked(markdown);

        fs.unlinkSync(filePath);

        res.json({ html });
    } catch (err) {
        return res.status(500).json({ message: "Server error" });
    }
});

app.listen(PORT, () => console.log(`Server is running on port ${PORT}`));
