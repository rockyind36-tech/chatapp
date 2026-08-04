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
  doc,
  query,
  where,
  orderBy,
  limit,
  onSnapshot,
  serverTimestamp,
  writeBatch,
  deleteDoc
} from "https://www.gstatic.com/firebasejs/12.0.0/firebase-firestore.js";

import {
  firebaseConfig
} from "./firebase-config.js";


/* FIREBASE INITIALIZE */

const app =
  initializeApp(firebaseConfig);

const auth =
  getAuth(app);

const db =
  getFirestore(app);


/* APP STATE */

let currentUser = null;
let currentUserData = null;
let selectedUser = null;

let unsubscribeMessages = null;
let unsubscribeUsers = null;
let unsubscribeSelectedUser = null;

let allUsers = [];

let typingTimer = null;
let isTyping = false;


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

const myOnlineDot =
  document.querySelector("#my-online-dot");


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

const typingIndicator =
  document.querySelector("#typing-indicator");

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


/* SAFE ELEMENT CHECK */

function elementExists(element) {
  return element !== null;
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
          isOnline: true,
          lastSeen: serverTimestamp(),
          createdAt: serverTimestamp()
        }
      );

      authMessage.textContent =
        "Signup successful";

      nameInput.value = "";
      emailInput.value = "";
      passwordInput.value = "";
    } catch (error) {
      console.error(
        "Signup error:",
        error
      );

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
      console.error(
        "Login error:",
        error
      );

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

        currentUserData =
          userSnapshot.exists()
            ? userSnapshot.data()
            : {};

        const userName =
          currentUserData.name ||
          user.displayName ||
          user.email ||
          "User";

        currentUserElement.textContent =
          userName;

        myAvatar.textContent =
          getInitial(userName);

        if (elementExists(myOnlineDot)) {
          myOnlineDot.classList.add(
            "online"
          );
        }

        await setUserOnline(true);

        authSection.classList.add(
          "hidden"
        );

        chatSection.classList.remove(
          "hidden"
        );

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
      await cleanUserState();

      authSection.classList.remove(
        "hidden"
      );

      chatSection.classList.add(
        "hidden"
      );
    }
  }
);


/* LOGOUT */

logoutBtn.addEventListener(
  "click",
  async () => {
    try {
      await setUserOnline(false);
      await signOut(auth);
    } catch (error) {
      console.error(
        "Logout error:",
        error
      );
    }
  }
);


/* USER ONLINE STATUS */

async function setUserOnline(isOnline) {
  if (!currentUser) {
    return;
  }

  try {
    await updateDoc(
      doc(db, "users", currentUser.uid),
      {
        isOnline,
        lastSeen: serverTimestamp()
      }
    );
  } catch (error) {
    console.error(
      "Online status error:",
      error
    );
  }
}

