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
  updateDoc,
  getDoc,
  getDocs,
  deleteDoc,
  doc,
  query,
  where,
  orderBy,
  limit,
  onSnapshot,
  serverTimestamp,
  writeBatch
} from "https://www.gstatic.com/firebasejs/12.0.0/firebase-firestore.js";

import {
  firebaseConfig
} from "./firebase-config.js";


/* FIREBASE */

const app =
  initializeApp(firebaseConfig);

const auth =
  getAuth(app);

const db =
  getFirestore(app);


/* STATE */

let currentUser = null;
let currentUserData = null;
let selectedUser = null;

let allUsers = [];

let unsubscribeMessages = null;
let unsubscribeUsers = null;
let unsubscribeSelectedUser = null;
let unsubscribeTyping = null;
let unsubscribeIncomingCalls = null;

let typingTimer = null;
let isTyping = false;

let peerConnection = null;
let localStream = null;
let activeCallId = null;


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


/* PROFILE */

const currentUserElement =
  document.querySelector("#current-user");

const myAvatar =
  document.querySelector("#my-avatar");

const myOnlineDot =
  document.querySelector("#my-online-dot");


/* USERS */

const userSearchInput =
  document.querySelector("#user-search");

const usersList =
  document.querySelector("#users-list");

const usersCount =
  document.querySelector("#users-count");


/* CHAT HEADER */

const chatTitle =
  document.querySelector("#chat-title");

const chatStatus =
  document.querySelector("#chat-status");

const chatLastSeen =
  document.querySelector("#chat-last-seen");

const typingIndicator =
  document.querySelector("#typing-indicator");

const chatAvatar =
  document.querySelector("#chat-avatar");

const audioCallBtn =
  document.querySelector("#audio-call-btn");

const videoCallBtn =
  document.querySelector("#video-call-btn");

const chatMenuBtn =
  document.querySelector("#chat-menu-btn");

const chatMenu =
  document.querySelector("#chat-menu");

const moreMenuBtn =
  document.querySelector("#more-menu-btn");

const moreMenu =
  document.querySelector("#more-menu");

const newGroupBtn =
  document.querySelector("#new-group-btn");

const viewContactBtn =
  document.querySelector("#view-contact-btn");

const chatThemeBtn =
  document.querySelector("#chat-theme-btn");

const reportUserBtn =
  document.querySelector("#report-user-btn");

const blockUserBtn =
  document.querySelector("#block-user-btn");

const clearChatBtn =
  document.querySelector("#clear-chat-btn");


/* MESSAGES */

const messagesElement =
  document.querySelector("#messages");

const messageForm =
  document.querySelector("#message-form");

const messageInput =
  document.querySelector("#message-input");


/* OPTIONAL CALL ELEMENTS */

const callModal =
  document.querySelector("#call-modal");

const localVideo =
  document.querySelector("#local-video");

const remoteVideo =
  document.querySelector("#remote-video");

const endCallBtn =
  document.querySelector("#end-call-btn");

const audioCallPlaceholder =
  document.querySelector("#audio-call-placeholder");

const acceptCallBtn =
  document.querySelector("#accept-call-btn");

const rejectCallBtn =
  document.querySelector("#reject-call-btn");


/* HELPERS */

function has(element) {
  return element !== null;
}

function getInitial(text) {
  return (
    String(text || "")
      .trim()
      .charAt(0)
      .toUpperCase() || "U"
  );
}

function escapeHtml(text) {
  const div =
    document.createElement("div");

  div.textContent =
    String(text || "");

  return div.innerHTML;
}

function getChatId(uid1, uid2) {
  return [uid1, uid2]
    .sort()
    .join("_");
}

function getCallId(uid1, uid2) {
  return [uid1, uid2]
    .sort()
    .join("_");
}

function formatDate(timestamp) {
  if (!timestamp || !timestamp.toDate) {
    return "";
  }

  return timestamp.toDate().toLocaleDateString(
    "en-IN",
    {
      day: "2-digit",
      month: "short",
      year: "numeric"
    }
  );
}

function formatTime(timestamp) {
  if (!timestamp || !timestamp.toDate) {
    return "";
  }

  return timestamp.toDate().toLocaleTimeString(
    "en-IN",
    {
      hour: "2-digit",
      minute: "2-digit"
    }
  );
}

