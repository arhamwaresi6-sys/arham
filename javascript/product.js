import {
  db,
  collection,
  doc,
  getDoc,
  setDoc,
  getDocs,
  updateDoc,
  auth,
  addDoc,
  onAuthStateChanged,
  processReview,
  reviewStars,
  distribute,
  getStar,
} from "./main.js";
let productImg = document.querySelector(".product-img");
let heading = document.querySelector(".heading");
let moneyContainer = document.querySelector(".money-container");
let paraBox1 = document.querySelector("#para1");
let overlay = document.querySelector(".overlay");
let desBtn = document.querySelector(".description-btn");
let feaBtn = document.querySelector(".feature-btn");
let ratingText = document.querySelector(".rating");
let fillContainer = document.querySelectorAll(".fill-container");
let ratingContainer = document.querySelectorAll(".rating-container")[1];
let mainContainer = document.querySelectorAll(".rating-container")[0];
let tempCmnt = document.querySelector(".temp-cmnt");
let cmntBoxBtn = document.querySelector(".cmnt-btn");
let reviewContainer = document.querySelector(".review-container");

function makeCmnt(img, email, rating, para) {
  return `<div class="cmnt">
        <div class="pp-box">
          <img src="${img}" alt="pp" class="pp-img" />
          <a href="${email}" class="pp-email"
            >${email}</a
          >
          <div class="user-rating">
            ${rating}
          </div>
        </div>
        <div class="cmnt-para">
          ${para}
        </div>
      </div>`;
}
let paraBox2 = document.createElement("div");

paraBox2.classList.add("para-box");
//path

