import { initializeApp } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-app.js";

import {
  getAuth,
  GoogleAuthProvider,
  signInWithPopup,
  signOut,
  onAuthStateChanged
} from "https://www.gstatic.com/firebasejs/10.12.2/firebase-auth.js";

const firebaseConfig = {
  apiKey: "YOUR_API_KEY",
  authDomain: "YOUR_AUTH_DOMAIN",
  projectId: "YOUR_PROJECT_ID",
  appId: "YOUR_APP_ID"
};

const app = initializeApp(firebaseConfig);
const auth = getAuth(app);

const provider = new GoogleAuthProvider();

async function googleLogin() {
  try {
    await signInWithPopup(auth, provider);
  } catch (err) {
    console.error(err);
  }
}

async function logout() {
  await signOut(auth);
}

onAuthStateChanged(auth, (user) => {
  if (user) {
    document.getElementById("userInfo").innerText =
      user.email || "Google User";
  } else {
    document.getElementById("userInfo").innerText =
      "로그인 안됨";
  }
});

window.googleLogin = googleLogin;
window.logout = logout;
const map = L.map('map', {
  zoomControl: false
}).setView([37.5665, 126.9780], 13);

L.control.zoom({
  position: 'bottomright'
}).addTo(map);

const lightLayer = L.tileLayer(
  'https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png',
  {
    attribution: '&copy; OpenStreetMap contributors'
  }
);

const darkLayer = L.tileLayer(
  'https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png',
  {
    attribution: '&copy; OpenStreetMap & CARTO'
  }
);

darkLayer.addTo(map);

let currentTheme = 'dark';
let markersLayer = L.layerGroup().addTo(map);

const locationInfo = document.getElementById('locationInfo');
const latText = document.getElementById('latText');
const lngText = document.getElementById('lngText');
const zoomLevel = document.getElementById('zoomLevel');

map.on('moveend zoomend', () => {
  const center = map.getCenter();

  latText.textContent = center.lat.toFixed(4);
  lngText.textContent = center.lng.toFixed(4);
  zoomLevel.textContent = map.getZoom();
});

async function searchLocation(query) {
  if (!query) return;

  try {
    const res = await fetch(
      `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(query)}`
    );

    const data = await res.json();

    if (!data.length) {
      alert('검색 결과가 없습니다.');
      return;
    }

    const place = data[0];

    const lat = parseFloat(place.lat);
    const lon = parseFloat(place.lon);

    markersLayer.clearLayers();

    const marker = L.marker([lat, lon]).addTo(markersLayer);

    marker.bindPopup(`
      <div style="min-width:220px">
        <h3>${place.display_name}</h3>
      </div>
    `).openPopup();

    map.flyTo([lat, lon], 15, {
      duration: 1.6
    });

    locationInfo.innerHTML = `
      <strong>검색 결과</strong><br/><br/>
      ${place.display_name}<br/><br/>
      위도: ${lat.toFixed(6)}<br/>
      경도: ${lon.toFixed(6)}
    `;

  } catch (err) {
    console.error(err);
    alert('검색 중 오류가 발생했습니다.');
  }
}

document.getElementById('searchBtn').addEventListener('click', () => {
  const value = document.getElementById('searchInput').value;
  searchLocation(value);
});

document.getElementById('searchInput').addEventListener('keydown', (e) => {
  if (e.key === 'Enter') {
    searchLocation(e.target.value);
  }
});

document.getElementById('locateBtn').addEventListener('click', () => {
  navigator.geolocation.getCurrentPosition(
    async (pos) => {
      const { latitude, longitude } = pos.coords;

      markersLayer.clearLayers();

      const marker = L.marker([latitude, longitude]).addTo(markersLayer);

      marker.bindPopup('현재 위치').openPopup();

      map.flyTo([latitude, longitude], 16);

      locationInfo.innerHTML = `
        <strong>현재 위치</strong><br/><br/>
        위도: ${latitude.toFixed(6)}<br/>
        경도: ${longitude.toFixed(6)}
      `;
    },
    () => {
      alert('위치 권한이 필요합니다.');
    }
  );
});

document.getElementById('themeBtn').addEventListener('click', () => {
  if (currentTheme === 'dark') {
    map.removeLayer(darkLayer);
    lightLayer.addTo(map);
    currentTheme = 'light';
    document.body.classList.add('light');
  } else {
    map.removeLayer(lightLayer);
    darkLayer.addTo(map);
    currentTheme = 'dark';
    document.body.classList.remove('light');
  }
});

map.on('click', async (e) => {
  const { lat, lng } = e.latlng;

  try {
    const res = await fetch(
      `https://nominatim.openstreetmap.org/reverse?format=json&lat=${lat}&lon=${lng}`
    );

    const data = await res.json();

    markersLayer.clearLayers();

    const marker = L.marker([lat, lng]).addTo(markersLayer);

    marker.bindPopup(data.display_name || '선택한 위치').openPopup();

    locationInfo.innerHTML = `
      <strong>선택한 위치</strong><br/><br/>
      ${data.display_name || '주소 정보 없음'}<br/><br/>
      위도: ${lat.toFixed(6)}<br/>
      경도: ${lng.toFixed(6)}
    `;

  } catch (err) {
    console.error(err);
  }
});

async function findNearby(type) {
  const center = map.getCenter();

  const query = `
    [out:json];
    (
      node["amenity"="${type}"](around:2000,${center.lat},${center.lng});
    );
    out;
  `;

  try {
    const res = await fetch('https://overpass-api.de/api/interpreter', {
      method: 'POST',
      body: query
    });

    const data = await res.json();

    markersLayer.clearLayers();

    data.elements.slice(0, 25).forEach(place => {
      const marker = L.marker([place.lat, place.lon]).addTo(markersLayer);

      marker.bindPopup(`
        <strong>${place.tags.name || 'Unnamed'}</strong><br/>
        ${type}
      `);
    });

    locationInfo.innerHTML = `
      <strong>${type} 검색 결과</strong><br/><br/>
      ${data.elements.length}개의 장소를 찾았습니다.
    `;

  } catch (err) {
    console.error(err);
    alert('주변 장소 검색 실패');
  }
}

document.querySelectorAll('.quick-btn').forEach(btn => {
  btn.addEventListener('click', () => {
    findNearby(btn.dataset.type);
  });
});

latText.textContent = map.getCenter().lat.toFixed(4);
lngText.textContent = map.getCenter().lng.toFixed(4);
zoomLevel.textContent = map.getZoom();
