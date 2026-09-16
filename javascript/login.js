//import
import {
  auth,
  GoogleAuthProvider,
  FacebookAuthProvider,
  TwitterAuthProvider,
  signInWithEmailAndPassword,
  signInWithPopup,
  createUserWithEmailAndPassword,
  onAuthStateChanged,
  doc,
  db,
  getDoc,
  setDoc,
  getDocs,
  updateDoc,
} from "./main.js";

let mainContainer = document.querySelector(".main-container");
let sideContainer = document.querySelector(".side-container");
let mainHeading = document.querySelector(".main-heading");
let sideHeading = document.querySelector(".side-heading");
let sideSubHeading = document.querySelector(".side-subHeading");
let mainBtn = document.querySelector(".main-btn");
let subBtn = document.querySelector(".sub-btn");
let mainForm = document.querySelector("#main-form");
let formType = localStorage.getItem("formType");
let inRealForm = formType !== "login";
function change() {
  if (inRealForm) {
    mainContainer.classList.toggle("main-active");
    sideContainer.classList.toggle("side-active");
    mainHeading.textContent = "sign up";
    mainBtn.textContent = "sign up";
    sideHeading.textContent = "Good to See You Again!";
    sideSubHeading.textContent = "Access Your Account:";
    subBtn.textContent = "Login";
    inRealForm = false;
  } else {
    mainContainer.classList.toggle("main-active");
    sideContainer.classList.toggle("side-active");
    mainHeading.textContent = "login";
    mainBtn.textContent = "login";
    sideHeading.textContent = "Let’s Get You Started!";
    sideSubHeading.textContent = "register here:";
    subBtn.textContent = "Sign up";
    inRealForm = true;
  }
  const media = window.matchMedia("(max-width: 440px)");

  if (media.matches) {
    mainContainer.classList.toggle("main-mid");
    sideContainer.classList.toggle("side-mid");
    setTimeout(() => {
      mainContainer.classList.toggle("main-mid");
      sideContainer.classList.toggle("side-mid");
    }, 1000);
  }
}
change();
subBtn.addEventListener("click", change);

//sign in with email
function sign(e) {
  e.preventDefault();
  let email = document.querySelector("#email").value;
  let pass = document.querySelector("#password").value;
  if (email === "" || pass === "") {
    popup("Please fill in all fields.");
    return;
  }
  if (inRealForm) {
    signInWithEmailAndPassword(auth, email, pass)
      .then((result) => {
        let user = result.user;
        profile(undefined, "nahi", user.email);
      })
      .catch((err) => {
        popup(msgChecker(err.code));
      });
  } else {
    createUserWithEmailAndPassword(auth, email, pass)
      .then((result) => {
        let user = result.user;
        profile(undefined, "nahi", user.email);
      })
      .catch((err) => {
        popup(msgChecker(err.code));
      });
  }
}
mainForm.addEventListener("submit", sign);
//google login
let googleAuth = new GoogleAuthProvider();
document.querySelector("#google-btn").addEventListener("click", () => {
  signInWithPopup(auth, googleAuth)
    .then((result) => {
      let user = result.user;
      profile(user.photoURL, user.displayName, user.email);
    })
    .catch((err) => {
      popup(msgChecker(err.code));
    });
});
//facebook login
let facebookAuth = new FacebookAuthProvider();
document.querySelector("#facebook-btn").addEventListener("click", () => {
  signInWithPopup(auth, facebookAuth)
    .then((result) => {
      let user = result.user;
      let emailSafe = user.email || auth.currentUser.uid + "@noemail.com";
      profile(user.photoURL, user.displayName, emailSafe);
    })
    .catch((err) => {
      popup(msgChecker(err.code));
    });
});