let path = localStorage.getItem("productPath")?.split("/") || [];
//products,u04InvSXeAQRYiBZnKQJ,shoes,shoe_1
//load page element
async function load() {
  let ref = doc(db, ...path);
  let snap = await getDoc(ref);
  let data = snap.data();
  //updating
  productImg.src = data.img;
  heading.textContent = data.name;
  moneyContainer.textContent = data.price;
  paraBox1.textContent = data.description;
  paraBox2.textContent = data.feature;
  desBtn.addEventListener("click", () => {
    paraBox2.replaceWith(paraBox1);
    desBtn.classList.add("selected-btn");
    desBtn.classList.remove("notSelected-btn");
    feaBtn.classList.remove("selected-btn");
    feaBtn.classList.add("notSelected-btn");
  });
  feaBtn.addEventListener("click", () => {
    paraBox1.replaceWith(paraBox2);
    feaBtn.classList.add("selected-btn");
    feaBtn.classList.remove("notSelected-btn");
    desBtn.classList.remove("selected-btn");
    desBtn.classList.add("notSelected-btn");
  });
  //process review
  await processReview(
    path,
    ratingContainer,
    ratingText,
    mainContainer,
    snap,
    fillContainer,
    makeCmnt,
    tempCmnt,
  );

  if (window.matchMedia("(max-width: 800px)").matches) {
    reviewContainer.style.display = "none";
  }
  overlay.style.display = "none";
}
//loading the element
load();
//cmnt box
cmntBoxBtn.addEventListener("click", async () => {
  document.body.insertAdjacentHTML(
    "beforeend",
    `<div class="cmnt-hero">
      <nav class="cmnt-nav">
        <div class="cmnt-heading">reviews:-</div>
        <div class="cmnt-btns">
          <div class="add-cmnt">
            Add Your comment<i class="fa-solid fa-plus"></i>
          </div>
          <div class="leave-cmnt"><i class="fa-solid fa-x"></i></div>
        </div>
      </nav>
      <div class="cmnt-note">
        This website has been developed solely by me as a practice project and
        is not a functional e-commerce platform. Therefore, the review and
        comment section has been kept open for all users. I would greatly
        appreciate any suggestions or feedback on how I can improve the UI.
      </div>
      <div class="cmnt-container">
        <div class="overlay"></div>
      </div>
    </div>`,
  );
  let cmntNote = document.querySelector(".cmnt-note");
  if (window.matchMedia("(max-width: 800px)").matches) {
    reviewContainer.style.display = "inline-block";
    reviewContainer.style.width = "85%";
    cmntNote.after(reviewContainer);
  }
  document.querySelector(".leave-cmnt").addEventListener(
    "click",
    () => {
      document.querySelector(".cmnt-hero").remove();
    },
    { once: true },
  );

  //loading cmnts
  async function loadCmnts() {
    if (document.querySelector(".cmnt-container").children) {
      document.querySelector(".cmnt-container").innerHTML = "";
    }
    let ref = collection(db, ...path, "cmnts");
    let snaps = await getDocs(ref);
    snaps.forEach((snap) => {
      let div = document.createElement("div");
      let Cmnt = snap.data();
      div.innerHTML = makeCmnt(
        Cmnt.img,
        Cmnt.email,
        getStar(Cmnt.score),
        Cmnt.cmnt,
      );
      document.querySelector(".cmnt-container").append(div.firstElementChild);
    });
  }
  await loadCmnts();

  document.querySelector(".add-cmnt").addEventListener(
    "click",
    async () => {
      let user = auth.currentUser;
      //adding review box
      if (user) {
        //review box
        document.body.insertAdjacentHTML(
          "beforeend",
          `<div class="new-cmnt-hero-overlay">
      <div class="new-cmnt-hero">
        <div class="new-cmnt-nav">Write a review</div>
        <div class="new-cmnt-container">
          <div class="new-star-container">
            <div class="new-cmnt-heading">Your rating</div>
            <div class="star-boxes">
              <div class="new-cmt-star-box new-cmt-star-box-1">
                <i class="fa-solid fa-star"></i>
              </div>
              <div class="new-cmt-star-box new-cmt-star-box-2">
                <i class="fa-solid fa-star"></i>
              </div>
              <div class="new-cmt-star-box new-cmt-star-box-3">
                <i class="fa-solid fa-star"></i>
              </div>
              <div class="new-cmt-star-box new-cmt-star-box-4">
                <i class="fa-solid fa-star"></i>
              </div>
              <div class="new-cmt-star-box new-cmt-star-box-5">
                <i class="fa-solid fa-star"></i>
              </div>
            </div>
          </div>
          <div class="new-cmnt-input-container">
            <div class="new-cmnt-heading">Your comment</div>
            <textarea
              type="text"
              class="new-cmnt-input"
              placeholder="share your suggetion(max 300 words)"
              maxlength="300"
            ></textarea>
          </div>
          <div class="new-cmnt-btns">
            <div class="cancel-btn">cancel</div>
            <div class="submit-btn">Submit</div>
          </div>
        </div>
      </div>
    </div>`,
        );
        let score = 0;
        let box1 = document.querySelector(".new-cmt-star-box-1");
        let box2 = document.querySelector(".new-cmt-star-box-2");
        let box3 = document.querySelector(".new-cmt-star-box-3");
        let box4 = document.querySelector(".new-cmt-star-box-4");
        let box5 = document.querySelector(".new-cmt-star-box-5");
        let loader = document.querySelector(".loading-overlay");
        let submitBtn = document.querySelector(".submit-btn");
        box1.addEventListener("click", () => {
          box1.classList.add("selected-box");
          box2.classList.remove("selected-box");
          box3.classList.remove("selected-box");
          box4.classList.remove("selected-box");
          box5.classList.remove("selected-box");
          score = 1;
        });
        box2.addEventListener("click", () => {
          box1.classList.add("selected-box");
          box2.classList.add("selected-box");
          box3.classList.remove("selected-box");
          box4.classList.remove("selected-box");
          box5.classList.remove("selected-box");
          score = 2;
        });
        box3.addEventListener("click", () => {
          box1.classList.add("selected-box");
          box2.classList.add("selected-box");
          box3.classList.add("selected-box");
          box4.classList.remove("selected-box");
          box5.classList.remove("selected-box");
          score = 3;
        });
        box4.addEventListener("click", () => {
          box1.classList.add("selected-box");
          box2.classList.add("selected-box");
          box3.classList.add("selected-box");
          box4.classList.add("selected-box");
          box5.classList.remove("selected-box");
          score = 4;
        });
        box5.addEventListener("click", () => {
          box1.classList.add("selected-box");
          box2.classList.add("selected-box");
          box3.classList.add("selected-box");
          box4.classList.add("selected-box");
          box5.classList.add("selected-box");
          score = 5;
        });
        document.querySelector(".cancel-btn").addEventListener(
          "click",
          () => {
            document.querySelector(".new-cmnt-hero-overlay").remove();
          },
          { once: true },
        );

        let ref1 = doc(db, "userInfo", auth.currentUser.uid);
        let snap1 = await getDoc(ref1);
        let data1 = snap1.data();
        //submit-button
        submitBtn.addEventListener("click", async () => {
          loader.classList.remove("hidden"); // show loader
          let cmnt = document.querySelector(".new-cmnt-input").value.trim();
          //getting user info
          let userInfo = {
            score: score,
            cmnt: cmnt,
            email: data1.email,
            img: data1.userPP,
          };
          let ref = doc(db, ...path);
          let snap = await getDoc(ref);
          let ref2 = collection(db, ...path, "cmnts");
          await addDoc(ref2, userInfo);
          await loadCmnts();

          await distribute(path, makeCmnt, tempCmnt);
          processReview(
            path,
            ratingContainer,
            ratingText,
            mainContainer,
            snap,
            fillContainer,
            makeCmnt,
            tempCmnt,
          );
          loader.classList.add("hidden"); // hide loader
          document.querySelector(".new-cmnt-hero-overlay").remove();
        });
      } else {
        window.location.href = "../html/login.html";
      }
    },
    { once: true },
  );
  //end of add-btn

  document.querySelectorAll(".overlay")[1].style.display = "none";
});
