import {
  initializeApp
} from "https://www.gstatic.com/firebasejs/12.0.0/firebase-app.js";

import {
  getAuth,
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  signOut,
  onAuthStateChanged
} from "https://www.gstatic.com/firebasejs/12.0.0/firebase-auth.js";

import {
  getFirestore,
  collection,
  addDoc,
  setDoc,
  getDoc,
  doc,
  query,
  orderBy,
  onSnapshot,
  serverTimestamp
} from "https://www.gstatic.com/firebasejs/12.0.0/firebase-firestore.js";

import { firebaseConfig } from "./firebase-config.js";

const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app);

let currentUser = null;
let selectedUser = null;
let unsubscribeMessages = null;

const authSection = document.querySelector("#auth-section");
const chatSection = document.querySelector("#chat-section");
const authMessage = document.querySelector("#auth-message");

const nameInput = document.querySelector("#name");
const emailInput = document.querySelector("#email");
const passwordInput = document.querySelector("#password");

const signupBtn = document.querySelector("#signup-btn");
const loginBtn = document.querySelector("#login-btn");
const logoutBtn = document.querySelector("#logout-btn");

const currentUserElement = document.querySelector("#current-user");
const usersList = document.querySelector("#users-list");
const chatHeader = document.querySelector("#chat-header");
const messagesElement = document.querySelector("#messages");

const messageForm = document.querySelector("#message-form");
const messageInput = document.querySelector("#message-input");


signupBtn.addEventListener("click", async () => {
  const name = nameInput.value.trim();
  const email = emailInput.value.trim();
  const password = passwordInput.value;

  if (!name || !email || !password) {
    authMessage.textContent = "All fields required";
    return;
  }

  try {
    const result = await createUserWithEmailAndPassword(
      auth,
      email,
      password
    );

    await setDoc(doc(db, "users", result.user.uid), {
      uid: result.user.uid,
      name,
      email,
      createdAt: serverTimestamp()
    });

    authMessage.textContent = "Signup successful";
  } catch (error) {
    authMessage.textContent = error.message;
  }
});

loginBtn.addEventListener("click", async () => {
  const email = emailInput.value.trim();
  const password = passwordInput.value;

  try {
    await signInWithEmailAndPassword(auth, email, password);
    authMessage.textContent = "";
  } catch (error) {
    authMessage.textContent = error.message;
  }
});


onAuthStateChanged(auth, async (user) => {
  if (user) {
    currentUser = user;

    const userSnapshot = await getDoc(
      doc(db, "users", user.uid)
    );

    const userData = userSnapshot.data();

    currentUserElement.textContent =
      userData?.name || user.email;

    authSection.classList.add("hidden");
    chatSection.classList.remove("hidden");

    loadUsers();
  } else {
    currentUser = null;

    authSection.classList.remove("hidden");
    chatSection.classList.add("hidden");
  }
});


logoutBtn.addEventListener("click", async () => {
  if (unsubscribeMessages) {
    unsubscribeMessages();
  }

  await signOut(auth);
});



function loadUsers() {
  const usersQuery = query(collection(db, "users"));

  onSnapshot(usersQuery, (snapshot) => {
    usersList.innerHTML = "";

    snapshot.forEach((userDoc) => {
      const user = userDoc.data();

      if (user.uid === currentUser.uid) {
        return;
      }

      const userElement = document.createElement("div");

      userElement.className = "user-item";
      userElement.textContent = user.name || user.email;

      userElement.addEventListener("click", () => {
        openChat(user);
      });

      usersList.appendChild(userElement);
    });
  });
}



function getChatId(uid1, uid2) {
  return [uid1, uid2].sort().join("_");
}



async function ensureChatExists(user) {
  const chatId = getChatId(
    currentUser.uid,
    user.uid
  );

  await setDoc(
    doc(db, "chats", chatId),
    {
      members: [currentUser.uid, user.uid],
      updatedAt: serverTimestamp()
    },
    { merge: true }
  );

  return chatId;
}



async function openChat(user) {
  selectedUser = user;

  chatHeader.textContent =
    `Chat with ${user.name || user.email}`;

  messagesElement.innerHTML = "";

  const chatId = await ensureChatExists(user);

  if (unsubscribeMessages) {
    unsubscribeMessages();
  }

  const messagesQuery = query(
    collection(db, "chats", chatId, "messages"),
    orderBy("createdAt", "asc")
  );

  unsubscribeMessages = onSnapshot(
    messagesQuery,
    (snapshot) => {
      messagesElement.innerHTML = "";

      snapshot.forEach((messageDoc) => {
        showMessage(messageDoc.data());
      });

      messagesElement.scrollTop =
        messagesElement.scrollHeight;
    }
  );
}



function showMessage(message) {
  const messageElement = document.createElement("div");

  messageElement.className = "message";

  if (message.senderId === currentUser.uid) {
    messageElement.classList.add("my-message");
  }

  const time = message.createdAt?.toDate
    ? message.createdAt.toDate().toLocaleTimeString()
    : "";

  messageElement.innerHTML = `
    <div>${escapeHtml(message.text)}</div>
    <span class="message-time">${time}</span>
  `;

  messagesElement.appendChild(messageElement);
}


function escapeHtml(text) {
  const div = document.createElement("div");
  div.textContent = text;
  return div.innerHTML;
}



messageForm.addEventListener("submit", async (event) => {
  event.preventDefault();

  const text = messageInput.value.trim();

  if (!text || !selectedUser) {
    return;
  }

  const chatId = getChatId(
    currentUser.uid,
    selectedUser.uid
  );

  await addDoc(
    collection(db, "chats", chatId, "messages"),
    {
      text,
      senderId: currentUser.uid,
      receiverId: selectedUser.uid,
      createdAt: serverTimestamp()
    }
  );

  messageInput.value = "";
});