function formatLastSeen(timestamp) {
  if (!timestamp || !timestamp.toDate) {
    return "Last seen unavailable";
  }

  return `Last seen ${formatDate(timestamp)} at ${formatTime(timestamp)}`;
}

function setAuthMessage(message) {
  if (has(authMessage)) {
    authMessage.textContent =
      message || "";
  }
}


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
      setAuthMessage(
        "All fields required"
      );

      return;
    }

    if (password.length < 6) {
      setAuthMessage(
        "Password kam se kam 6 characters ka hona chahiye"
      );

      return;
    }

    try {
      signupBtn.disabled = true;
      signupBtn.textContent =
        "Creating...";

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
          phone: "",
          isOnline: true,
          lastSeen: serverTimestamp(),
          createdAt: serverTimestamp()
        }
      );

      setAuthMessage(
        "Signup successful"
      );

      nameInput.value = "";
      emailInput.value = "";
      passwordInput.value = "";
    } catch (error) {
      console.error(
        "Signup error:",
        error
      );

      setAuthMessage(
        getFriendlyError(error)
      );
    } finally {
      signupBtn.disabled = false;
      signupBtn.textContent =
        "Create Account";
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
      setAuthMessage(
        "Email aur password enter karo"
      );

      return;
    }

    try {
      loginBtn.disabled = true;
      loginBtn.textContent =
        "Logging in...";

      await signInWithEmailAndPassword(
        auth,
        email,
        password
      );

      setAuthMessage("");
    } catch (error) {
      console.error(
        "Login error:",
        error
      );

      setAuthMessage(
        getFriendlyError(error)
      );
    } finally {
      loginBtn.disabled = false;
      loginBtn.textContent =
        "Login";
    }
  }
);


/* AUTH STATE */

onAuthStateChanged(
  auth,
  async (user) => {
    if (!user) {
      await cleanUp();
      authSection.classList.remove(
        "hidden"
      );
      chatSection.classList.add(
        "hidden"
      );
      return;
    }

    currentUser =
      user;

    try {
      const profileSnapshot =
        await getDoc(
          doc(db, "users", user.uid)
        );

      currentUserData =
        profileSnapshot.exists()
          ? profileSnapshot.data()
          : {
              uid: user.uid,
              name: user.email,
              email: user.email
            };

      const name =
        currentUserData.name ||
        user.displayName ||
        user.email ||
        "User";

      currentUserElement.textContent =
        name;

      myAvatar.textContent =
        getInitial(name);

      if (has(myOnlineDot)) {
        myOnlineDot.classList.add(
          "online"
        );
      }

      await setUserPresence(true);

      authSection.classList.add(
        "hidden"
      );

      chatSection.classList.remove(
        "hidden"
      );

      resetChatScreen();
      loadUsers();
      listenForIncomingCalls();
    } catch (error) {
      console.error(
        "Auth profile error:",
        error
      );

      setAuthMessage(
        "Profile load nahi ho saka"
      );
    }
  }
);


/* LOGOUT */

logoutBtn.addEventListener(
  "click",
  async () => {
    try {
      await setUserPresence(false);
      await signOut(auth);
    } catch (error) {
      console.error(
        "Logout error:",
        error
      );
    }
  }
);


/* PRESENCE */

async function setUserPresence(isOnline) {
  if (!currentUser) {
    return;
  }

  try {
    await setDoc(
      doc(db, "users", currentUser.uid),
      {
        isOnline,
        lastSeen: serverTimestamp()
      },
      {
        merge: true
      }
    );
  } catch (error) {
    console.error(
      "Presence error:",
      error
    );
  }
}

window.addEventListener(
  "beforeunload",
  () => {
    if (currentUser) {
      setUserPresence(false);
    }
  }
);


/* USERS */

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
      async (snapshot) => {
        const users =
          [];

        snapshot.forEach(
          (userDoc) => {
            const user =
              userDoc.data();

            if (
              currentUser &&
              user.uid !== currentUser.uid
            ) {
              users.push(user);
            }
          }
        );

        allUsers =
          await Promise.all(
            users.map(
              (user) =>
                addUnreadCount(user)
            )
          );

        displayUsers(allUsers);
      },
      (error) => {
        console.error(
          "Users listener error:",
          error
        );

        usersList.innerHTML =
          "<p class='no-user'>Users load nahi ho paaye</p>";
      }
    );
}

