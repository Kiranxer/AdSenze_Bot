fetch("/ads").then(r=>r.json()).then(ads=>{
  ads.forEach(a=>{
    adsDiv.innerHTML += `
      <p>${a.adId} | ${a.hours}h | Pin: ${a.pin}</p>
      <button onclick="approve('${a.adId}')">Approve</button>
      <button onclick="reject('${a.adId}')">Reject</button><hr>`;
  });
});
function approve(id){fetch("/approve/"+id,{method:"POST"}).then(()=>location.reload())}
function reject(id){fetch("/reject/"+id,{method:"POST"}).then(()=>location.reload())}
