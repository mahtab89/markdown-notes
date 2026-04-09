document.addEventListener("DOMContentLoaded", () => {
    // --- Elements ---

    // Views
    const viewLogin = document.getElementById("login-view");
    const viewDashboard = document.getElementById("dashboard-view");
    const viewEditor = document.getElementById("editor-view");
    const views = [viewLogin, viewDashboard, viewEditor];

    // Login
    const formLogin = document.getElementById("login-form");
    const inputUsername = document.getElementById("username-input");

    // Dashboard
    const msgWelcome = document.getElementById("welcome-message");
    const btnLogout = document.getElementById("logout-btn");
    const stateEmpty = document.getElementById("empty-state");
    const gridNotes = document.getElementById("notes-grid");
    const fabCreate = document.getElementById("fab-create-note");

    // Editor
    const btnBack = document.getElementById("btn-back");
    const btnSave = document.getElementById("btn-save");
    const inputTitle = document.getElementById("note-title");
    const textareaMd = document.getElementById("markdown-textarea");
    const inputUpload = document.getElementById("file-upload");
    const tabEdit = document.getElementById("btn-tab-edit");
    const tabPreview = document.getElementById("btn-tab-preview");
    const htmlPreview = document.getElementById("html-preview");

    // Toast
    const containerToast = document.getElementById("toast-container");

    // --- State ---
    let currentUser = null;
    let notes = []; // Array of { id, title, content, date }
    let currentEditNoteId = null;
    let editorMode = "edit";

    // --- Helper Functions ---

    function showView(viewToShow) {
        views.forEach((v) => {
            if (v === viewToShow) {
                v.classList.remove("hidden");
                v.classList.add("active");
            } else {
                v.classList.add("hidden");
                v.classList.remove("active");
            }
        });
    }

    function setEditorMode(mode) {
        editorMode = mode;
        if (mode === "edit") {
            tabEdit.classList.add("active");
            tabPreview.classList.remove("active");
            textareaMd.classList.remove("hidden");
            htmlPreview.classList.add("hidden");
        } else {
            tabPreview.classList.add("active");
            tabEdit.classList.remove("active");
            htmlPreview.classList.remove("hidden");
            textareaMd.classList.add("hidden");
        }
    }

    function showToast(message, icon = "ph-check-circle") {
        const toast = document.createElement("div");
        toast.className = "toast";
        toast.innerHTML = `<i class="ph ${icon}"></i> <span>${message}</span>`;
        containerToast.appendChild(toast);

        // Remove after 3 seconds
        setTimeout(() => {
            toast.classList.add("removing");

            setTimeout(() => {
                toast.remove();
            }, 300);
        }, 3000);
    }

    function getStorageKey() {
        return `mkdown_notes_${currentUser}`;
    }

    async function loadNotes() {
        if (!currentUser) return;

        gridNotes.innerHTML = "<p>Loading notes...</p>";
        const res = await fetch(`/api/notes?username=${currentUser}`);
        if (!res.ok) {
            showToast("Failed to load notes", "ph-warning-circle");
            return;
        }
        notes = await res.json();

        renderNotes();
    }

    function saveNotes() {
        renderNotes();
    }

    function renderNotes() {
        gridNotes.innerHTML = "";

        if (notes.length === 0) {
            stateEmpty.classList.remove("hidden");
            gridNotes.style.display = "none";
        } else {
            stateEmpty.classList.add("hidden");
            gridNotes.style.display = "grid";

            const sortedNotes = [...notes].sort(
                (a, b) => new Date(b.date) - new Date(a.date),
            );

            sortedNotes.forEach((note) => {
                const card = document.createElement("div");
                card.className = "note-card";

                const formattedDate = new Intl.DateTimeFormat("en-US", {
                    month: "short",
                    day: "numeric",
                    year: "numeric",
                }).format(new Date(note.date));

                // 🔥 Convert markdown → HTML
                const preview = note.content.slice(0, 150);
                const htmlContent = marked.parse(preview);

                card.innerHTML = `
                <h3>${note.title || "Untitled Note"}</h3>

                <div class="note-preview">
                    ${htmlContent}
                </div>

                <div class="note-meta">
                    <span>${formattedDate}</span>
                    <span><i class="ph ph-text-align-left"></i> ${note.content.length} chars</span>
                </div>
            `;

                card.addEventListener("click", () => {
                    openEditor(note);
                });

                gridNotes.appendChild(card);
            });
        }
    }

    function initApp() {
        const savedUser = localStorage.getItem("mkdown_currentUser");
        if (savedUser) {
            currentUser = savedUser;
            msgWelcome.textContent = `Hello, ${currentUser}`;
            loadNotes();
            showView(viewDashboard);
        } else {
            showView(viewLogin);
            inputUsername.focus();
        }
    }

    function openEditor(noteToEdit = null) {
        if (noteToEdit) {
            currentEditNoteId = noteToEdit.id;
            inputTitle.value = noteToEdit.title;
            textareaMd.value = noteToEdit.content;
        } else {
            currentEditNoteId = null;
            inputTitle.value = "";
            textareaMd.value = "";
        }
        setEditorMode("edit");
        showView(viewEditor);
        if (editorMode === "edit") textareaMd.focus();
    }

    // --- Event Listeners ---

    // Login
    formLogin.addEventListener("submit", (e) => {
        e.preventDefault();
        const username = inputUsername.value.trim();
        if (!username) {
            showToast("Enter username", "ph-warning-circle");
            return;
        }
        currentUser = username;
        localStorage.setItem("mkdown_currentUser", currentUser);
        msgWelcome.textContent = `Hello, ${currentUser}`;
        loadNotes();
        showToast("Logged in successfully");
        showView(viewDashboard);
    });

    // Logout
    btnLogout.addEventListener("click", () => {
        currentUser = null;
        localStorage.removeItem("mkdown_currentUser");
        inputUsername.value = "";
        showToast("Logged out");
        showView(viewLogin);
    });

    // Dashboard FAB
    fabCreate.addEventListener("click", () => {
        openEditor();
    });

    // Editor Back
    btnBack.addEventListener("click", () => {
        showView(viewDashboard);
    });

    // Editor Save
    btnSave.addEventListener("click", async () => {
        const title = inputTitle.value.trim();
        const content = textareaMd.value.trim();

        if (!content && !title) {
            showToast("Cannot save an empty note", "ph-warning-circle");
            return;
        }

        if (currentEditNoteId) {
            await fetch(`/api/notes/${currentEditNoteId}`, {
                method: "PUT",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ title, content }),
            });
        } else {
            await fetch(`/api/notes`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    username: currentUser,
                    title,
                    content,
                }),
            });
        }

        await loadNotes();
        showToast("Note saved successfully");
        showView(viewDashboard);
    });

    // File Upload Handler (Simulating Backend HTML Response)
    inputUpload.addEventListener("change", async (e) => {
        const file = e.target.files[0];
        if (!file) return;

        if (!file.name.endsWith(".md")) {
            showToast("Invalid file", "ph-warning-circle");
            return;
        }

        showToast("Uploading...", "ph-spinner-gap ph-spin");

        const formData = new FormData();
        formData.append("file", file);

        const res = await fetch("/api/upload", {
            method: "POST",
            body: formData,
        });
        if (!res.ok) {
            showToast("Upload failed", "ph-warning-circle");
            return;
        }
        const data = await res.json();
        const text = await file.text();

        textareaMd.value = text;
        htmlPreview.innerHTML = data.html;

        if (!inputTitle.value) {
            inputTitle.value = file.name.replace(/\.md$/i, "");
        }

        setEditorMode("preview");
        showToast("Upload success");

        inputUpload.value = "";
    });

    // Editor Tabs logic
    async function fetchParseMarkdown(markdown) {
        const res = await fetch("/api/upload", {
            method: "POST",
            body: (() => {
                const formData = new FormData();
                const blob = new Blob([markdown], { type: "text/markdown" });
                formData.append("file", blob, "temp.md");
                return formData;
            })(),
        });
        if (!res.ok) {
            showToast("Upload failed", "ph-warning-circle");
            return;
        }
        const data = await res.json();
        return data.html;
    }

    tabEdit.addEventListener("click", () => setEditorMode("edit"));
    tabPreview.addEventListener("click", async () => {
        let raw = textareaMd.value;

        const html = await fetchParseMarkdown(raw);
        htmlPreview.innerHTML = html;

        setEditorMode("preview");
    });

    // Bootstrap
    initApp();
});