async function addUnreadCount(user) {
  if (!currentUser) {
    return {
      ...user,
      unreadCount: 0
    };
  }

  try {
    const chatId =
      getChatId(
        currentUser.uid,
        user.uid
      );

    const unreadQuery =
      query(
        collection(
          db,
          "chats",
          chatId,
          "messages"
        ),
        where(
          "receiverId",
          "==",
          currentUser.uid
        ),
        where(
          "isRead",
          "==",
          false
        )
      );

    const snapshot =
      await getDocs(unreadQuery);

    return {
      ...user,
      unreadCount: snapshot.size
    };
  } catch (error) {
    console.error(
      "Unread count error:",
      error
    );

    return {
      ...user,
      unreadCount: 0
    };
  }
}

function displayUsers(users) {
  const searchText =
    userSearchInput.value
      .trim()
      .toLowerCase();

  const filteredUsers =
    users.filter(
      (user) => {
        const name =
          String(user.name || "")
            .toLowerCase();

        const email =
          String(user.email || "")
            .toLowerCase();

        const phone =
          String(user.phone || "")
            .toLowerCase();

        return (
          name.includes(searchText) ||
          email.includes(searchText) ||
          phone.includes(searchText)
        );
      }
    );

  usersList.innerHTML = "";

  usersCount.textContent =
    filteredUsers.length;

  if (!filteredUsers.length) {
    usersList.innerHTML =
      "<p class='no-user'>No user found</p>";

    return;
  }

  filteredUsers.forEach(
    (user) => {
      const userName =
        user.name ||
        user.email ||
        "User";

      const userElement =
        document.createElement("div");

      const selected =
        selectedUser &&
        selectedUser.uid === user.uid;

      const online =
        user.isOnline === true;

      const unread =
        Number(user.unreadCount || 0);

      userElement.className =
        `user-item${selected ? " active" : ""}`;

      userElement.innerHTML = `
        <div class="user-avatar">
          ${escapeHtml(getInitial(userName))}
        </div>

        <div class="user-main-info">
          <div class="user-name-row">
            <strong class="user-name">
              ${escapeHtml(userName)}
            </strong>
          </div>

          <span class="user-preview">
            ${online ? "Online" : "Offline"}
          </span>
        </div>

        <div class="user-meta">
          <span
            class="user-online-dot ${online ? "online" : ""}"
          ></span>

          ${
            unread > 0
              ? `<span class="unread-badge">${unread}</span>`
              : ""
          }
        </div>
      `;

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


/* CHAT */

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

async function openChat(user) {
  if (!currentUser || !user) {
    return;
  }

  selectedUser =
    user;

  const userName =
    user.name ||
    user.email ||
    "User";

  chatTitle.textContent =
    userName;

  chatStatus.textContent =
    user.isOnline
      ? "Online"
      : "Offline";

  chatLastSeen.textContent =
    formatLastSeen(user.lastSeen);

  chatAvatar.textContent =
    getInitial(userName);

  audioCallBtn.disabled = false;
  videoCallBtn.disabled = false;
  chatMenuBtn.disabled = false;

  typingIndicator.classList.add(
    "hidden"
  );

  chatMenu.classList.add(
    "hidden"
  );

  moreMenu.classList.add(
    "hidden"
  );

  messagesElement.innerHTML =
    "";

  stopAllChatListeners();

  try {
    const chatId =
      await ensureChatExists(user);

    await markMessagesRead(
      chatId,
      user.uid
    );

    listenSelectedUser(user.uid);
    listenTyping(user.uid);
    listenMessages(chatId);
  } catch (error) {
    console.error(
      "Open chat error:",
      error
    );

    messagesElement.innerHTML =
      "<p>Chat open nahi ho saki</p>";
  }
}

function listenMessages(chatId) {
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
              messageDoc.data(),
              messageDoc.id
            );
          }
        );

        messagesElement.scrollTop =
          messagesElement.scrollHeight;
      },
      (error) => {
        console.error(
          "Messages listener error:",
          error
        );

        messagesElement.innerHTML =
          "<p>Messages load nahi ho paaye</p>";
      }
    );
}

function listenSelectedUser(userId) {
  unsubscribeSelectedUser =
    onSnapshot(
      doc(db, "users", userId),
      (snapshot) => {
        if (!snapshot.exists()) {
          return;
        }

        const user =
          snapshot.data();

        selectedUser = {
          ...selectedUser,
          ...user
        };

        chatStatus.textContent =
          user.isOnline
            ? "Online"
            : "Offline";

        chatLastSeen.textContent =
          formatLastSeen(user.lastSeen);
      }
    );
}