// Twitter login
let twitterAuth = new TwitterAuthProvider();
document.querySelector("#x-btn").addEventListener("click", () => {
  signInWithPopup(auth, twitterAuth)
    .then((result) => {
      let user = result.user;
      let emailSafe = user.email || auth.currentUser.uid + "@noemail.com";
      profile(user.photoURL, user.displayName, emailSafe);
    })
    .catch((err) => {
      alert(msgChecker(err.code));
    });
});
let guestBtn = document.querySelector(".guest-btn");
guestBtn.addEventListener("click", () => {
  window.location.href = "shop.html";
});
//user fndly texts
function msgChecker(message) {
  switch (message) {
    case "auth/invalid-email":
      return "The email address is badly formatted.";
      break;
    case "auth/user-not-found":
      return "No user record corresponding to this identifier.";
      break;
    case "auth/wrong-password":
      return "The password is invalid for this user.";
      break;
    case "auth/email-already-in-use":
      return "The email address is already in use by another account.";
      break;
    case "auth/weak-password":
      return "The password must be 6 characters long or more.";
      break;
    case "auth/user-disabled":
      return "This user account has been disabled by an admin.";
      break;
    case "auth/missing-password":
      return "Please enter a password.";
      break;
    case "auth/popup-closed-by-user":
      return "The popup was closed before finishing the login.";
      break;
    case "auth/cancelled-popup-request":
      return "Only one popup request is allowed at a time.";
      break;
    case "auth/account-exists-with-different-credential":
      return "You already have an account with this email (linked to another provider).";
      break;
    case "auth/credential-already-in-use":
      return "This social account is already linked to another user.";
      break;
    case "auth/popup-blocked":
      return "The browser blocked the login popup.";
      break;
    case "auth/network-request-failed":
      return "Network error. Check your internet connection.";
      break;
    case "auth/too-many-requests":
      return "Too many attempts. Access is temporarily blocked.";
      break;
    case "auth/internal-error":
      return "The authentication server experienced an error.";
      break;
    default:
      return "something is wrong";
      break;
  }
}
//error popup
function popup(message) {
  let str = `
    <div class="overlay">
      <div class="error-box">
        <div class="error-container">
          <h1 class="error-heading">Error!</h1>
          <p class="error-para">${message}</p>
          <div class="err-btn-box">
            <button class="err-btn">Try Again</button>
            <div class="err-btn-shadow"></div>
          </div>
        </div>
      </div>
    </div>
  `;

  document.body.insertAdjacentHTML("afterbegin", str);

  let overlay = document.querySelector(".overlay");
  let box = overlay.querySelector(".error-box");
  let btn = overlay.querySelector(".err-btn");

  // 🔥 Close on button
  btn.addEventListener("click", () => {
    overlay.remove();
  });

  // 🔥 Close on outside click
  overlay.addEventListener("click", (e) => {
    if (!box.contains(e.target)) {
      overlay.remove();
    }
  });
}

//user movement

