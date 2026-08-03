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
  limit,
  onSnapshot,
  serverTimestamp,
  getDocs,
  writeBatch
} from "https://www.gstatic.com/firebasejs/12.0.0/firebase-firestore.js";

import {
  firebaseConfig
} from "./firebase-config.js";


/* INITIALIZE FIREBASE */

const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app);


/* APP STATE */

let currentUser = null;
let selectedUser = null;

let unsubscribeMessages = null;
let unsubscribeUsers = null;

let allUsers = [];


/* AUTH ELEMENTS */

const authSection =
  document.querySelector("#auth-section");

const chatSection =
  document.querySelector("#chat-section");

const authMessage =
  document.querySelector("#auth-message");

const nameInput =
  document.querySelector("#name");

const emailInput =
  document.querySelector("#email");

const passwordInput =
  document.querySelector("#password");

const signupBtn =
  document.querySelector("#signup-btn");

const loginBtn =
  document.querySelector("#login-btn");

const logoutBtn =
  document.querySelector("#logout-btn");


/* PROFILE ELEMENTS */

const currentUserElement =
  document.querySelector("#current-user");

const myAvatar =
  document.querySelector("#my-avatar");


/* USER ELEMENTS */

const userSearchInput =
  document.querySelector("#user-search");

const usersList =
  document.querySelector("#users-list");

const usersCount =
  document.querySelector("#users-count");


/* CHAT ELEMENTS */

const chatTitle =
  document.querySelector("#chat-title");

const chatStatus =
  document.querySelector("#chat-status");

const chatAvatar =
  document.querySelector("#chat-avatar");

const deleteChatBtn =
  document.querySelector("#delete-chat-btn");

const messagesElement =
  document.querySelector("#messages");

const messageForm =
  document.querySelector("#message-form");

const messageInput =
  document.querySelector("#message-input");


/* SIGNUP */

signupBtn.addEventListener(
  "click",
  async () => {
    const name =
      nameInput.value.trim();

    const email =
      emailInput.value.trim();

    const password =
      passwordInput.value;

    if (!name || !email || !password) {
      authMessage.textContent =
        "All fields required";

      return;
    }

    if (password.length < 6) {
      authMessage.textContent =
        "Password kam se kam 6 characters ka hona chahiye";

      return;
    }

    try {
      signupBtn.disabled = true;
      signupBtn.textContent = "Creating...";

      const result =
        await createUserWithEmailAndPassword(
          auth,
          email,
          password
        );

      await setDoc(
        doc(db, "users", result.user.uid),
        {
          uid: result.user.uid,
          name,
          email: email.toLowerCase(),
          createdAt: serverTimestamp()
        }
      );

      authMessage.textContent =
        "Signup successful";

      nameInput.value = "";
      emailInput.value = "";
      passwordInput.value = "";
    } catch (error) {
      console.error(error);

      authMessage.textContent =
        getFriendlyError(error);
    } finally {
      signupBtn.disabled = false;
      signupBtn.textContent = "Create Account";
    }
  }
);


/* LOGIN */

loginBtn.addEventListener(
  "click",
  async () => {
    const email =
      emailInput.value.trim();

    const password =
      passwordInput.value;

    if (!email || !password) {
      authMessage.textContent =
        "Email aur password enter karo";

      return;
    }

    try {
      loginBtn.disabled = true;
      loginBtn.textContent = "Logging in...";

      await signInWithEmailAndPassword(
        auth,
        email,
        password
      );

      authMessage.textContent = "";
    } catch (error) {
      console.error(error);

      authMessage.textContent =
        getFriendlyError(error);
    } finally {
      loginBtn.disabled = false;
      loginBtn.textContent = "Login";
    }
  }
);


/* AUTH STATE */

onAuthStateChanged(
  auth,
  async (user) => {
    if (user) {
      currentUser = user;

      try {
        const userSnapshot =
          await getDoc(
            doc(db, "users", user.uid)
          );

        const userData =
          userSnapshot.exists()
            ? userSnapshot.data()
            : {};

        const userName =
          userData.name ||
          user.displayName ||
          user.email ||
          "User";

        currentUserElement.textContent =
          userName;

        myAvatar.textContent =
          getInitial(userName);

        authSection.classList.add("hidden");
        chatSection.classList.remove("hidden");

        resetChatScreen();
        loadUsers();
      } catch (error) {
        console.error(
          "Profile loading error:",
          error
        );

        authMessage.textContent =
          "Profile load nahi ho saka";
      }
    } else {
      currentUser = null;
      selectedUser = null;

      if (unsubscribeMessages) {
        unsubscribeMessages();
        unsubscribeMessages = null;
      }

      if (unsubscribeUsers) {
        unsubscribeUsers();
        unsubscribeUsers = null;
      }

      authSection.classList.remove("hidden");
      chatSection.classList.add("hidden");
    }
  }
);