/* TYPING */

function listenTyping(userId) {
  if (!currentUser) {
    return;
  }

  const typingId =
    getChatId(
      currentUser.uid,
      userId
    );

  unsubscribeTyping =
    onSnapshot(
      doc(db, "typing", typingId),
      (snapshot) => {
        if (!snapshot.exists()) {
          typingIndicator.classList.add(
            "hidden"
          );

          return;
        }

        const data =
          snapshot.data();

        const typing =
          data[userId] === true;

        typingIndicator.classList.toggle(
          "hidden",
          !typing
        );
      }
    );
}

function sendTypingStatus(value) {
  if (!currentUser || !selectedUser) {
    return;
  }

  const typingId =
    getChatId(
      currentUser.uid,
      selectedUser.uid
    );

  setDoc(
    doc(db, "typing", typingId),
    {
      [currentUser.uid]: value,
      updatedAt: serverTimestamp()
    },
    {
      merge: true
    }
  ).catch(
    (error) => {
      console.error(
        "Typing update error:",
        error
      );
    }
  );
}

function stopTyping() {
  clearTimeout(
    typingTimer
  );

  if (!isTyping) {
    return;
  }

  isTyping =
    false;

  sendTypingStatus(false);
}

messageInput.addEventListener(
  "input",
  () => {
    if (!selectedUser) {
      return;
    }

    clearTimeout(
      typingTimer
    );

    if (!isTyping) {
      isTyping =
        true;

      sendTypingStatus(true);
    }

    typingTimer =
      setTimeout(
        stopTyping,
        1500
      );
  }
);


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
        await ensureChatExists(
          selectedUser
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
          createdAt: serverTimestamp(),
          isRead: false,
          deleted: false
        }
      );

      messageInput.value =
        "";

      stopTyping();

      await refreshUnreadCounts();
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


/* DISPLAY MESSAGE */


function showMessage(message, messageId) {
  const mine =
    message.senderId === currentUser.uid;

  const wrapper =
    document.createElement("div");

  wrapper.className =
    "message-wrapper";

  if (mine) {
    wrapper.classList.add(
      "my-message-wrapper"
    );
  }

  const bubble =
    document.createElement("div");

  bubble.className =
    `message${mine ? " my-message" : ""}`;

  const deleted =
    message.deleted === true;

  bubble.innerHTML = `
    <div class="${deleted ? "deleted-message" : ""}">
      ${
        deleted
          ? "This message was deleted"
          : escapeHtml(message.text)
      }
    </div>

    <span class="message-time">
      ${formatTime(message.createdAt)}
    </span>
  `;

  wrapper.appendChild(
    bubble
  );

  if (mine && !deleted) {
    const menuButton =
      document.createElement("button");

    menuButton.className =
      "message-menu-btn";

    menuButton.type =
      "button";

    menuButton.textContent =
      "⋮";

    const menu =
      document.createElement("div");

    menu.className =
      "message-menu hidden";

    const deleteButton =
      document.createElement("button");

    deleteButton.className =
      "message-delete-btn";

    deleteButton.type =
      "button";

    deleteButton.textContent =
      "Delete message";

    deleteButton.addEventListener(
      "click",
      async () => {
        const confirmDelete =
          confirm(
            "Kya aap ye message delete karna chahte ho?"
          );

        if (!confirmDelete) {
          return;
        }

        await deleteOneMessage(
          messageId
        );
      }
    );

    menu.appendChild(
      deleteButton
    );

    menuButton.addEventListener(
      "click",
      (event) => {
        event.stopPropagation();

        menu.classList.toggle(
          "hidden"
        );
      }
    );

    wrapper.appendChild(
      menuButton
    );

    wrapper.appendChild(
      menu
    );
  }

  messagesElement.appendChild(
    wrapper
  );
}


/* DELETE ONE MESSAGE */

