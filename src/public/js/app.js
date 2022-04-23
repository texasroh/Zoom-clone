const socket = io();

const myFace = document.querySelector('#myFace');
const muteBtn = document.querySelector('#mute');
const cameraBtn = document.querySelector('#camera');
const camerasSelect = document.querySelector('#cameras');

const call = document.querySelector('#call');

const chatDiv = document.querySelector('#chat');
const msgForm = document.querySelector('#chat form');

call.hidden=true;
chatDiv.hidden=true;

let myStream;
let muted = false;
let cameraOff = false;
let roomName;
let myPeerConnection;
let myDataChannel;

async function getCameras(deviceId) {
  try{
    const devices = await navigator.mediaDevices.enumerateDevices();
    const cameras = devices.filter(device => device.kind === 'videoinput');
    const currentCamera = myStream.getVideoTracks()[0];
    cameras.forEach(camera => {
      const option = document.createElement('option');
      option.value = camera.deviceId;
      option.innerText = camera.label;
      if (currentCamera.label === camera.label){
        option.selected = true;
      }
      camerasSelect.appendChild(option);
    })
  }catch(e){
    console.log(e);
  }
}

async function getMedia(deviceId){
  const initialConstraints = {
    audio:true,
    video:{facingMode:"user"},
  }
  const cameraConstraints = {
    audio:true,
    video:{deviceId :{ exact:deviceId}}
  }
  try{
    myStream = await navigator.mediaDevices.getUserMedia(deviceId?cameraConstraints:initialConstraints);
    myFace.srcObject = myStream;
    if (!deviceId){
      await getCameras();
    }
  } catch(e){
    console.log(e);
  }
}


function handleMuteBtn() {
  myStream.getAudioTracks().forEach(track => (track.enabled = !track.enabled));
  if(!muted){
    muteBtn.innerText="Unmute";
    muted = true;
  } else {
    muteBtn.innerText="Mute";
    muted = false;
  }
}
function handleCameraBtn() {
  myStream.getVideoTracks().forEach(track => (track.enabled = !track.enabled));
  if(cameraOff){
    cameraBtn.innerText="Turn Camera Off"
    cameraOff = false;
  } else {
    cameraBtn.innerText="Turn Camera On"
    cameraOff = true;
  }
}

async function handleCameraChange() {
  await getMedia(camerasSelect.value);
  if (myPeerConnection){
    const videoTrack = myStream.getVideoTracks()[0];
    const videoSender = myPeerConnection.getSenders().find(sender => sender.track.kind === 'video');
    videoSender.replaceTracke(videoTrack);
  }
}

muteBtn.addEventListener('click', handleMuteBtn);
cameraBtn.addEventListener('click', handleCameraBtn);
camerasSelect.addEventListener('input', handleCameraChange);


// Welcome Form (join a room)
const welcome = document.querySelector('#welcome');
const welcomeForm = welcome.querySelector('form');

async function initCall(){
  welcome.hidden=true;
  call.hidden=false;
  await getMedia();
  makeConnection();
}

welcomeForm.addEventListener('submit', handleWelcomeSubmit);

async function handleWelcomeSubmit(e) {
  e.preventDefault();
  const input = welcomeForm.querySelector('input');
  roomName = input.value;
  input.value = '';
  await initCall();
  socket.emit("join_room", roomName);
  socket.emit()
}


// Socket Code
socket.on('welcome', async () => {
  myDataChannel = myPeerConnection.createDataChannel("chat");
  chatDiv.hidden=false;
  myDataChannel.addEventListener('message', (e) => handleMsgReceived(e.data));
  const offer = await myPeerConnection.createOffer();
  myPeerConnection.setLocalDescription(offer);
  console.log('sent offer');
  socket.emit('offer', offer, roomName);
});
socket.on('offer', async (offer) => {
  chatDiv.hidden=false;
  myPeerConnection.addEventListener('datachannel', (event) =>{
    myDataChannel = event.channel;
    myDataChannel.addEventListener('message', (e) => handleMsgReceived(e.data));
  });
  console.log('received offer');
  myPeerConnection.setRemoteDescription(offer);
  const answer = await myPeerConnection.createAnswer()
  myPeerConnection.setLocalDescription(answer);
  console.log('sent answer');
  socket.emit('answer',answer, roomName);
});
socket.on('answer', (answer) => {
  console.log('received answer');
  myPeerConnection.setRemoteDescription(answer);
});
socket.on('ice', (ice) => {
  console.log('received candidate');
  myPeerConnection.addIceCandidate(ice);
})

//RTC Code
function makeConnection() {
  myPeerConnection = new RTCPeerConnection({
    iceServers:[
      {
        urls:[
          "stun:stun.l.google.com:19302",
          "stun:stun1.l.google.com:19302",
          "stun:stun2.l.google.com:19302",
          "stun:stun3.l.google.com:19302",
          "stun:stun4.l.google.com:19302",
        ],
      },
    ],
  });
  myPeerConnection.addEventListener('icecandidate', handleIce);
  myPeerConnection.addEventListener('addstream', handleAddStream);
  myStream.getTracks().forEach((track) => myPeerConnection.addTrack(track, myStream));
}

function handleIce(data){
  console.log('sent candidate');
  socket.emit('ice', data.candidate, roomName);
}

function handleAddStream(data){
  console.log('got stream from peer');
  const peerFace = document.querySelector('#peerFace');
  peerFace.srcObject = data.stream;
}

//Chat (data channel)

msgForm.addEventListener('submit', handleMsgSubmit);

function handleMsgSubmit(e){
  e.preventDefault();
  const input = msgForm.querySelector('input');
  const msg = input.value;
  input.value = '';
  myDataChannel.send(msg);
  showMessage(`You: ${msg}`);
}

function handleMsgReceived(msg){
  showMessage(`Other: ${msg}`);
}

function showMessage(msg){
  const li = document.createElement('li');
  li.innerText = msg;
  const ul = chatDiv.querySelector('ul');
  ul.appendChild(li);
}