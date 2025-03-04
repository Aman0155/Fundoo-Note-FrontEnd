document.addEventListener("DOMContentLoaded", function () {
    const noteInitialInput = document.getElementById("noteInitialInput");
    const noteTitleInput = document.getElementById("noteTitleInput");
    const noteInput = document.getElementById("noteInput");
    const notesGrid = document.querySelector(".fundoo-dash-notes-grid");
    const noteExpanded = document.querySelector(".note-expanded");
    const closeNoteButton = document.getElementById("closeNoteButton");
    const modalNoteTitle = document.getElementById("modalNoteTitle");
    const modalNoteContent = document.getElementById("modalNoteContent");
    const noteModal = new bootstrap.Modal(document.getElementById("noteModal"));
    const jwtToken = localStorage.getItem("jwtToken");
    const menuIcon = document.getElementById("menuIcon");
    const sidebar = document.querySelector(".fundoo-dash-sidebar");
    const mainContent = document.querySelector(".fundoo-dash-main-content");
    const searchInput = document.getElementById("searchInput");
    const profileButton = document.getElementById("profileButton");
    const profileDropdown = document.getElementById("profileDropdown");
    const headerTitle = document.getElementById("headerTitle");
    let currentView = "notes";
    let allNotes = []; // Added for search functionality

    // --- c2’s Existing Logic (Unchanged) ---
    if (!jwtToken) {
        alert("You must be logged in to create and view notes.");
        return;
    }

    fetchNotes();

    document.getElementById("notesTab").addEventListener("click", function () {
        currentView = "notes";
        fetchNotes();
        updateSidebarAndHeader();
    });

    document.getElementById("archiveTab").addEventListener("click", function () {
        currentView = "archive";
        fetchNotes();
        updateSidebarAndHeader();
    });

    document.getElementById("trashTab").addEventListener("click", function () {
        currentView = "trash";
        fetchNotes();
        updateSidebarAndHeader();
    });

    // --- c1’s Added Functionalities ---
    // Profile Setup (from c1)
    const userName = localStorage.getItem("userName") || "User Name";
    const userEmail = localStorage.getItem("userEmail") || "user@example.com";
    if (userName) document.getElementById("profileName").textContent = `Hi, ${userName}`;
    if (userEmail) {
        document.getElementById("profileEmail").textContent = userEmail;
        const emailInitial = userEmail.charAt(0).toUpperCase();
        document.getElementById("profileButton").textContent = emailInitial;
        document.getElementById("profileAvatar").textContent = emailInitial;
    }

    profileButton.addEventListener("click", function (event) {
        event.stopPropagation();
        profileDropdown.style.display = profileDropdown.style.display === "block" ? "none" : "block";
    });

    document.addEventListener("click", function (event) {
        if (!profileDropdown.contains(event.target) && event.target !== profileButton) {
            profileDropdown.style.display = "none";
        }
    });

    document.getElementById("logoutButton").addEventListener("click", function () {
        localStorage.removeItem("jwtToken");
        localStorage.removeItem("userEmail");
        localStorage.removeItem("userName");
        window.location.href = "../pages/fundooLogin.html";
    });

    // Sidebar Toggle (from c1)
    menuIcon.addEventListener("click", function () {
        const isMobile = window.innerWidth <= 768;
        if (isMobile) {
            sidebar.classList.toggle("active");
            mainContent.classList.toggle("shifted");
        } else {
            sidebar.classList.toggle("compact");
        }
    });

    document.addEventListener("click", function (event) {
        const isMobile = window.innerWidth <= 768;
        if (isMobile && !sidebar.contains(event.target) && !menuIcon.contains(event.target) && sidebar.classList.contains("active")) {
            sidebar.classList.remove("active");
            mainContent.classList.remove("shifted");
        }
    });

    window.addEventListener("resize", function () {
        const isMobile = window.innerWidth <= 768;
        if (!isMobile && sidebar.classList.contains("active")) {
            sidebar.classList.remove("active");
            mainContent.classList.remove("shifted");
        }
    });

    // Note Creation (from c1)
    noteInitialInput.addEventListener("click", function (event) {
        if (currentView === "notes") {
            noteInitialInput.style.display = "none";
            noteExpanded.style.display = "block";
            noteTitleInput.focus();
            document.addEventListener("click", handleOutsideClick);
        }
    });

    function handleOutsideClick(event) {
        if (!noteExpanded.contains(event.target) && event.target !== noteInitialInput) {
            const title = noteTitleInput.value.trim();
            const content = noteInput.value.trim();
            if (title || content) {
                saveNote(content); // Using c2’s saveNote, title support added below
            }
            noteTitleInput.value = "";
            noteInput.value = "";
            noteExpanded.style.display = "none";
            noteInitialInput.style.display = "block";
            document.removeEventListener("click", handleOutsideClick);
        }
    }

    closeNoteButton.addEventListener("click", function (e) {
        e.preventDefault();
        const title = noteTitleInput.value.trim();
        const content = noteInput.value.trim();
        if (title || content) {
            saveNote(content); // Using c2’s saveNote
        }
        noteTitleInput.value = "";
        noteInput.value = "";
        noteExpanded.style.display = "none";
        noteInitialInput.style.display = "block";
        document.removeEventListener("click", handleOutsideClick);
    });

    // Search Functionality (from c1)
    function debounce(func, delay) {
        let timeoutId;
        return function (...args) {
            clearTimeout(timeoutId);
            timeoutId = setTimeout(() => func.apply(this, args), delay);
        };
    }

    function searchNotes(query) {
        const filteredNotes = allNotes.filter(note => {
            const contentMatch = note.content && note.content.toLowerCase().includes(query.toLowerCase());
            let shouldAdd = false;

            switch (currentView) {
                case "notes":
                    shouldAdd = !note.isDeleted && !note.isArchived;
                    break;
                case "archive":
                    shouldAdd = note.isArchived && !note.isDeleted;
                    break;
                case "trash":
                    shouldAdd = note.isDeleted;
                    break;
            }

            return shouldAdd && contentMatch;
        });

        notesGrid.innerHTML = "";
        filteredNotes.forEach(note => {
            addNoteToUI(note.id, note.content, note.color || "white", currentView);
        });
    }

    const debouncedSearch = debounce(searchNotes, 300);
    searchInput.addEventListener("input", function () {
        const query = searchInput.value.trim();
        if (query === "") {
            fetchNotes();
        } else {
            debouncedSearch(query);
        }
    });

    document.querySelector(".fundoo-dash-search i").addEventListener("click", function () {
        searchInput.focus();
    });

    // --- c2’s Existing Logic (Unchanged) ---
    function fetchNotes() {
        if (!jwtToken) {
            console.error("No JWT token found. User must log in.");
            alert("You must be logged in to create and view notes.");
            return;
        }

        fetch("http://localhost:3000/api/v1/notes/getNote", {
            method: "GET",
            headers: {
                "Authorization": `Bearer ${jwtToken}`,
                "Content-Type": "application/json"
            }
        })
        .then(response => {
            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }
            return response.json();
        })
        .then(data => {
            console.log("Raw API Response:", data);

            if (!data.notes || !Array.isArray(data.notes)) {
                console.error("Invalid API response format or no notes found:", data);
                notesGrid.innerHTML = "<p>No notes available for this user.</p>";
                return;
            }

            allNotes = data.notes; // Store for search
            notesGrid.innerHTML = "";

            let added = false;
            data.notes.forEach(note => {
                if (note.isDeleted) {
                    if (currentView === "trash") {
                        addNoteToUI(note.id, note.content, note.color || "white", "trash");
                        added = true;
                    }
                } else if (note.isArchived) {
                    if (currentView === "archive") {
                        addNoteToUI(note.id, note.content, note.color || "white", "archive");
                        added = true;
                    }
                } else {
                    if (currentView === "notes") {
                        addNoteToUI(note.id, note.content, note.color || "white", "notes");
                        added = true;
                    }
                }
            });

            if (!added) {
                console.warn("No notes matched the current filter for this user.");
                notesGrid.innerHTML = "<p>No notes available in this view for this user.</p>";
            }
        })
        .catch(error => {
            console.error("Request Failed:", error);
            notesGrid.innerHTML = "<p>Error loading notes. Please log in again.</p>";
            alert("An error occurred while loading notes. Please log in again.");
            localStorage.removeItem("jwtToken");
        });
    }

    function saveNote(content) { // Modified to support title if API allows
        if (!jwtToken) {
            alert("You must be logged in to create notes.");
            return;
        }

        const title = noteTitleInput.value.trim(); // Added title support
        fetch("http://localhost:3000/api/v1/notes", {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
                "Authorization": `Bearer ${jwtToken}`
            },
            body: JSON.stringify({ note: { content, title } }) // Include title if API supports it
        })
        .then(response => response.json())
        .then(data => {
            if (data.note) {
                console.log("Note Saved for User:", data.note);
                addNoteToUI(data.note.id, data.note.content, data.note.color || "white", "notes");
                noteInput.value = "";
                setTimeout(fetchNotes, 10000);
            } else {
                console.error("Error saving note:", data.errors);
                alert("Failed to save note. Please try again.");
            }
        })
        .catch(error => console.error("Request Failed:", error));
    }

    function addNoteToUI(id, content, colour = "white", view) {
        const noteDiv = document.createElement("div");
        noteDiv.classList.add("fundoo-dash-note");
        noteDiv.dataset.id = id;
        noteDiv.style.backgroundColor = colour || "white";

        let iconsHTML = `<i class="fas fa-palette color-icon" title="Change Color"></i>`;
        if (view === "notes") {
            iconsHTML += `
                <i class="fas fa-box-archive archive-icon" title="Archive"></i>
                <i class="fas fa-trash delete-icon" title="Move to Trash"></i>
            `;
        } else if (view === "archive") {
            iconsHTML += `
                <i class="fas fa-box-open unarchive-icon" title="Unarchive"></i>
                <i class="fas fa-trash delete-icon" title="Move to Trash"></i>
            `;
        } else if (view === "trash") {
            iconsHTML += `
                <i class="fas fa-trash-restore restore-icon" title="Restore"></i>
                <i class="fas fa-trash delete-icon" title="Permanently Delete"></i>
            `;
        }

        noteDiv.innerHTML = `
            <h3>${content.split('\n')[0]}</h3> <!-- Display first line as title -->
            <p>${content}</p>
            <div class="note-icons">
                ${iconsHTML}
            </div>
        `;

        noteDiv.addEventListener("click", function (event) {
            if (event.target.classList.contains("delete-icon") || 
                event.target.classList.contains("archive-icon") || 
                event.target.classList.contains("unarchive-icon") ||
                event.target.classList.contains("restore-icon") ||
                event.target.classList.contains("color-icon")) {
                event.stopPropagation();
                return;
            }

            modalNoteTitle.value = content.split('\n')[0]; // Simulate title
            modalNoteContent.value = content;
            const noteColor = noteDiv.style.backgroundColor || "white";
            document.querySelector(".modal-content.fundoo-dash-note").style.backgroundColor = noteColor;

            const modalIcons = document.querySelector(".modal-icons");
            modalIcons.innerHTML = iconsHTML;

            if (view === "notes") {
                modalIcons.querySelector(".archive-icon").addEventListener("click", () => toggleArchive(id).then(() => noteModal.hide()));
                modalIcons.querySelector(".delete-icon").addEventListener("click", () => toggleTrash(id).then(() => noteModal.hide()));
                modalIcons.querySelector(".color-icon").addEventListener("click", () => showColorPopover(noteDiv, id));
            } else if (view === "archive") {
                modalIcons.querySelector(".unarchive-icon").addEventListener("click", () => toggleArchive(id).then(() => noteModal.hide()));
                modalIcons.querySelector(".delete-icon").addEventListener("click", () => toggleTrash(id).then(() => noteModal.hide()));
                modalIcons.querySelector(".color-icon").addEventListener("click", () => showColorPopover(noteDiv, id));
            } else if (view === "trash") {
                modalIcons.querySelector(".restore-icon").addEventListener("click", () => toggleTrash(id).then(() => noteModal.hide()));
                modalIcons.querySelector(".delete-icon").addEventListener("click", () => deletePermanently(id).then(() => noteModal.hide()));
                modalIcons.querySelector(".color-icon").addEventListener("click", () => showColorPopover(noteDiv, id));
            }

            noteModal.show();
        });

        const colorIcon = noteDiv.querySelector(".color-icon");
        colorIcon.addEventListener("click", function (e) {
            e.stopPropagation();
            showColorPopover(noteDiv, id);
        });

        if (view === "notes") {
            noteDiv.querySelector(".archive-icon").addEventListener("click", function (e) {
                e.stopPropagation();
                toggleArchive(id);
            });
        } else if (view === "archive") {
            noteDiv.querySelector(".unarchive-icon").addEventListener("click", function (e) {
                e.stopPropagation();
                toggleArchive(id);
            });
        } else if (view === "trash") {
            noteDiv.querySelector(".restore-icon").addEventListener("click", function (e) {
                e.stopPropagation();
                toggleTrash(id);
            });
            noteDiv.querySelector(".delete-icon").addEventListener("click", function (e) {
                e.stopPropagation();
                deletePermanently(id);
            });
        }

        noteDiv.querySelector(".delete-icon").addEventListener("click", function (e) {
            e.stopPropagation();
            toggleTrash(id);
        });

        notesGrid.prepend(noteDiv);
    }

    function toggleArchive(id) {
        if (!jwtToken) {
            alert("You must be logged in to manage notes.");
            return;
        }

        fetch(`http://localhost:3000/api/v1/notes/archiveToggle/${id}`, {
            method: "PUT",
            headers: { "Authorization": `Bearer ${jwtToken}` }
        })
        .then(response => response.json())
        .then(() => {
            fetchNotes();
        })
        .catch(error => console.error("Error:", error));
    }

    function toggleTrash(id) {
        if (!jwtToken) {
            alert("You must be logged in to manage notes.");
            return;
        }

        fetch(`http://localhost:3000/api/v1/notes/trashToggle/${id}`, {
            method: "PUT",
            headers: { "Authorization": `Bearer ${jwtToken}` }
        })
        .then(response => response.json())
        .then(() => {
            fetchNotes();
        })
        .catch(error => console.error("Error:", error));
    }

    function deletePermanently(id) {
        if (!jwtToken) {
            alert("You must be logged in to manage notes.");
            return;
        }

        if (!confirm("Are you sure you want to permanently delete this note? This action cannot be undone.")) {
            return;
        }

        fetch(`http://localhost:3000/api/v1/notes/deletePermanently/${id}`, {
            method: "DELETE",
            headers: { "Authorization": `Bearer ${jwtToken}` }
        })
        .then(response => response.json())
        .then(() => {
            fetchNotes();
        })
        .catch(error => console.error("Error:", error));
    }

    function updateNoteColor(id, color) {
        if (!jwtToken) {
            alert("You must be logged in to update notes.");
            return;
        }

        fetch(`http://localhost:3000/api/v1/notes/changeColor/${id}`, {
            method: "PUT",
            headers: {
                "Content-Type": "application/json",
                "Authorization": `Bearer ${jwtToken}`
            },
            body: JSON.stringify({ note: { color: color } })
        })
        .then(response => response.json())
        .then((data) => {
            console.log(`Color update response for note ${id}:`, data);
            if (data.message === "Color changed") {
                fetchNotes();
            } else {
                console.error("Color update failed:", data.errors);
                alert("Failed to update note color. Please try again.");
            }
        })
        .catch(error => console.error("Error updating color:", error));
    }

    // --- Added from c1: Color Picker ---
    function showColorPopover(noteDiv, id) {
        const existingPopover = document.querySelector(".color-picker-popup");
        if (existingPopover) existingPopover.remove();

        const colorPicker = document.createElement("div");
        colorPicker.classList.add("color-picker-popup");
        colorPicker.style.position = "absolute";
        colorPicker.style.zIndex = "1000";
        colorPicker.style.background = "#fff";
        colorPicker.style.borderRadius = "8px";
        colorPicker.style.boxShadow = "0 4px 6px rgba(0, 0, 0, 0.1)";
        colorPicker.style.padding = "10px";
        colorPicker.style.display = "grid";
        colorPicker.style.gridTemplateColumns = "repeat(5, 30px)";
        colorPicker.style.gap = "5px";

        const colors = [
            "#f28b82", "#fbbc04", "#fff475", "#ccff90", "#a7ffeb",
            "#cbf0f8", "#aecbfa", "#d7aefb", "#fdcfe8", "#e6c9a8",
            "#e8eaed"
        ];

        colors.forEach(color => {
            const colorCircle = document.createElement("div");
            colorCircle.style.width = "30px";
            colorCircle.style.height = "30px";
            colorCircle.style.borderRadius = "50%";
            colorCircle.style.backgroundColor = color;
            colorCircle.style.cursor = "pointer";
            colorCircle.style.border = "2px solid #fff";
            colorCircle.addEventListener("click", () => {
                updateNoteColor(id, color);
                document.body.removeChild(colorPicker);
            });
            colorCircle.addEventListener("mouseover", () => {
                colorCircle.style.borderColor = "#ddd";
            });
            colorCircle.addEventListener("mouseout", () => {
                colorCircle.style.borderColor = "#fff";
            });
            colorPicker.appendChild(colorCircle);
        });

        const rect = noteDiv.getBoundingClientRect();
        colorPicker.style.top = `${rect.bottom + window.scrollY + 5}px`;
        colorPicker.style.left = `${rect.left + window.scrollX}px`;

        document.body.appendChild(colorPicker);

        document.addEventListener("click", function handleOutsideClick(event) {
            if (!colorPicker.contains(event.target) && event.target !== noteDiv.querySelector(".color-icon")) {
                document.body.removeChild(colorPicker);
                document.removeEventListener("click", handleOutsideClick);
            }
        });
    }

    // Helper function to update sidebar and header (from c1)
    function updateSidebarAndHeader() {
        document.querySelectorAll(".fundoo-dash-sidebar li").forEach(tab => {
            tab.classList.remove("active");
        });
        document.getElementById(`${currentView}Tab`).classList.add("active");

        switch (currentView) {
            case "notes":
                headerTitle.textContent = "Fundoo";
                break;
            case "archive":
                headerTitle.textContent = "Archive";
                break;
            case "trash":
                headerTitle.textContent = "Bin";
                break;
        }

        document.querySelector(".fundoo-dash-create-note").style.display = currentView === "notes" ? "block" : "none";
    }
});