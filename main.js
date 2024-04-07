let APP_ID="e5290af628b74af38dc80e47f2d3be26"
let token=null;
let uid=String(Math.floor(Math.random()*10000))

let client;
let channel;



let localStream; // variable will hold the local media stream (camera and microphone).
let remoteStream; // variable will hold the remote media stream received from another user.
let peerConnection; // variable represents the WebRTC peer connection between the local and remote users.

//ICE(Interactive Cnnectivity establishment).ICE servers are required for NAT traversal in WebRTC.
const servers = {
    iceServers: [
        { urls: 'stun:stun1.l.google.com:19302' },
        { urls: 'stun:stun2.l.google.com:19302' }
    ]
};


let init = async () => {
    client=await AgoraRTM.createInstance(APP_ID)
    await client.login({uid,token})
    
    channel=client.createChannel('main')
    await channel.join()
    channel.on('MemberJoined',handleUserJoined)

    localStream = await navigator.mediaDevices.getUserMedia({ video: true, audio: false });
    document.getElementById('user-1').srcObject = localStream;

    createOffer();
};

let handleUserJoined = async(MemberId) =>{
    console.log('A new user joined the channel:',MemberId);
}

let createOffer = async () => {
    peerConnection = new RTCPeerConnection(servers);
    remoteStream = new MediaStream();
    document.getElementById('user-2').srcObject = remoteStream;

    //adds the tracks from the local media stream (localStream) to the peer connection.
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
            console.log('New ICE candidate:', event.candidate);
            // Here you should send the candidate to the remote peer
        }
    };

        const offer = await peerConnection.createOffer();
        await peerConnection.setLocalDescription(offer);
        console.log("Offer:", offer);
        // Here you should send the offer to the remote peer
    
};

init();
