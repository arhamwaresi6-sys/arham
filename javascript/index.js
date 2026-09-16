import { onAuthStateChanged, auth, doc, db, getDoc } from "./main";
import shoeBlue from "../public/img/shoe-png.png";
import shoeneon from "../public/img/shoe-png-neon.png";
import shoegreen from "../public/img/shoe-png-green2.png";
let blueC = document.querySelector(".circle-1");
let neonC = document.querySelector(".circle-2");
let greenC = document.querySelector(".circle-3");
let shoeImg = document.querySelector(".shoe-img");
let heading = document.querySelector(".hero-heading");
let color = localStorage.getItem("shoe-color");
let glowLayer = document.querySelector(".shoe-glow");
let imgContainer = document.querySelector(".img-container");
let loginBtn = document.querySelector(".log-btn");
let signBtn = document.querySelector(".sign-btn");
let shopBtn = document.querySelector(".shop-btn");
let signLog = document.querySelector(".sign-log");
let hero = document.querySelector(".hero");

shopBtn.addEventListener("click", () => {
  window.location.href = "../html/shop.html";
});
window.addEventListener("DOMContentLoaded", () => {
  let colBtn1 = document.querySelector(".col-btn-1");
  let colBtn2 = document.querySelector(".col-btn-2");

  colBtn1.addEventListener("click", () => {
    window.location.href = "../html/product.html";
  });
  colBtn2.addEventListener("click", () => {
    window.location.href = "../html/product.html";
  });
});
loginBtn.addEventListener("click", () => {
  localStorage.setItem("formType", "login");
  window.location.href = "./html/login.html";
});
signBtn.addEventListener("click", () => {
  window.location.href = "./html/login.html";
});
if (color === "blue") {
  blueTheme();
} else if (color === "green") {
  greenTheme();
} else if (color === "neon") {
  neonTheme();
}
blueC.addEventListener("click", () => {
  heading.classList.add("hero-heading-go");
  imgContainer.classList.add("img-container-go");
  setTimeout(blueTheme, 600);
  setTimeout(() => {
    heading.classList.remove("hero-heading-go");
    imgContainer.classList.remove("img-container-go");
  }, 605);
});
neonC.addEventListener("click", () => {
  heading.classList.add("hero-heading-go");
  imgContainer.classList.add("img-container-go");
  setTimeout(neonTheme, 600);
  setTimeout(() => {
    heading.classList.remove("hero-heading-go");
    imgContainer.classList.remove("img-container-go");
  }, 605);
});

greenC.addEventListener("click", () => {
  heading.classList.add("hero-heading-go");
  imgContainer.classList.add("img-container-go");
  setTimeout(greenTheme, 600);
  setTimeout(() => {
    heading.classList.remove("hero-heading-go");
    imgContainer.classList.remove("img-container-go");
  }, 605);
});
function updateColor(col) {
  color = col;
  localStorage.setItem("shoe-color", color);
}
function blueTheme() {
  heading.textContent = "Velocity";
  shoeImg.src = shoeBlue;
  hero.classList.remove("body-green");
  hero.classList.remove("body-neon");
  heading.classList.remove("hero-heading-green");
  heading.classList.remove("hero-heading-neon");
  glowLayer.classList.remove("shoe-glow-green");
  glowLayer.classList.remove("shoe-glow-neon");
  blueC.classList.add("selected-circle");
  greenC.classList.remove("selected-circle");
  neonC.classList.remove("selected-circle");
  updateColor("blue");
}
function greenTheme() {
  heading.textContent = "Vortexx";
  shoeImg.src = shoegreen;
  hero.classList.add("body-green");
  hero.classList.remove("body-neon");
  heading.classList.add("hero-heading-green");
  heading.classList.remove("hero-heading-neon");
  glowLayer.classList.add("shoe-glow-green");
  glowLayer.classList.remove("shoe-glow-neon");
  blueC.classList.remove("selected-circle");
  greenC.classList.add("selected-circle");
  neonC.classList.remove("selected-circle");
  updateColor("green");
}
function neonTheme() {
  heading.textContent = "Driftt";
  shoeImg.src = shoeneon;
  hero.classList.remove("body-green");
  hero.classList.add("body-neon");
  heading.classList.remove("hero-heading-green");
  heading.classList.add("hero-heading-neon");
  glowLayer.classList.remove("shoe-glow-green");
  glowLayer.classList.add("shoe-glow-neon");
  blueC.classList.remove("selected-circle");
  greenC.classList.remove("selected-circle");
  neonC.classList.add("selected-circle");
  updateColor("neon");
}
//col
window.addEventListener("DOMContentLoaded", () => {
  let colWritingBox1 = document.querySelector(".col-writing-box-1");
  let colWritingBox2 = document.querySelector(".col-writing-box-2");

  let observer = new IntersectionObserver(
    (entries) => {
      entries.forEach((entry) => {
        if (entry.isIntersecting) {
          entry.target.classList.add("col-writing-box-active");
        }
      });
    },
    { threshold: 0.3 },
  );

  if (colWritingBox1) observer.observe(colWritingBox1);
  if (colWritingBox2) observer.observe(colWritingBox2);
});
//user movement
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
