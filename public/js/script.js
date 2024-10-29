const socket = io();
let username = "";
let liveLocationEnabled = false;

document.getElementById("join-btn").onclick = () => {
  username = document.getElementById("username").value.trim();
  if (username) {
    socket.emit("join", { username });
    document.getElementById("username").disabled = true;
    document.getElementById("join-btn").disabled = true;
  }
};

// Handle live location toggle
document.getElementById("live-toggle").addEventListener("change", (event) => {
  liveLocationEnabled = event.target.checked;
  if (!liveLocationEnabled) {
    sendCurrentLocation();
  }
});

const map = L.map("map").setView([0, 0], 2);
L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
  attribution: "OpenStreetMap contributors",
}).addTo(map);

const markers = {};

// Send only current location once if live tracking is off
function sendCurrentLocation() {
  if (navigator.geolocation) {
    navigator.geolocation.getCurrentPosition(
      (position) => {
        const { latitude, longitude } = position.coords;
        socket.emit("send location", { latitude, longitude });
      },
      (err) => console.error(err),
      { enableHighAccuracy: true, timeout: 5000 }
    );
  }
}

// Continuously send location if live tracking is enabled
function watchLiveLocation() {
  if (navigator.geolocation) {
    navigator.geolocation.watchPosition(
      (position) => {
        const { latitude, longitude } = position.coords;
        if (liveLocationEnabled) {
          socket.emit("send location", { latitude, longitude });
        }
      },
      (err) => console.error(err),
      { enableHighAccuracy: true, maximumAge: 0, timeout: 5000 }
    );
  }
}

watchLiveLocation();

socket.on("user-joined", ({ id, username }) => {
  displayNotification(`${username} joined the map.`);
});

socket.on("receive-location", (data) => {
  const { id, latitude, longitude, username } = data;
  map.setView([latitude, longitude], 10);
  if (markers[id]) {
    markers[id].setLatLng([latitude, longitude]);
  } else {
    markers[id] = L.marker([latitude, longitude])
      .addTo(map)
      .bindPopup(`<b>${username}</b>`);
  }
  markers[id].openPopup();
});

socket.on("user-disconnected", (id) => {
  if (markers[id]) {
    displayNotification(`${markers[id].getPopup().getContent()} left the map.`);
    map.removeLayer(markers[id]);
    delete markers[id];
  }
});

document.getElementById("send-btn").onclick = () => {
  const message = document.getElementById("message").value.trim();
  if (message && username) {
    socket.emit("send-message", message);
    document.getElementById("message").value = "";
  }
};

socket.on("receive-message", ({ username, message }) => {
  const chatBox = document.getElementById("chat-box");
  const newMessage = document.createElement("p");
  newMessage.innerHTML = `<strong>${username}:</strong> ${message}`;
  chatBox.appendChild(newMessage);
  chatBox.scrollTop = chatBox.scrollHeight;
});

function displayNotification(notification) {
  const chatBox = document.getElementById("chat-box");
  const notifElement = document.createElement("p");
  notifElement.className = "notification";
  notifElement.textContent = notification;
  chatBox.appendChild(notifElement);
  chatBox.scrollTop = chatBox.scrollHeight;
}