async function deleteOneMessage(messageId) {
  if (!currentUser || !selectedUser) {
    return;
  }

  try {
    const chatId =
      getChatId(
        currentUser.uid,
        selectedUser.uid
      );

    const messageRef =
      doc(
        db,
        "chats",
        chatId,
        "messages",
        messageId
      );

    await updateDoc(
      messageRef,
      {
        deleted: true,
        text: "",
        deletedAt: serverTimestamp()
      }
    );
  } catch (error) {
    console.error(
      "Delete message error:",
      error
    );

    alert(
      "Message delete nahi ho saka"
    );
  }
}


/* MARK READ */

async function markMessagesRead(
  chatId,
  senderId
) {
  if (!currentUser) {
    return;
  }

  const unreadQuery =
    query(
      collection(
        db,
        "chats",
        chatId,
        "messages"
      ),
      where(
        "receiverId",
        "==",
        currentUser.uid
      ),
      where(
        "senderId",
        "==",
        senderId
      ),
      where(
        "isRead",
        "==",
        false
      )
    );

  const snapshot =
    await getDocs(unreadQuery);

  if (snapshot.empty) {
    return;
  }

  const batch =
    writeBatch(db);

  snapshot.forEach(
    (messageDoc) => {
      batch.update(
        messageDoc.ref,
        {
          isRead: true,
          readAt: serverTimestamp()
        }
      );
    }
  );

  await batch.commit();

  await refreshUnreadCounts();
}

async function refreshUnreadCounts() {
  if (!currentUser) {
    return;
  }

  allUsers =
    await Promise.all(
      allUsers.map(
        (user) =>
          addUnreadCount(user)
      )
    );

  displayUsers(allUsers);
}

/* CLEAR CHAT */

async function clearCurrentChat() {
  if (!currentUser || !selectedUser) {
    return;
  }

  const confirmClear =
    confirm(
      "Kya aap is chat ke saare messages clear karna chahte ho?"
    );

  if (!confirmClear) {
    return;
  }

  try {
    const chatId =
      getChatId(
        currentUser.uid,
        selectedUser.uid
      );

    const messagesSnapshot =
      await getDocs(
        collection(
          db,
          "chats",
          chatId,
          "messages"
        )
      );

    const batch =
      writeBatch(db);

    messagesSnapshot.forEach(
      (messageDoc) => {
        batch.delete(
          messageDoc.ref
        );
      }
    );

    await batch.commit();

    messagesElement.innerHTML = `
      <div class="empty-chat">
        <div class="empty-icon">👋</div>
        <h2>Say Hello</h2>
        <p>Start your first conversation.</p>
      </div>
    `;

    await refreshUnreadCounts();
  } catch (error) {
    console.error(
      "Clear chat error:",
      error
    );

    alert(
      "Chat clear nahi ho saki"
    );
  }
}


/* MENU */

chatMenuBtn.addEventListener(
  "click",
  (event) => {
    event.stopPropagation();

    if (!selectedUser) {
      return;
    }

    chatMenu.classList.toggle(
      "hidden"
    );

    moreMenu.classList.add(
      "hidden"
    );
  }
);

moreMenuBtn.addEventListener(
  "click",
  (event) => {
    event.stopPropagation();

    moreMenu.classList.toggle(
      "hidden"
    );
  }
);

document.addEventListener(
  "click",
  () => {
    chatMenu.classList.add(
      "hidden"
    );

    moreMenu.classList.add(
      "hidden"
    );
  }
);

newGroupBtn.addEventListener(
  "click",
  () => {
    alert(
      "New group feature next phase me add hoga."
    );
  }
);

viewContactBtn.addEventListener(
  "click",
  () => {
    if (!selectedUser) {
      return;
    }

    alert(
      `Name: ${selectedUser.name || "User"}
` +
      `Email: ${selectedUser.email || "Not available"}
` +
      `Phone: ${selectedUser.phone || "Not available"}`
    );
  }
);

chatThemeBtn.addEventListener(
  "click",
  () => {
    document.body.classList.toggle(
      "dark-chat-theme"
    );
  }
);

reportUserBtn.addEventListener(
  "click",
  () => {
    if (!selectedUser) {
      return;
    }

    alert(
      `${selectedUser.name || "User"} reported.`
    );
  }
);

blockUserBtn.addEventListener(
  "click",
  async () => {
    if (!selectedUser || !currentUser) {
      return;
    }

    try {
      await setDoc(
        doc(
          db,
          "users",
          currentUser.uid,
          "blockedUsers",
          selectedUser.uid
        ),
        {
          uid: selectedUser.uid,
          name: selectedUser.name || "",
          createdAt: serverTimestamp()
        }
      );

      alert(
        "User blocked."
      );
    } catch (error) {
      console.error(
        "Block user error:",
        error
      );

      alert(
        "User block nahi ho saka."
      );
    }
  }
);

