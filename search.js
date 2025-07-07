// --- 1. Firebase Initialization (unchanged) ---
import { initializeApp } from "https://www.gstatic.com/firebasejs/11.10.0/firebase-app.js";
import { getFirestore, collection, onSnapshot, query, orderBy, where, deleteDoc, doc } from "https://www.gstatic.com/firebasejs/11.10.0/firebase-firestore.js";

const firebaseConfig = {
  apiKey: "AIzaSyAS28D7jkbbsBM9EXcnASljkdZSK9MuN00", // YOUR ACTUAL API KEY
  authDomain: "listing-450b1.firebaseapp.com",
  projectId: "listing-450b1",
  storageBucket: "listing-450b1.firebasestorage.app",
  messagingSenderId: "417893506359",
  appId: "1:417893506359:web:0a222db691bada8d598eb2",
  measurementId: "G-019DSNVQCS"
};

const app = initializeApp(firebaseConfig);
const db = getFirestore(app);


// --- 2. Element References ---
const searchInput = document.getElementById('searchNamaListing');
const listingsContainer = document.getElementById('listingsContainer');
const goToFormPageButton = document.getElementById('goToFormPage');

// Modal Element References
const deleteConfirmModal = document.getElementById('deleteConfirmModal');
const deletePasswordInput = document.getElementById('deletePasswordInput');
const passwordErrorMessage = document.getElementById('passwordError');
const cancelDeleteButton = document.getElementById('cancelDeleteButton');
const confirmDeleteButton = document.getElementById('confirmDeleteButton');

// NEW: References to the new modal parts
const deleteConfirmationForm = document.getElementById('deleteConfirmationForm'); // Wrapper for initial form
const deleteSuccessMessage = document.getElementById('deleteSuccessMessage');     // Success message div
const closeSuccessMessageButton = document.getElementById('closeSuccessMessageButton'); // New button for success message

let currentListingIdToDelete = null;
const CORRECT_PASSWORD = "HarcourtsBSD123";


// --- 3. Reading Data and Real-time Search (unchanged in this section) ---

function renderListings(docs) {
    listingsContainer.innerHTML = '';

    if (docs.empty) {
        listingsContainer.innerHTML = '<p>Belum ada listing yang cocok.</p>';
        return;
    }

    docs.forEach(docSnapshot => {
        const listing = docSnapshot.data();
        const listingId = docSnapshot.id;

        const listingDiv = document.createElement('div');
        listingDiv.className = 'listing-item';
        listingDiv.setAttribute('data-id', listingId);

        listingDiv.innerHTML = `
            <div class="listing-item-header">
                <h4>${listing.namaListing}</h4>
                <button class="delete-button" data-id="${listingId}">
                    <i class="fas fa-trash-alt"></i>
                </button>
            </div>
            <p><strong>Alamat:</strong> ${listing.alamat}</p>
            <p><strong>Ukuran:</strong> ${listing.ukuran}</p>
            ${listing.timestamp ? `<small>Ditambahkan pada: ${new Date(listing.timestamp.toDate()).toLocaleString()}</small>` : ''}
            <hr>
        `;
        listingsContainer.appendChild(listingDiv);

        const deleteButton = listingDiv.querySelector(`.delete-button[data-id="${listingId}"]`);
        if (deleteButton) {
            deleteButton.addEventListener('click', () => {
                currentListingIdToDelete = listingId;
                // NEW: Reset modal state to initial form view
                deleteConfirmationForm.style.display = 'block'; // Show the form part
                deleteSuccessMessage.style.display = 'none';    // Hide the success part

                deleteConfirmModal.classList.add('active');
                deletePasswordInput.value = '';
                passwordErrorMessage.style.display = 'none';
                deletePasswordInput.focus();
            });
        }
    });
}

let unsubscribeDisplay = null;

