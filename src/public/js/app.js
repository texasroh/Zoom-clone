const socket = io();

const welcome = document.querySelector("#welcome");
const roomForm = welcome.querySelector("form");
const room = document.querySelector("#room");

room.hidden = true;

let roomName;

function addMessage(message) {
  console.log(message);
  const ul = room.querySelector("ul");
  const li = document.createElement("li");
  li.innerText = message;
  ul.appendChild(li);
}

roomForm.addEventListener("submit", handleRoomSubmit);

function showRoom() {
  welcome.hidden = true;
  room.hidden = false;
  const h3 = room.querySelector("h3");
  h3.innerText = `Room ${roomName}`;
  const msgForm = room.querySelector("#msg");
  msgForm.addEventListener("submit", handleMessageSubmit);
  const nickForm = room.querySelector("#nick");
  nickForm.addEventListener("submit", handleNickSubmit);
}

function handleNickSubmit(e) {
  e.preventDefault();
  const input = room.querySelector("#nick input");
  const nick = input.value;
  socket.emit("nick", nick);
}

function handleRoomSubmit(e) {
  e.preventDefault();
  const input = roomForm.querySelector("input");
  socket.emit("enter_room", input.value, showRoom);
  //console.log(input.value);
  roomName = input.value;
  console.log(input.value, roomName)
  input.value = "";
}

function handleMessageSubmit(e) {
  e.preventDefault();
  const input = room.querySelector("#msg input");
  const value = input.value;
  input.value = "";
  socket.emit("new_message", value, roomName, () => {
    addMessage(`You: ${value}`);
  });
}

socket.on("welcome", (user, cnt) => {
  const h3 = room.querySelector("h3");
  h3.innerText = `Room ${roomName} (${cnt})`;
  addMessage(`${user} Joined!`);
});

socket.on("bye", (left, newCount) => {
  const h3 = room.querySelector("h3");
  h3.innerText = `Room ${roomName} (${newCount})`;
  addMessage(`${left} left ㅠㅠ`);
});

socket.on("new_message_to_room", (msg) => {
  console.log("new_message received");
  addMessage(msg);
});

socket.on("nickChange", (oldNick, newNick) => {
  addMessage(`${oldNick} changed nickname to ${newNick}`);
});