window.addEventListener(
  "beforeunload",
  () => {
    if (currentUser) {
      setUserOnline(false);
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
      async (snapshot) => {
        const userPromises = [];

        snapshot.forEach(
          (userDoc) => {
            const user =
              userDoc.data();

            if (
              currentUser &&
              user.uid !== currentUser.uid
            ) {
              userPromises.push(
                attachUnreadCount(user)
              );
            }
          }
        );

        allUsers =
          await Promise.all(userPromises);

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


/* ADD UNREAD COUNT TO USER */

async function attachUnreadCount(user) {
  if (!currentUser || !user.uid) {
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

    const unreadSnapshot =
      await getDocs(unreadQuery);

    return {
      ...user,
      unreadCount: unreadSnapshot.size
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


/* DISPLAY USERS */

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

      const userName =
        user.name ||
        user.email ||
        "User";

      const isOnline =
        user.isOnline === true;

      const isSelected =
        selectedUser &&
        selectedUser.uid === user.uid;

      const unreadCount =
        Number(user.unreadCount || 0);

      userElement.className =
        `user-item${isSelected ? " active" : ""}`;

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
            ${isOnline ? "Online" : "Offline"}
          </span>
        </div>

        <div class="user-meta">
          <span
            class="user-online-dot ${isOnline ? "online" : ""}"
          ></span>

          ${
            unreadCount > 0
              ? `<span class="unread-badge">${unreadCount}</span>`
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


/* SEARCH */

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


/* CREATE CHAT */

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
    user.isOnline === true
      ? "Online"
      : "Offline";

  chatAvatar.textContent =
    getInitial(userName);

  deleteChatBtn.classList.remove(
    "hidden"
  );

  typingIndicator.classList.add(
    "hidden"
  );

  messagesElement.innerHTML = "";

  if (unsubscribeMessages) {
    unsubscribeMessages();
    unsubscribeMessages = null;
  }

  if (unsubscribeSelectedUser) {
    unsubscribeSelectedUser();
    unsubscribeSelectedUser = null;
  }

  try {
    const chatId =
      await ensureChatExists(user);

    await markMessagesAsRead(
      chatId,
      user.uid
    );

    listenToSelectedUser(user.uid);
    listenToTyping(user.uid);

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
          messagesElement.innerHTML = "";

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

    alert(
      "Chat open nahi ho saki"
    );
  }
}


/* SELECTED USER LIVE STATUS */

function listenToSelectedUser(userId) {
  const userRef =
    doc(db, "users", userId);

  unsubscribeSelectedUser =
    onSnapshot(
      userRef,
      (snapshot) => {
        if (!snapshot.exists()) {
          return;
        }

        const user =
          snapshot.data();

        if (
          selectedUser &&
          selectedUser.uid === userId
        ) {
          selectedUser = {
            ...selectedUser,
            ...user
          };

          chatStatus.textContent =
            user.isOnline === true
              ? "Online"
              : "Offline";
        }
      }
    );
}


/* DISPLAY MESSAGE */

function showMessage(message, messageId) {
  const isMine =
    currentUser &&
    message.senderId === currentUser.uid;

  const messageWrapper =
    document.createElement("div");

  messageWrapper.className =
    "message-wrapper";

  if (isMine) {
    messageWrapper.classList.add(
      "my-message-wrapper"
    );
  }

  const messageElement =
    document.createElement("div");

  messageElement.className =
    "message";

  if (isMine) {
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

  const isDeleted =
    message.deleted === true;

  messageElement.innerHTML = `
    <div class="${isDeleted ? "deleted-message" : ""}">
      ${
        isDeleted
          ? "This message was deleted"
          : escapeHtml(message.text || "")
      }
    </div>

    <span class="message-time">
      ${messageTime}
    </span>
  `;

  messageWrapper.appendChild(
    messageElement
  );

  if (isMine && !isDeleted) {
    const menuButton =
      document.createElement("button");

    menuButton.className =
      "message-menu-btn";

    menuButton.type =
      "button";

    menuButton.textContent =
      "⋮";

    menuButton.title =
      "Message options";

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
      async (event) => {
        event.stopPropagation();

        const confirmed =
          confirm(
            "Kya aap ye message delete karna chahte ho?"
          );

        if (!confirmed) {
          return;
        }

        await deleteSingleMessage(
          messageId
        );
      }
    );

    menu.appendChild(
      deleteButton
    );

    messageWrapper.appendChild(
      menu
    );

    menuButton.addEventListener(
      "click",
      (event) => {
        event.stopPropagation();

        menu.classList.toggle(
          "hidden"
        );

        messageWrapper.classList.toggle(
          "menu-open"
        );
      }
    );

    messageWrapper.appendChild(
      menuButton
    );
  }

  messagesElement.appendChild(
    messageWrapper
  );
}


/* DELETE ONE MESSAGE */

async function deleteSingleMessage(
  messageId
) {
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
      "Message delete nahi ho saka. Firestore Rules check karo."
    );
  }
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

      messageInput.value = "";
      messageInput.focus();

      stopTyping();
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


/* MARK MESSAGES READ */

async function markMessagesAsRead(
  chatId,
  senderId
) {
  if (!currentUser) {
    return;
  }

  try {
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
    });

    await batch.commit();

    refreshUnreadCounts();
  } catch (error) {
    console.error(
      "Read messages error:",
      error
    );
  }
}


/* REFRESH UNREAD COUNTS */

async function refreshUnreadCounts() {
  if (!currentUser) {
    return;
  }

  const refreshedUsers = [];

  for (const user of allUsers) {
    const updatedUser =
      await attachUnreadCount(user);

    refreshedUsers.push(
      updatedUser
    );
  }

  allUsers =
    refreshedUsers;

  displayUsers(allUsers);
}


/* TYPING INDICATOR */

messageInput.addEventListener(
  "input",
  () => {
    if (!selectedUser || !currentUser) {
      return;
    }

    clearTimeout(
      typingTimer
    );

    if (!isTyping) {
      isTyping = true;

      sendTypingStatus(
        true
      );
    }

    typingTimer =
      setTimeout(
        () => {
          stopTyping();
        },
        1500
      );
  }
);


/* SEND TYPING STATUS */

async function sendTypingStatus(
  typing
) {
  if (!currentUser || !selectedUser) {
    return;
  }

  const typingId =
    getChatId(
      currentUser.uid,
      selectedUser.uid
    );

  try {
    await setDoc(
      doc(
        db,
        "typing",
        typingId
      ),
      {
        [`${currentUser.uid}`]: typing,
        updatedAt: serverTimestamp()
      },
      {
        merge: true
      }
    );
  } catch (error) {
    console.error(
      "Typing status error:",
      error
    );
  }
}


/* STOP TYPING */

function stopTyping() {
  clearTimeout(
    typingTimer
  );

  if (!isTyping) {
    return;
  }

  isTyping = false;

  sendTypingStatus(
    false
  );
}


/* LISTEN TYPING STATUS */

function listenToTyping(userId) {
  if (!currentUser) {
    return;
  }

  const typingId =
    getChatId(
      currentUser.uid,
      userId
    );

  onSnapshot(
    doc(db, "typing", typingId),
    (snapshot) => {
      if (!snapshot.exists()) {
        return;
      }

      const data =
        snapshot.data();

      const otherUserTyping =
        data[userId] === true;

      if (otherUserTyping) {
        typingIndicator.classList.remove(
          "hidden"
        );
      } else {
        typingIndicator.classList.add(
          "hidden"
        );
      }
    }
  );
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

  typingIndicator.classList.add(
    "hidden"
  );

  deleteChatBtn.classList.add(
    "hidden"
  );
}


/* DELETE FULL CHAT */

deleteChatBtn.addEventListener(
  "click",
  deleteCurrentChat
);

async function deleteCurrentChat() {
  if (!currentUser || !selectedUser) {
    alert(
      "Pehle chat select karo"
    );

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
      await getDocs(
        messagesRef
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

    batch.delete(
      doc(
        db,
        "chats",
        chatId
      )
    );

    await batch.commit();

    if (unsubscribeMessages) {
      unsubscribeMessages();
      unsubscribeMessages = null;
    }

    selectedUser = null;
    resetChatScreen();

    alert(
      "Chat delete ho gayi"
    );
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


/* CLEAN USER STATE */

async function cleanUserState() {
  try {
    if (unsubscribeMessages) {
      unsubscribeMessages();
      unsubscribeMessages = null;
    }

    if (unsubscribeUsers) {
      unsubscribeUsers();
      unsubscribeUsers = null;
    }

    if (unsubscribeSelectedUser) {
      unsubscribeSelectedUser();
      unsubscribeSelectedUser = null;
    }

    currentUser = null;
    currentUserData = null;
    selectedUser = null;
    allUsers = [];
  } catch (error) {
    console.error(
      "Clean state error:",
      error
    );
  }
}


/* ESCAPE HTML */

function escapeHtml(text) {
  const div =
    document.createElement(
      "div"
    );

  div.textContent =
    text;

  return div.innerHTML;
}


/* INITIAL */

function getInitial(text) {
  return (
    text
      .trim()
      .charAt(0)
      .toUpperCase() ||
    "U"
  );
}


/* FRIENDLY ERRORS */

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