clearChatBtn.addEventListener(
  "click",
  async () => {
    chatMenu.classList.add(
      "hidden"
    );

    moreMenu.classList.add(
      "hidden"
    );

    await clearCurrentChat();
  }
);


/* RESET */

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

  chatLastSeen.textContent =
    "";

  chatAvatar.textContent =
    "?";

  typingIndicator.classList.add(
    "hidden"
  );

  audioCallBtn.disabled = true;
  videoCallBtn.disabled = true;
  chatMenuBtn.disabled = true;

  chatMenu.classList.add(
    "hidden"
  );

  moreMenu.classList.add(
    "hidden"
  );
}


/* STOP LISTENERS */

function stopAllChatListeners() {
  if (unsubscribeMessages) {
    unsubscribeMessages();
    unsubscribeMessages = null;
  }

  if (unsubscribeSelectedUser) {
    unsubscribeSelectedUser();
    unsubscribeSelectedUser = null;
  }

  if (unsubscribeTyping) {
    unsubscribeTyping();
    unsubscribeTyping = null;
  }

  stopTyping();
}


/* CLEANUP */

async function cleanUp() {
  stopAllChatListeners();

  if (unsubscribeUsers) {
    unsubscribeUsers();
    unsubscribeUsers = null;
  }

  if (unsubscribeIncomingCalls) {
    unsubscribeIncomingCalls();
    unsubscribeIncomingCalls = null;
  }

  await closeCall();

  currentUser =
    null;

  currentUserData =
    null;

  selectedUser =
    null;

  allUsers =
    [];
}


/* WEBRTC CALLING */

const rtcConfiguration = {
  iceServers: [
    {
      urls: "stun:stun.l.google.com:19302"
    }
  ]
};

async function startCall(type) {
  if (!currentUser || !selectedUser) {
    return;
  }

  try {
    activeCallId =
      getCallId(
        currentUser.uid,
        selectedUser.uid
      );

    const callRef =
      doc(
        db,
        "calls",
        activeCallId
      );

    peerConnection =
      new RTCPeerConnection(
        rtcConfiguration
      );

    localStream =
      await navigator.mediaDevices.getUserMedia(
        {
          audio: true,
          video: type === "video"
        }
      );

    localStream
      .getTracks()
      .forEach(
        (track) => {
          peerConnection.addTrack(
            track,
            localStream
          );
        }
      );

    if (has(localVideo)) {
      localVideo.srcObject =
        localStream;
    }

    peerConnection.onicecandidate =
      async (event) => {
        if (!event.candidate) {
          return;
        }

        await addDoc(
          collection(
            callRef,
            "callerCandidates"
          ),
          event.candidate.toJSON()
        );
      };

    peerConnection.ontrack =
      (event) => {
        if (has(remoteVideo)) {
          remoteVideo.srcObject =
            event.streams[0];
        }
      };

    const offer =
      await peerConnection.createOffer();

    await peerConnection.setLocalDescription(
      offer
    );

    await setDoc(
      callRef,
      {
        callerId: currentUser.uid,
        receiverId: selectedUser.uid,
        type,
        offer: {
          type: offer.type,
          sdp: offer.sdp
        },
        status: "ringing",
        createdAt: serverTimestamp()
      }
    );

    onSnapshot(
      callRef,
      async (snapshot) => {
        const data =
          snapshot.data();

        if (!data) {
          return;
        }

        if (
          data.answer &&
          !peerConnection.currentRemoteDescription
        ) {
          await peerConnection.setRemoteDescription(
            new RTCSessionDescription(
              data.answer
            )
          );
        }

        if (data.status === "ended") {
          await closeCall();
        }
      }
    );

    showCallModal();
  } catch (error) {
    console.error(
      "Start call error:",
      error
    );

    alert(
      "Call start nahi ho saki. Camera/microphone permission check karo."
    );

    await closeCall();
  }
}

