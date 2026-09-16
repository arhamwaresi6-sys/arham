import {
  db,
  collection,
  doc,
  getDoc,
  setDoc,
  getDocs,
  updateDoc,
  auth,
  onAuthStateChanged,
} from "./main.js";
let offerContainer = document.querySelector(".offer-container");
let signLog = document.querySelector(".log-sign");
async function loadImage() {
  let ref = collection(db, "offers");
  let snaps = await getDocs(ref);
  if (!snaps.empty) {
    let card = document.createElement("div");
    card.classList.add("card");

    snaps.forEach((snap) => {
      let data = snap.data();

      let img = document.createElement("img");
      img.src = data.img;
      img.classList.add("card-img");

      card.append(img);
    });
    if (snaps.size > 1) {
      card.classList.add("spin-card");
      let card2 = card.cloneNode(true);
      offerContainer.append(card);
      offerContainer.append(card2);
    } else {
      card.classList.remove("spin-card");
      offerContainer.append(card);
    }
  } else {
    offerContainer.remove();
  }
}

loadImage();
onAuthStateChanged(auth, async (user) => {
  if (user) {
    let snap = await getDoc(doc(db, "userInfo", auth.currentUser.uid));
    let userInfo = snap.data();
    let holder = document.createElement("div");
    let ppDiv = document.createElement("div");
    let nameDiv = document.createElement("div");
    let ppSrc = userInfo.userPP;
    let ppImg = document.createElement("img");
    ppSrc = new URL(ppSrc, location.href).href;
    ppImg.src = ppSrc;
    nameDiv.textContent = userInfo.userName;
    ppDiv.classList.add("pp-div");
    ppImg.classList.add("pp-img");
    nameDiv.classList.add("name-div");
    ppDiv.append(ppImg);
    holder.prepend(nameDiv, ppDiv);
    holder.classList.add("profile-holder");
    signLog.replaceWith(holder);
  }
});
async function load() {
  let ref = collection(db, "products", "u04InvSXeAQRYiBZnKQJ", "shoes");
  let snaps = await getDocs(ref);

  snaps.forEach((snap) => {
    let img = document.createElement("img"); // ✅ new image each time

    img.src = snap.data().img;

    // store path (⚠️ this will overwrite each time)

    img.addEventListener("click", () => {
      localStorage.setItem("productPath", snap.ref.path);
      window.location.href = "../html/product.html";
    });
    document.body.append(img);
  });
}
load();