function takeInput() {}
// profile
function profile(pp, name, email) {
  let str = ` <div class="profile">
      <div class="profile-container">
        <div class="profile-sub-container-1">
          <svg
            viewBox="0 0 200 200"
            xmlns="http://www.w3.org/2000/svg"
            class="blop"
          >
            <path
              fill="#FFffffff"
              class="blop-path"
              d="M43.1,-60.8C56,-50,66.7,-37.6,67.6,-24.4C68.6,-11.2,59.8,2.7,52.7,14.9C45.6,27,40.2,37.5,31.7,45.7C23.2,54,11.6,60,-1.8,62.6C-15.3,65.1,-30.6,64.2,-43.7,57.4C-56.7,50.6,-67.5,38,-72.4,23.4C-77.2,8.8,-76.2,-7.8,-69,-20.1C-61.8,-32.3,-48.4,-40.3,-35.9,-51.2C-23.4,-62.1,-11.7,-76.1,1.7,-78.4C15.1,-80.8,30.2,-71.6,43.1,-60.8Z"
              transform="translate(100 100)"
            />
          </svg>
          <i class="fa-solid fa-arrow-right left-arrow arrow"></i>
          <div class="pro-image-circle">
            <div class="pro-image-container">
              <img
                src="../img/defaultpp1.jpg"
                alt="pp1"
                class="profile-image"
              />
              <img
                src="../img/defaultpp2.jpg"
                alt="pp2"
                class="profile-image"
              />
              <img
                src="../img/defaultpp3.jpg"
                alt="pp3"
                class="profile-image"
              />
            </div>
          </div>
          <i class="fa-solid fa-arrow-right right-arrow arrow"></i>
        </div>

        <div class="profile-sub-container-2">
          <div class="profile-heading">Complete Your Profile!</div>
          <div class="profile-name">Name:</div>
          <input
            type="text"
            class="profile-input"
            placeholder="give a Nickname:-(max length 7)"
            maxlength="7"
          />
          <div class="profile-btn">continue</div>
        </div>
      </div>
    </div>
  `;

  document.body.insertAdjacentHTML("afterbegin", str);
  let proImgBox = document.querySelector(".pro-image-container");
  let input = document.querySelector(".profile-input");
  let ppBtn = document.querySelector(".profile-btn");
  if (pp) {
    let ppimage = document.createElement("img");
    ppimage.src = pp;
    ppimage.classList.add("profile-image");
    proImgBox.prepend(ppimage);
  }
  if (name) {
    input.value = input.value = name.split(" ")[0].slice(0, 7);
  }
  let leftArrow = document.querySelector(".left-arrow");
  let rightArrow = document.querySelector(".right-arrow");

  let imgCount = proImgBox.children.length;
  let blop = document.querySelector(".blop-path");
  let x = 0;
  leftArrow.addEventListener("click", () => {
    if (x == 0) return;
    x += 100;
    proImgBox.style.transform = `translateX(${x}px)`;
  });
  rightArrow.addEventListener("click", () => {
    if (x == -1 * (imgCount - 1) * 100) return;
    x -= 100;
    proImgBox.style.transform = `translateX(${x}px)`;
  });
  let y = 1;
  function blopPaths() {
    switch (y) {
      case 0:
        blop.setAttribute(
          "d",
          "M43.1,-60.8C56,-50,66.7,-37.6,67.6,-24.4C68.6,-11.2,59.8,2.7,52.7,14.9C45.6,27,40.2,37.5,31.7,45.7C23.2,54,11.6,60,-1.8,62.6C-15.3,65.1,-30.6,64.2,-43.7,57.4C-56.7,50.6,-67.5,38,-72.4,23.4C-77.2,8.8,-76.2,-7.8,-69,-20.1C-61.8,-32.3,-48.4,-40.3,-35.9,-51.2C-23.4,-62.1,-11.7,-76.1,1.7,-78.4C15.1,-80.8,30.2,-71.6,43.1,-60.8Z",
        );
        break;
      case 1:
        blop.setAttribute(
          "d",
          "M31.3,-47.5C39.5,-37.2,44.3,-26.5,50.6,-14.7C56.9,-2.8,64.8,10.4,63.2,22.2C61.7,33.9,50.6,44.2,38.5,53.1C26.4,62,13.2,69.5,-2.1,72.4C-17.4,75.3,-34.8,73.6,-47.4,64.8C-60.1,56.1,-68,40.4,-71.1,24.6C-74.2,8.7,-72.6,-7.2,-68.9,-23.6C-65.2,-40,-59.5,-57,-47.7,-66.1C-35.8,-75.2,-17.9,-76.5,-3.2,-72.1C11.6,-67.7,23.1,-57.8,31.3,-47.5Z",
        );
        break;
      case 2:
        blop.setAttribute(
          "d",
          "M39.2,-57.2C51.5,-45,62.6,-34.5,69.6,-20.8C76.5,-7.1,79.3,9.8,73.1,22.2C66.9,34.6,51.7,42.5,38.1,48C24.4,53.6,12.2,56.8,-1.6,58.9C-15.4,61.1,-30.7,62.3,-44.1,56.6C-57.6,51,-69.1,38.6,-75,23.6C-81,8.6,-81.3,-8.9,-75.8,-24.3C-70.4,-39.7,-59.2,-52.9,-45.6,-64.7C-32,-76.5,-16,-86.8,-1.3,-85C13.5,-83.3,26.9,-69.4,39.2,-57.2Z",
        );
        break;
      case 3:
        blop.setAttribute(
          "d",
          "M46.6,-65.5C58.7,-55.3,65.8,-39.5,66.8,-24.5C67.8,-9.5,62.8,4.6,56.2,16.1C49.5,27.6,41.2,36.5,31.6,45.1C22,53.8,11,62.2,-2.4,65.5C-15.9,68.9,-31.7,67.2,-44.5,59.6C-57.2,51.9,-66.8,38.4,-67.5,24.6C-68.3,10.9,-60.2,-3,-56.4,-19.4C-52.5,-35.7,-52.9,-54.5,-44.2,-65.8C-35.5,-77.1,-17.8,-80.8,-0.3,-80.5C17.2,-80.1,34.5,-75.6,46.6,-65.5Z",
        );
        break;
      case 4:
        blop.setAttribute(
          "d",
          "M31.2,-42.1C41.2,-35.7,50.6,-27.6,54.4,-17.3C58.2,-7.1,56.4,5.3,55.8,21.6C55.3,37.8,55.9,57.7,46.8,65.3C37.7,72.9,18.8,68,1.6,65.8C-15.6,63.6,-31.2,64,-40,56.4C-48.7,48.7,-50.6,32.8,-54.1,18.4C-57.6,4,-62.8,-9.1,-62.2,-23C-61.5,-36.9,-54.9,-51.7,-43.6,-57.7C-32.2,-63.7,-16.1,-60.8,-2.8,-57C10.6,-53.2,21.2,-48.5,31.2,-42.1Z",
        );
        break;
      case 5:
        blop.setAttribute(
          "d",
          "M44.8,-63.4C54.7,-54.5,57.2,-36.9,56.8,-22.2C56.4,-7.5,53.2,4.4,52.3,20.1C51.5,35.9,53,55.5,44.7,62.8C36.4,70.1,18.2,65,1.2,63.4C-15.8,61.7,-31.6,63.5,-45.1,57.9C-58.5,52.3,-69.5,39.2,-69.6,25.8C-69.6,12.3,-58.7,-1.6,-52.2,-15.6C-45.8,-29.6,-43.9,-43.8,-36,-53.4C-28,-63,-14,-68,1.7,-70.4C17.4,-72.7,34.9,-72.4,44.8,-63.4Z",
        );
        break;
    }
    y++;
    if (y > 5) {
      y = 0;
    }
    setTimeout(blopPaths, 2000);
  }
  blopPaths();
  ppBtn.addEventListener("click", async () => {
    let index = Math.abs(x / 100);

    let userPP = proImgBox.children[index].src;
    let userInfo = {
      userName: input.value,
      userPP: userPP,
      email,
    };
    await setDoc(doc(db, "userInfo", auth.currentUser.uid), userInfo);
    window.location.href = "../index.html";
  });
}