async function acceptCall(callData) {
  try {
    activeCallId =
      callData.id;

    peerConnection =
      new RTCPeerConnection(
        rtcConfiguration
      );

    localStream =
      await navigator.mediaDevices.getUserMedia(
        {
          audio: true,
          video: callData.type === "video"
        }
      );

    localStream
      .getTracks()
      .forEach(
        (track) => {
          peerConnection.addTrack(
            track,
            localStream
          );
        }
      );

    if (has(localVideo)) {
      localVideo.srcObject =
        localStream;
    }

    peerConnection.ontrack =
      (event) => {
        if (has(remoteVideo)) {
          remoteVideo.srcObject =
            event.streams[0];
        }
      };

    const callRef =
      doc(
        db,
        "calls",
        activeCallId
      );

    peerConnection.onicecandidate =
      async (event) => {
        if (!event.candidate) {
          return;
        }

        await addDoc(
          collection(
            callRef,
            "calleeCandidates"
          ),
          event.candidate.toJSON()
        );
      };

    await peerConnection.setRemoteDescription(
      new RTCSessionDescription(
        callData.offer
      )
    );

    const answer =
      await peerConnection.createAnswer();

    await peerConnection.setLocalDescription(
      answer
    );

    await updateDoc(
      callRef,
      {
        answer: {
          type: answer.type,
          sdp: answer.sdp
        },
        status: "accepted"
      }
    );

    showCallModal();
  } catch (error) {
    console.error(
      "Accept call error:",
      error
    );

    alert(
      "Call accept nahi ho saki."
    );

    await closeCall();
  }
}

function listenForIncomingCalls() {
  if (!currentUser) {
    return;
  }

  const callsQuery =
    query(
      collection(db, "calls"),
      where(
        "receiverId",
        "==",
        currentUser.uid
      ),
      where(
        "status",
        "==",
        "ringing"
      )
    );

  unsubscribeIncomingCalls =
    onSnapshot(
      callsQuery,
      (snapshot) => {
        snapshot.docChanges()
          .forEach(
            (change) => {
              if (
                change.type !== "added"
              ) {
                return;
              }

              const callData = {
                id: change.doc.id,
                ...change.doc.data()
              };

              window.pendingCall =
                callData;

                showCallModal();

                if(has(audioCallPlaceholder)) {
                  audioCallPlaceholder.textContent =
                    callData.type === "video"
                      ? "Incoming video call..."
                      : "Incoming audio call...";
                }
            }
          );
      }
    );
}

async function closeCall() {
  if (activeCallId) {
    try {
      await updateDoc(
        doc(
          db,
          "calls",
          activeCallId
        ),
        {
          status: "ended",
          endedAt: serverTimestamp()
        }
      );
    } catch (error) {
      console.warn(
        "Call close update skipped:",
        error
      );
    }
  }

  if (peerConnection) {
    peerConnection.close();
    peerConnection = null;
  }

  if (localStream) {
    localStream
      .getTracks()
      .forEach(
        (track) => track.stop()
      );

    localStream = null;
  }

  if (has(localVideo)) {
    localVideo.srcObject =
      null;
  }

  if (has(remoteVideo)) {
    remoteVideo.srcObject =
      null;
  }

  activeCallId =
    null;

  hideCallModal();
}

function showCallModal() {
  if (has(callModal)) {
    callModal.classList.remove(
      "hidden"
    );
  }
}

function hideCallModal() {
  if (has(callModal)) {
    callModal.classList.add(
      "hidden"
    );
  }
}

if (has(audioCallBtn)) {
  audioCallBtn.addEventListener(
    "click",
    () => startCall("audio")
  );
}

if (has(videoCallBtn)) {
  videoCallBtn.addEventListener(
    "click",
    () => startCall("video")
  );
}

if (has(endCallBtn)) {
  endCallBtn.addEventListener(
    "click",
    closeCall
  );
}

if (has(acceptCallBtn)) {
  acceptCallBtn.addEventListener(
    "click",
    async () => {
      if (!window.pendingCall) {
        return;
      }

      const call =
        window.pendingCall;

      window.pendingCall =
        null;

      await acceptCall(call);
    }
  );
}

if (has(rejectCallBtn)) {
  rejectCallBtn.addEventListener(
    "click",
    async () => {
      if (window.pendingCall) {
        await updateDoc(
          doc(
            db,
            "calls",
            window.pendingCall.id
          ),
          {
            status: "rejected"
          }
        );

        window.pendingCall =
          null;
      }

      hideCallModal();
    }
  );
}


/* FRIENDLY AUTH ERROR */

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