/* LOGOUT */

logoutBtn.addEventListener(
  "click",
  async () => {
    try {
      if (unsubscribeMessages) {
        unsubscribeMessages();
        unsubscribeMessages = null;
      }

      if (unsubscribeUsers) {
        unsubscribeUsers();
        unsubscribeUsers = null;
      }

      await signOut(auth);
    } catch (error) {
      console.error(
        "Logout error:",
        error
      );
    }
  }
);


/* LOAD USERS */

function loadUsers() {
  if (unsubscribeUsers) {
    unsubscribeUsers();
  }

  const usersQuery =
    query(
      collection(db, "users"),
      orderBy("name", "asc"),
      limit(100)
    );

  unsubscribeUsers =
    onSnapshot(
      usersQuery,
      (snapshot) => {
        allUsers = [];

        snapshot.forEach(
          (userDoc) => {
            const user =
              userDoc.data();

            if (
              currentUser &&
              user.uid !== currentUser.uid
            ) {
              allUsers.push(user);
            }
          }
        );

        displayUsers(allUsers);
      },
      (error) => {
        console.error(
          "Users loading error:",
          error
        );

        usersList.innerHTML =
          "<p class='no-user'>Users load nahi ho paaye</p>";

        usersCount.textContent = "0";
      }
    );
}


/* DISPLAY / SEARCH USERS */

function displayUsers(users) {
  const searchText =
    userSearchInput.value
      .trim()
      .toLowerCase();

  usersList.innerHTML = "";

  const filteredUsers =
    users.filter(
      (user) => {
        const name =
          (user.name || "")
            .toLowerCase();

        const email =
          (user.email || "")
            .toLowerCase();

        return (
          name.includes(searchText) ||
          email.includes(searchText)
        );
      }
    );

  usersCount.textContent =
    filteredUsers.length;

  if (filteredUsers.length === 0) {
    usersList.innerHTML =
      "<p class='no-user'>No user found</p>";

    return;
  }

  filteredUsers.forEach(
    (user) => {
      const userElement =
        document.createElement("div");

      userElement.className =
        "user-item";

      const userName =
        user.name ||
        user.email ||
        "User";

      userElement.textContent =
        userName;

      userElement.addEventListener(
        "click",
        () => openChat(user)
      );

      usersList.appendChild(
        userElement
      );
    }
  );
}


userSearchInput.addEventListener(
  "input",
  () => {
    displayUsers(allUsers);
  }
);


/* CHAT ID */

function getChatId(uid1, uid2) {
  return [
    uid1,
    uid2
  ]
    .sort()
    .join("_");
}


/* CREATE CHAT DOCUMENT */

async function ensureChatExists(user) {
  const chatId =
    getChatId(
      currentUser.uid,
      user.uid
    );

  await setDoc(
    doc(db, "chats", chatId),
    {
      members: [
        currentUser.uid,
        user.uid
      ],
      updatedAt: serverTimestamp()
    },
    {
      merge: true
    }
  );

  return chatId;
}


/* OPEN CHAT */

async function openChat(user) {
  if (!currentUser || !user) {
    return;
  }

  selectedUser = user;

  const userName =
    user.name ||
    user.email ||
    "User";

  chatTitle.textContent =
    userName;

  chatStatus.textContent =
    "Available";

  chatAvatar.textContent =
    getInitial(userName);

  deleteChatBtn.classList.remove(
    "hidden"
  );

  messagesElement.innerHTML = "";

  try {
    const chatId =
      await ensureChatExists(user);

    if (unsubscribeMessages) {
      unsubscribeMessages();
    }

    const messagesQuery =
      query(
        collection(
          db,
          "chats",
          chatId,
          "messages"
        ),
        orderBy(
          "createdAt",
          "asc"
        )
      );

    unsubscribeMessages =
      onSnapshot(
        messagesQuery,
        (snapshot) => {
          messagesElement.innerHTML =
            "";

          if (snapshot.empty) {
            messagesElement.innerHTML = `
              <div class="empty-chat">
                <div class="empty-icon">👋</div>
                <h2>Say Hello</h2>
                <p>Start your first conversation.</p>
              </div>
            `;

            return;
          }

          snapshot.forEach(
            (messageDoc) => {
              showMessage(
                messageDoc.data()
              );
            }
          );

          messagesElement.scrollTop =
            messagesElement.scrollHeight;
        },
        (error) => {
          console.error(
            "Messages loading error:",
            error
          );

          messagesElement.innerHTML =
            "<p>Messages load nahi ho paaye</p>";
        }
      );
  } catch (error) {
    console.error(
      "Open chat error:",
      error
    );

    alert("Chat open nahi ho saki");
  }
}


