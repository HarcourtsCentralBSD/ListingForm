// --- 1. Firebase Initialization ---
import { initializeApp } from "https://www.gstatic.com/firebasejs/11.10.0/firebase-app.js";
import { getFirestore, collection, addDoc, onSnapshot, query, orderBy, where, serverTimestamp } from "https://www.gstatic.com/firebasejs/11.10.0/firebase-firestore.js";

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
const listingForm = document.getElementById('listingForm');
const namaListingInput = document.getElementById('namaListing');
const alamatInput = document.getElementById('alamat');
const ukuranInput = document.getElementById('ukuran');
const namaListingSuggestionsDiv = document.getElementById('namaListingSuggestions');
const goToSearchPageButton = document.getElementById('goToSearchPage');

const loadingStatusIcon = document.getElementById('loadingStatusIcon');


// --- 3. Handling Form Submission (MODIFIED: Add namaListingLower field for case-insensitivity) ---
listingForm.addEventListener('submit', async (e) => {
    e.preventDefault();

    const namaListing = namaListingInput.value.trim();
    const alamat = alamatInput.value.trim();
    const ukuran = ukuranInput.value.trim();

    if (!namaListing || !alamat || !ukuran) {
        alert('Please fill in all fields.');
        return;
    }

    try {
        await addDoc(collection(db, 'listings'), {
            namaListing: namaListing,
            alamat: alamat,
            ukuran: ukuran,
            timestamp: serverTimestamp(),
            // === RE-ADDED MODIFICATION FOR CASE-INSENSITIVITY START ===
            namaListingLower: namaListing.toLowerCase() // New field for case-insensitive search
            // === RE-ADDED MODIFICATION FOR CASE-INSENSITIVITY END ===
        });

        console.log("Listing added successfully!");
        alert('Listing added successfully!');
        listingForm.reset();
        namaListingInput.focus();
    } catch (error) {
        console.error("Error adding document: ", error);
        alert('Error adding listing. Please check the console for more details.');
    }
});


// --- 4. Real-time Custom Suggestions for "Nama Listing" Input (Dropdown on Form Page) ---

let unsubscribeSuggestions = null;
let typingTimer; // Debounce timer
const doneTypingInterval = 300; // Debounce delay in ms

// Function to handle fetching and rendering suggestions (MODIFIED for case-insensitivity)
function fetchAndRenderSuggestionsDebounced(inputValue) {
    namaListingSuggestionsDiv.innerHTML = ''; // Clear previous suggestions

    // Show loading spinner immediately before query starts
    loadingStatusIcon.innerHTML = '<i class="fas fa-circle-notch"></i>';
    loadingStatusIcon.classList.add('loading');
    loadingStatusIcon.classList.remove('success');
    loadingStatusIcon.style.display = 'block';

    if (unsubscribeSuggestions) {
        unsubscribeSuggestions();
        unsubscribeSuggestions = null;
    }

    if (inputValue.length > 0) {
        // === RE-ADDED MODIFICATION FOR CASE-INSENSITIVITY START ===
        const inputValueLower = inputValue.toLowerCase(); // Convert input to lowercase
        // === RE-ADDED MODIFICATION FOR CASE-INSENSITIVITY END ===

        const suggestionsQuery = query(
            collection(db, 'listings'),
            // === RE-ADDED MODIFICATION FOR CASE-INSENSITIVITY START ===
            orderBy('namaListingLower'), // Order by the new lowercase field
            where('namaListingLower', '>=', inputValueLower), // Query against the lowercase field
            where('namaListingLower', '<=', inputValueLower + '\uf8ff') // Query against the lowercase field
            // === RE-ADDED MODIFICATION FOR CASE-INSENSITIVITY END ===
            // limit(10) // Optional: limit the number of suggestions
        );

        unsubscribeSuggestions = onSnapshot(suggestionsQuery, (snapshot) => {
            namaListingSuggestionsDiv.innerHTML = ''; // Clear again to be safe

            // Update icon to success state after data is received
            loadingStatusIcon.innerHTML = '<i class="fas fa-check"></i>';
            loadingStatusIcon.classList.remove('loading');
            loadingStatusIcon.classList.add('success');

            if (snapshot.empty) {
                const noResultsDiv = document.createElement('div');
                noResultsDiv.className = 'suggestion-item';
                noResultsDiv.style.textAlign = 'center';
                noResultsDiv.style.fontStyle = 'italic';
                noResultsDiv.style.color = '#888';
                noResultsDiv.textContent = 'Tidak ada listing yang cocok.';
                namaListingSuggestionsDiv.appendChild(noResultsDiv);
            } else {
                snapshot.forEach(doc => {
                    const listing = doc.data();

                    const suggestionItem = document.createElement('div');
                    suggestionItem.className = 'suggestion-item';
                    suggestionItem.innerHTML = `
                        <div class="suggestion-item-details">
                            <h5>${listing.namaListing}</h5>
                            <p>Alamat: ${listing.alamat}</p>
                            <p class="ukuran">Ukuran: ${listing.ukuran}</p>
                        </div>
                    `;

                    suggestionItem.addEventListener('click', () => {
                        namaListingInput.value = listing.namaListing;
                        alamatInput.value = listing.alamat;
                        ukuranInput.value = listing.ukuran;

                        namaListingSuggestionsDiv.classList.remove('active');
                        loadingStatusIcon.style.display = 'none';
                        if (unsubscribeSuggestions) {
                            unsubscribeSuggestions();
                            unsubscribeSuggestions = null;
                        }
                    });
                    namaListingSuggestionsDiv.appendChild(suggestionItem);
                });
            }
            namaListingSuggestionsDiv.classList.add('active');
        }, (error) => {
            console.error("Error getting real-time suggestions: ", error);
            namaListingSuggestionsDiv.classList.remove('active');
            loadingStatusIcon.innerHTML = '<i class="fas fa-times"></i>';
            loadingStatusIcon.classList.remove('loading');
            loadingStatusIcon.classList.add('error');
        });
    } else {
        namaListingSuggestionsDiv.classList.remove('active');
        namaListingSuggestionsDiv.innerHTML = '';
        loadingStatusIcon.style.display = 'none';
        if (unsubscribeSuggestions) {
            unsubscribeSuggestions();
            unsubscribeSuggestions = null;
        }
    }
}


