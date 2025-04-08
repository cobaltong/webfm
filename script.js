// Initialize WebsimSocket for multiplayer functionality
const room = new WebsimSocket();
let myLastFmUsername = localStorage.getItem('lastFmUsername') || '';

// Initialize the room
async function initRoom() {
  await room.initialize();
  
  // Set up presence subscription
  room.subscribePresence((currentPresence) => {
    updatePlayerDisplay();
  });
  
  // Set up message handling
  room.onmessage = (event) => {
    const data = event.data;
    switch (data.type) {
      case "connected":
      case "disconnected":
        updatePlayerDisplay();
        break;
    }
  };
  
  // Check if we already have lastFmUsername in localStorage
  if (myLastFmUsername) {
    document.getElementById('savedUsername').textContent = `Saved username: ${myLastFmUsername}`;
    setUpLastFmSocket(myLastFmUsername);
    
    // Update presence to share Last.fm username
    room.updatePresence({
      lastFmUsername: myLastFmUsername,
      currentTrack: null,
      isPlaying: false
    });
  }
}

// Set up form submission
document.getElementById('submitUsername').addEventListener('click', async () => {
  const usernameInput = document.getElementById('lastFmUsername');
  const username = usernameInput.value.trim();
  
  if (username) {
    myLastFmUsername = username;
    
    // Save to localStorage
    localStorage.setItem('lastFmUsername', username);
    
    // Update presence instead of using collections
    room.updatePresence({
      lastFmUsername: username,
      currentTrack: null,
      isPlaying: false
    });
    
    // Show the saved username
    document.getElementById('savedUsername').textContent = `Saved username: ${myLastFmUsername}`;
    
    // Set up Last.fm socket
    setUpLastFmSocket(username);
  }
});

// Set up Last.fm WebSocket
function setUpLastFmSocket(lastFmUsername) {
  let socket = new WebSocket(
    `wss://scrobbled.tepiloxtl.net/ws/get_last_track/${lastFmUsername}`
  );

  socket.onopen = function (e) {
    console.log("[open] Connection established for", lastFmUsername);
  };

  socket.onmessage = async function (event) {
    const data = JSON.parse(event.data);
    const track = data.recenttracks.track[0];
    const isPlaying = track.nowplaying === "true";
    
    // Update our own presence with the track info
    room.updatePresence({
      lastFmUsername: lastFmUsername,
      currentTrack: {
        name: track.name,
        artist: track.artist.name,
        albumArt: track.image[1]["#text"]
      },
      isPlaying: isPlaying
    });
  };
  
  socket.onclose = function (event) {
    console.log(`[close] Connection closed for ${lastFmUsername}`);
    setTimeout(() => setUpLastFmSocket(lastFmUsername), 5000); // Try to reconnect
  };

  socket.onerror = function (error) {
    console.log(`[error] for ${lastFmUsername}`);
  };
}

// Update player display based on presence
function updatePlayerDisplay() {
  const playerContainer = document.getElementById('playerContainer');
  playerContainer.innerHTML = '';
  
  // Use peers and presence for player display
  Object.entries(room.peers).forEach(([clientId, peer]) => {
    if (room.presence[clientId] && room.presence[clientId].lastFmUsername) {
      const template = document.getElementById('playerCardTemplate');
      const playerCard = document.importNode(template.content, true);
      
      // Set websim user info
      playerCard.querySelector('.username').textContent = peer.username || 'User';
      playerCard.querySelector('.avatar').src = peer.avatarUrl || '';
      
      // Set music info
      const userPresence = room.presence[clientId];
      if (userPresence.currentTrack) {
        playerCard.querySelector('.trackName').textContent = userPresence.currentTrack.name;
        playerCard.querySelector('.artistName').textContent = userPresence.currentTrack.artist;
        playerCard.querySelector('.album-art').src = userPresence.currentTrack.albumArt;
        
        if (userPresence.isPlaying) {
          playerCard.querySelector('.trackStatus').textContent = 'Listening to:';
          playerCard.querySelector('.blob').style.backgroundColor = '#5dff8a';
        } else {
          playerCard.querySelector('.trackStatus').textContent = 'Last listened:';
          playerCard.querySelector('.blob').style.backgroundColor = '#5d5d5d';
        }
      }
      
      playerContainer.appendChild(playerCard);
    }
  });
}

// Display saved username if available
window.addEventListener('DOMContentLoaded', () => {
  initRoom();
  
  // Show the saved username if available
  if (myLastFmUsername) {
    document.getElementById('lastFmUsername').value = myLastFmUsername;
    document.getElementById('savedUsername').textContent = `Saved username: ${myLastFmUsername}`;
  }
});