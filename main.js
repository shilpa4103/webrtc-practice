let APP_ID = "e5290af628b74af38dc80e47f2d3be26"; // copy paste here 
let token = null;
let uid = String(Math.floor(Math.random() * 10000));

let client;
let channel;

let queryString = window.location.search
let urlParams = new URLSearchParams(queryString)
let roomId = urlParams.get('room')
if(!roomId){
    window.location = 'lobby.html'
}

let localStream; // variable will hold the local media stream (camera and microphone).
let remoteStream; // variable will hold the remote media stream received from another user.
let peerConnection; // variable represents the WebRTC peer connection between the local and remote users.

// ICE(Interactive Connectivity establishment). ICE servers are required for NAT traversal in WebRTC.
const servers = {
    iceServers: [
        { urls: 'stun:stun1.l.google.com:19302' },
        { urls: 'stun:stun2.l.google.com:19302' }
    ]
};


let constraints={
    video:{
        width:{min:640,ideal:1920,max:1920},
        height:{min:400,ideal:1080,max:1080},
    },
    audio:true
}

let init = async () => {
    try {
        client = await AgoraRTM.createInstance(APP_ID);
        await client.login({ uid, token });
        
        channel = client.createChannel(roomId);
        await channel.join();
        channel.on('MemberJoined', handleUserJoined);
        channel.on('MemberLeft',handleUserLeft)

        client.on('MessageFromPeer', handleMessageFromPeer);

        localStream = await navigator.mediaDevices.getUserMedia(constraints);
        document.getElementById('user-1').srcObject = localStream;
    } catch (error) {
        console.error('Error initializing:', error);
    }
};

let handleUserLeft = (MemberId)=>{
    document.getElementById('user-2').style.display='none'
    document.getElementById('user-1').classList.remove('smallFrame')
}

let handleMessageFromPeer = async (message, MemberId) => {
    try {
        message = JSON.parse(message.text);

        if (message.type === 'offer') {
            await createAnswer(MemberId, message.offer);
        }
        if (message.type === 'answer') {
            addAnswer(message.answer);
        }
        if (message.type === 'candidate') {
            if (peerConnection) {
                await peerConnection.addIceCandidate(message.candidate);
            }
        }
    } catch (error) {
        console.error('Error handling message from peer:', error);
    }
};

let handleUserJoined = async (MemberId) => {
    console.log('A new user joined the channel:', MemberId);
    await createOffer(MemberId);
};

let createPeerConnection = async (MemberId) => {
    try {
        peerConnection = new RTCPeerConnection(servers);
        remoteStream = new MediaStream();
        document.getElementById('user-2').srcObject = remoteStream;
        document.getElementById('user-2').style.display='block'
        document.getElementById('user-1').classList.add('smallFrame')


        if (!localStream) {
            localStream = await navigator.mediaDevices.getUserMedia({ video: true, audio: true });
            document.getElementById('user-1').srcObject = localStream;
        }

        // Adds the tracks from the local media stream (localStream) to the peer connection.
        localStream.getTracks().forEach((track) => {
            peerConnection.addTrack(track, localStream);
        });

        peerConnection.ontrack = (event) => {
            event.streams[0].getTracks().forEach((track) => {
                remoteStream.addTrack(track);
            });
        };

        peerConnection.onicecandidate = async (event) => {
            if (event.candidate) {
                await client.sendMessageToPeer({ text: JSON.stringify({ 'type': 'candidate', 'candidate': event.candidate }) }, MemberId);
                // Here you should send the candidate to the remote peer
            }
        };
    } catch (error) {
        console.error('Error creating peer connection:', error);
    }
};

let createOffer = async (MemberId) => {
    try {
        await createPeerConnection(MemberId);

        const offer = await peerConnection.createOffer();
        await peerConnection.setLocalDescription(offer);
        await client.sendMessageToPeer({ text: JSON.stringify({ 'type': 'offer', 'offer': offer }) }, MemberId);
        // Here you should send the offer to the remote peer
    } catch (error) {
        console.error('Error creating offer:', error);
    }
};

let createAnswer = async (MemberId, offer) => {
    try {
        await createPeerConnection(MemberId);

        await peerConnection.setRemoteDescription(offer);

        let answer = await peerConnection.createAnswer();
        await peerConnection.setLocalDescription(answer);
        await client.sendMessageToPeer({ text: JSON.stringify({ 'type': 'answer', 'answer': answer }) }, MemberId);
    } catch (error) {
        console.error('Error creating answer:', error);
    }
};

let addAnswer = async (answer) => {
    try {
        if (!peerConnection.currentRemoteDescription) {
            await peerConnection.setRemoteDescription(answer);
        }
    } catch (error) {
        console.error('Error adding answer:', error);
    }
};

let leaveChannel = async () =>{
    await channel.leave()
    await client.logout()
}

let toggleCamera = async () => {
    let videoTrack=localStream.getTracks().find(track=>track.kind==='video')
    if(videoTrack.enabled){
        videoTrack.enabled=false
        document.getElementById('camera-btn').style.backgroundColor='rgb(255,80,80)'
    }
    else{
        videoTrack.enabled=true
        document.getElementById('camera-btn').style.backgroundColor='green'
    }
}

let toggleMic = async () => {
    let audioTrack=localStream.getTracks().find(track=>track.kind==='audio')
    if(audioTrack.enabled){
        audioTrack.enabled=false
        document.getElementById('mic-btn').style.backgroundColor='rgb(255,80,80)'
    }
    else{
        audioTrack.enabled=true
        document.getElementById('mic-btn').style.backgroundColor='green'
    }
}


window.addEventListener('beforeunload',leaveChannel)

document.getElementById('camera-btn').addEventListener('click',toggleCamera)
document.getElementById('mic-btn').addEventListener('click',toggleMic)

init();