// Event listener for namaListingInput (as provided by you, with debounce)
namaListingInput.addEventListener('input', () => {
    clearTimeout(typingTimer); // Clear any previous debounce timer

    const inputValue = namaListingInput.value.trim();

    if (inputValue.length > 0) {
        // Show loading spinner immediately on user input
        loadingStatusIcon.innerHTML = '<i class="fas fa-circle-notch"></i>';
        loadingStatusIcon.classList.add('loading');
        loadingStatusIcon.classList.remove('success');
        loadingStatusIcon.style.display = 'block';

        // Set a new timer to fetch and render suggestions after typing stops
        typingTimer = setTimeout(() => {
            fetchAndRenderSuggestionsDebounced(inputValue);
        }, doneTypingInterval);
    } else {
        // If input is empty, hide everything
        namaListingSuggestionsDiv.classList.remove('active');
        namaListingSuggestionsDiv.innerHTML = '';
        loadingStatusIcon.style.display = 'none';
        if (unsubscribeSuggestions) {
            unsubscribeSuggestions();
            unsubscribeSuggestions = null;
        }
    }
});


// NEW FEATURE: Run search when namaListing field is clicked/focused
namaListingInput.addEventListener('focus', () => {
    // Only run search if there's content in the field to suggest
    if (namaListingInput.value.trim().length > 0) {
        fetchAndRenderSuggestionsDebounced(namaListingInput.value.trim());
    }
});


// Other event listeners (blur, click) remain unchanged as they correctly manage visibility and unsubscription.
namaListingInput.addEventListener('blur', () => {
    setTimeout(() => {
        namaListingSuggestionsDiv.classList.remove('active');
        loadingStatusIcon.style.display = 'none';
        if (unsubscribeSuggestions) {
            unsubscribeSuggestions();
            unsubscribeSuggestions = null;
        }
    }, 150);
});

document.addEventListener('click', (event) => {
    if (!namaListingInput.contains(event.target) && !namaListingSuggestionsDiv.contains(event.target) && !loadingStatusIcon.contains(event.target)) {
        namaListingSuggestionsDiv.classList.remove('active');
        loadingStatusIcon.style.display = 'none';
        if (unsubscribeSuggestions) {
            unsubscribeSuggestions();
            unsubscribeSuggestions = null;
        }
    }
});

// Global Listener to Re-trigger Suggestions on Any Data Change (ADDED from previous request)
// This listener runs a very simple query to detect any change in the collection.
// It does NOT filter the results itself, it just acts as a trigger.
// This ensures that if new data is added by another user, the search is re-run
// based on the current input value, updating the dropdown if relevant.
onSnapshot(collection(db, 'listings'), (snapshot) => {
    // Check if the namaListingInput is currently active (has focus or has some text)
    // and if there were actual changes (not just initial load of an empty collection)
    if (namaListingInput === document.activeElement || namaListingInput.value.trim().length > 0) {
        // Re-run the suggestion fetch using the current input value
        // Use a small timeout to avoid immediate re-triggering if this listener fires multiple times
        // due to a batch write or rapid changes. Also helps with debounce logic.
        setTimeout(() => {
            fetchAndRenderSuggestionsDebounced(namaListingInput.value.trim());
        }, 50); // Small delay to prevent race conditions or excessive calls
    }
}, (error) => {
    console.error("Error monitoring for global listing changes:", error);
});


// --- 5. Navigation to Search Page (unchanged) ---
goToSearchPageButton.addEventListener('click', () => {
    window.location.href = 'search.html'; // Navigate to the search page
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