function setupRealtimeListener(searchQuery = '') {
    if (unsubscribeDisplay) {
        unsubscribeDisplay();
    }

    const actualSearchQuery = searchQuery.toLowerCase();

    let listingsQuery = query(collection(db, 'listings'), orderBy('namaListingLower'));

    if (actualSearchQuery) {
        listingsQuery = query(
            collection(db, 'listings'),
            orderBy('namaListingLower'),
            where('namaListingLower', '>=', actualSearchQuery),
            where('namaListingLower', '<=', actualSearchQuery + '\uf8ff')
        );
    }

    unsubscribeDisplay = onSnapshot(listingsQuery,
        (snapshot) => {
            renderListings(snapshot);
        },
        (error) => {
            console.error("Error getting real-time updates for display: ", error);
            listingsContainer.innerHTML = '<p>Gagal memuat daftar listing.</p>';
        }
    );
}

setupRealtimeListener();

searchInput.addEventListener('input', () => {
    const searchTerm = searchInput.value.trim();
    setupRealtimeListener(searchTerm);
});


// --- Modal Button Event Listeners (MODIFIED for success state) ---

// Function to close the modal and reset state
function closeModalAndReset() {
    deleteConfirmModal.classList.remove('active');
    currentListingIdToDelete = null;
    passwordErrorMessage.style.display = 'none';
    deletePasswordInput.value = ''; // Clear input on close
    // NEW: Ensure initial form is shown if modal is reopened later
    deleteConfirmationForm.style.display = 'block';
    deleteSuccessMessage.style.display = 'none';
}


// Cancel button click (now also acts as a general close)
cancelDeleteButton.addEventListener('click', closeModalAndReset);

// Confirm Delete button click
confirmDeleteButton.addEventListener('click', async () => {
    const enteredPassword = deletePasswordInput.value;

    if (enteredPassword === CORRECT_PASSWORD) {
        if (currentListingIdToDelete) {
            try {
                await deleteDoc(doc(db, 'listings', currentListingIdToDelete));
                console.log(`Document with ID: ${currentListingIdToDelete} successfully deleted!`);

                // NEW: Show success message and hide form
                deleteConfirmationForm.style.display = 'none';
                deleteSuccessMessage.style.display = 'block';
                
                // No need to hide modal immediately; user will click "Oke"
            } catch (error) {
                console.error("Error removing document: ", error);
                alert('Gagal menghapus listing. Periksa konsol untuk detail.');
                // Even on error, hide modal for now. You might want a different error message in the modal.
                closeModalAndReset();
            }
        }
    } else {
        passwordErrorMessage.textContent = 'Kata sandi salah. Silakan coba lagi.';
        passwordErrorMessage.style.display = 'block';
        deletePasswordInput.value = '';
        deletePasswordInput.focus();
    }
});

// NEW: Close success message button click
closeSuccessMessageButton.addEventListener('click', closeModalAndReset);

// Optional: Hide modal if clicking outside the modal content (but on the overlay)
deleteConfirmModal.addEventListener('click', (event) => {
    if (event.target === deleteConfirmModal) {
        closeModalAndReset();
    }
});


// --- 4. Navigation Back to Form Page (unchanged) ---
goToFormPageButton.addEventListener('click', () => {
    window.location.href = 'index.html';
});

const appHeader = document.querySelector('.app-header'); // Get the header element
let lastScrollY = 0; // To store the last scroll position

window.addEventListener('scroll', () => {
    // Check if the header element exists on the page
    if (appHeader) {
        // Get the current scroll position
        const currentScrollY = window.scrollY;

        // Determine scroll direction
        if (currentScrollY > lastScrollY && currentScrollY > 70) { // Scrolling down and past header height
            appHeader.classList.add('header-hidden');
        } else if (currentScrollY < lastScrollY) { // Scrolling up
            appHeader.classList.remove('header-hidden');
        }

        // Update the last scroll position
        lastScrollY = currentScrollY;
    }
});