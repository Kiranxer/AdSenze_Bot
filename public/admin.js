const adsContainer = document.getElementById("ads");

fetch("/ads")
  .then(res => res.json())
  .then(ads => {
    adsContainer.innerHTML = "";

    if (ads.length === 0) {
      adsContainer.innerHTML = "<p>✨ No pending ads right now</p>";
      return;
    }

    ads.forEach(ad => {
      const card = document.createElement("div");
      card.className = "ad-card";

      card.innerHTML = `
        <p><b>🆔 Ad ID:</b> ${ad.adId}</p>
        <p><b>⏳ Duration:</b> ${ad.hours} hours</p>
        <p><b>📌 Pin:</b> ${ad.pin ? "Yes" : "No"}</p>
        <p><b>👤 User:</b> ${ad.userId}</p>

        <div class="actions">
          <button class="approve" onclick="approve('${ad.adId}')">Approve</button>
          <button class="reject" onclick="reject('${ad.adId}')">Reject</button>
        </div>
      `;

      adsContainer.appendChild(card);
    });
  });

function approve(id) {
  fetch(`/approve/${id}`, { method: "POST" })
    .then(() => location.reload());
}

function reject(id) {
  fetch(`/reject/${id}`, { method: "POST" })
    .then(() => location.reload());
}