/* DISPLAY MESSAGE */

function showMessage(message) {
  const messageElement =
    document.createElement("div");

  messageElement.className =
    "message";

  if (
    currentUser &&
    message.senderId === currentUser.uid
  ) {
    messageElement.classList.add(
      "my-message"
    );
  }

  const messageTime =
    message.createdAt?.toDate
      ? message.createdAt
          .toDate()
          .toLocaleTimeString(
            [],
            {
              hour: "2-digit",
              minute: "2-digit"
            }
          )
      : "";

  messageElement.innerHTML = `
    <div>${escapeHtml(message.text || "")}</div>
    <span class="message-time">
      ${messageTime}
    </span>
  `;

  messagesElement.appendChild(
    messageElement
  );
}


/* ESCAPE MESSAGE HTML */

function escapeHtml(text) {
  const div =
    document.createElement("div");

  div.textContent = text;

  return div.innerHTML;
}


/* SEND MESSAGE */

messageForm.addEventListener(
  "submit",
  async (event) => {
    event.preventDefault();

    const text =
      messageInput.value.trim();

    if (!text || !selectedUser) {
      return;
    }

    try {
      const chatId =
        getChatId(
          currentUser.uid,
          selectedUser.uid
        );

      await addDoc(
        collection(
          db,
          "chats",
          chatId,
          "messages"
        ),
        {
          text,
          senderId: currentUser.uid,
          receiverId: selectedUser.uid,
          createdAt: serverTimestamp()
        }
      );

      messageInput.value = "";
      messageInput.focus();
    } catch (error) {
      console.error(
        "Send message error:",
        error
      );

      alert(
        "Message send nahi ho saka"
      );
    }
  }
);


/* DELETE CHAT */

deleteChatBtn.addEventListener(
  "click",
  deleteCurrentChat
);

async function deleteCurrentChat() {
  if (!currentUser || !selectedUser) {
    alert("Pehle chat select karo");
    return;
  }

  const confirmed =
    confirm(
      "Kya aap is chat ke saare messages delete karna chahte ho?"
    );

  if (!confirmed) {
    return;
  }

  try {
    const chatId =
      getChatId(
        currentUser.uid,
        selectedUser.uid
      );

    const messagesRef =
      collection(
        db,
        "chats",
        chatId,
        "messages"
      );

    const messagesSnapshot =
      await getDocs(messagesRef);

    const batch =
      writeBatch(db);

    messagesSnapshot.forEach(
      (messageDoc) => {
        batch.delete(
          messageDoc.ref
        );
      }
    );

    batch.delete(
      doc(db, "chats", chatId)
    );

    await batch.commit();

    if (unsubscribeMessages) {
      unsubscribeMessages();
      unsubscribeMessages = null;
    }

    selectedUser = null;
    resetChatScreen();

    alert("Chat delete ho gayi");
  } catch (error) {
    console.error(
      "Delete chat error:",
      error
    );

    alert(
      "Chat delete nahi ho saki. Firestore Rules check karo."
    );
  }
}


/* RESET CHAT SCREEN */

function resetChatScreen() {
  messagesElement.innerHTML = `
    <div class="empty-chat">
      <div class="empty-icon">💬</div>
      <h2>Start a conversation</h2>
      <p>Search and select a user from the left side.</p>
    </div>
  `;

  chatTitle.textContent =
    "Select a user";

  chatStatus.textContent =
    "Choose someone to start chatting";

  chatAvatar.textContent =
    "?";

  deleteChatBtn.classList.add(
    "hidden"
  );
}


/* FIRST LETTER */

function getInitial(text) {
  return (
    text
      .trim()
      .charAt(0)
      .toUpperCase() || "U"
  );
}


/* FRIENDLY FIREBASE ERRORS */

function getFriendlyError(error) {
  switch (error.code) {
    case "auth/email-already-in-use":
      return "Ye email already registered hai";

    case "auth/invalid-email":
      return "Email address sahi nahi hai";

    case "auth/weak-password":
      return "Password kam se kam 6 characters ka rakho";

    case "auth/invalid-credential":
      return "Email ya password galat hai";

    case "auth/user-not-found":
      return "User nahi mila";

    case "auth/wrong-password":
      return "Password galat hai";

    default:
      return (
        error.message ||
        "Kuch error aa gaya"
      );
  }
}
