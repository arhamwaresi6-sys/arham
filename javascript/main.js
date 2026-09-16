import { initializeApp } from "firebase/app";
import {
  getAuth,
  signInWithEmailAndPassword,
  signInWithPopup,
  createUserWithEmailAndPassword,
  GoogleAuthProvider,
  FacebookAuthProvider,
  TwitterAuthProvider,
  onAuthStateChanged,
} from "firebase/auth";
import {
  getFirestore,
  collection,
  doc,
  getDoc,
  setDoc,
  getDocs,
  addDoc,
  updateDoc,
} from "firebase/firestore";
let clientConfig = {
  apiKey: "AIzaSyB-tMD0ZxiUsWwUMFhytGzyDXn_NJ9tQL8",
  authDomain: "cloth-shop-c391f.firebaseapp.com",
  projectId: "cloth-shop-c391f",
  storageBucket: "cloth-shop-c391f.firebasestorage.app",
  messagingSenderId: "650278523818",
  appId: "1:650278523818:web:88000ef4c4ed8b810f91d3",
  measurementId: "G-RX7SGCCTKY",
};
let app = initializeApp(clientConfig);
let auth = getAuth(app);
//export

onAuthStateChanged(auth, (user) => {
  if (user) {
  } else {
    // redirect to login page if needed
  }
});
let db = getFirestore(app);
localStorage.setItem("shoe-color", "blue");

let halfStar = `<i class="fa-solid fa-star-half-stroke"></i>`;

let reviewStars = {
  zeroStar() {
    let star = `<i class="fa-regular fa-star"></i><i class="fa-regular fa-star"></i><i class="fa-regular fa-star"></i><i class="fa-regular fa-star"></i>
    <i class="fa-regular fa-star"></i>`;
    return star;
  },
  oneStar() {
    let star = `<i class="fa-solid fa-star"></i><i class="fa-regular fa-star"></i><i class="fa-regular fa-star"></i><i class="fa-regular fa-star"></i>
    <i class="fa-regular fa-star"></i>`;
    return star;
  },
  twoStar() {
    let star = `<i class="fa-solid fa-star"></i><i class="fa-solid fa-star"></i><i class="fa-regular fa-star"></i><i class="fa-regular fa-star"></i>
    <i class="fa-regular fa-star"></i>`;
    return star;
  },
  threeStar() {
    let star = `<i class="fa-solid fa-star"></i><i class="fa-solid fa-star"></i><i class="fa-solid fa-star"></i><i class="fa-regular fa-star"></i>
    <i class="fa-regular fa-star"></i>`;
    return star;
  },
  fourStar() {
    let star = `<i class="fa-solid fa-star"></i><i class="fa-solid fa-star"></i><i class="fa-solid fa-star"></i><i class="fa-solid fa-star"></i>
    <i class="fa-regular fa-star"></i>`;
    return star;
  },
  fiveStar() {
    let star = `<i class="fa-solid fa-star"></i><i class="fa-solid fa-star"></i><i class="fa-solid fa-star"></i><i class="fa-solid fa-star"></i>
    <i class="fa-solid fa-star"></i>`;
    return star;
  },
  zeroHalfStar() {
    let star = `${halfStar}<i class="fa-regular fa-star"></i><i class="fa-regular fa-star"></i><i class="fa-regular fa-star"></i>
    <i class="fa-regular fa-star"></i>`;
    return star;
  },
  oneHalfStar() {
    let star = `<i class="fa-solid fa-star"></i>${halfStar}<i class="fa-regular fa-star"></i><i class="fa-regular fa-star"></i>
    <i class="fa-regular fa-star"></i>`;
    return star;
  },
  twoHalfStar() {
    let star = `<i class="fa-solid fa-star"></i><i class="fa-solid fa-star"></i>${halfStar}<i class="fa-regular fa-star"></i>
    <i class="fa-regular fa-star"></i>`;
    return star;
  },
  threeHalfStar() {
    let star = `<i class="fa-solid fa-star"></i><i class="fa-solid fa-star"></i><i class="fa-solid fa-star"></i>${halfStar}
    <i class="fa-regular fa-star"></i>`;
    return star;
  },
  fourHalfStar() {
    let star = `<i class="fa-solid fa-star"></i><i class="fa-solid fa-star"></i><i class="fa-solid fa-star"></i><i class="fa-solid fa-star"></i>
    ${halfStar}`;
    return star;
  },
};
function getStar(num) {
  switch (num) {
    case 0:
      return reviewStars.zeroStar();
      break;
    case 0.5:
      return reviewStars.zeroHalfStar();
      break;
    case 1:
      return reviewStars.oneStar();
      break;
    case 1.5:
      return reviewStars.oneHalfStar();
      break;
    case 2:
      return reviewStars.twoStar();
      break;
    case 2.5:
      return reviewStars.twoHalfStar();
      break;
    case 3:
      return reviewStars.threeStar();
      break;
    case 3.5:
      return reviewStars.threeHalfStar();
      break;
    case 4:
      return reviewStars.fourStar();
      break;
    case 4.5:
      return reviewStars.fourHalfStar();
      break;
    case 5:
      return reviewStars.fiveStar();
      break;
  }
}
async function processReview(
  path,
  container,
  text,
  mainContainer,
  ckSnap,
  fillContainer,
  makeCmnt,
  tempCmnt,
) {
  //distribute
  let div = document.createElement("div");
  if (!ckSnap.data()?.reviewsComputed) {
    await distribute(path, makeCmnt, tempCmnt);
  }
  div.innerHTML = localStorage.getItem("firstCmnt");
  tempCmnt.replaceWith(div.firstElementChild);
  //making container
  let ref = doc(db, ...path, "reviews", "stars");
  let snap = await getDoc(ref);
  let data = snap.data() || { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0, size: "0" };
  let ppl = data.size;
  let total = 0;
  for (let key in data) {
    if (key == "size") break;
    total += data[key];
  }
  let average;
  if (total) {
    average =
      (1 * (data["1"] || 0) +
        2 * (data["2"] || 0) +
        3 * (data["3"] || 0) +
        4 * (data["4"] || 0) +
        5 * (data["5"] || 0)) /
      total;
    average = average.toFixed(1);
  } else {
    average = 0;
  }
  text.textContent = "" + average;
  if (average >= 4.75) {
    container.innerHTML = getStar(5);
    mainContainer.innerHTML = getStar(5);
  } else if (average > 4) {
    container.innerHTML = getStar(4.5);
    mainContainer.innerHTML = getStar(4.5);
  } else if (average >= 3.75) {
    container.innerHTML = getStar(4);
    mainContainer.innerHTML = getStar(4);
  } else if (average > 3) {
    container.innerHTML = getStar(3.5);
    mainContainer.innerHTML = getStar(3.5);
  } else if (average >= 2.75) {
    container.innerHTML = getStar(3);
    mainContainer.innerHTML = getStar(3);
  } else if (average > 2) {
    container.innerHTML = getStar(2.5);
    mainContainer.innerHTML = getStar(2.5);
  } else if (average >= 1.75) {
    container.innerHTML = getStar(2);
    mainContainer.innerHTML = getStar(2);
  } else if (average > 1) {
    container.innerHTML = getStar(1.5);
    mainContainer.innerHTML = getStar(1.5);
  } else if (average >= 0.75) {
    container.innerHTML = getStar(1);
    mainContainer.innerHTML = getStar(1);
  } else if (average > 0) {
    container.innerHTML = getStar(0.5);
    mainContainer.innerHTML = getStar(0.5);
  } else if (average == 0) {
    container.innerHTML = getStar(0);
    mainContainer.innerHTML = getStar(0);
  }
  //modifying
  let existing = mainContainer.querySelector(".ppl");
  if (existing) {
    existing.textContent = ppl;
  } else {
    let div = document.createElement("div");

    div.textContent = ppl;

    div.classList.add("ppl");

    mainContainer.append(div);
  }
  //percentage
  let percentage = {};
  for (let key in data) {
    if (key === "size") break;
    percentage[key] = total ? (data[key] / total) * 100 + "%" : "0%";
  }
  for (let i = 1; i <= 5; i++) {
    if (fillContainer[i - 1]) {
      fillContainer[i - 1].style.width = percentage[String(i)] || "0%";
    }
  }
}
async function distribute(path, makeCmnt, tempCmnt) {
  let ref = collection(db, ...path, "cmnts");
  let data = {
    1: 0,
    2: 0,
    3: 0,
    4: 0,
    5: 0,
  };
  let snaps = await getDocs(ref);
  const ppl = snaps.size.toString();
  data.size = ppl;
  if (ppl != 0) {
    let firstCmnt = snaps.docs[0]?.data();
    localStorage.setItem(
      "firstCmnt",
      makeCmnt(
        firstCmnt.img,
        firstCmnt.email,
        getStar(firstCmnt.score),
        firstCmnt.cmnt,
      ),
    );

    snaps.forEach((snap) => {
      let score = snap.data().score?.toString() || "0";
      if (data[score] !== undefined) {
        data[score]++;
      }
    });
    await setDoc(doc(db, ...path, "reviews", "stars"), data);
    await setDoc(
      doc(db, ...path),
      {
        reviewsComputed: true,
      },
      { merge: true },
    );
  }
}
export {
  auth,
  GoogleAuthProvider,
  FacebookAuthProvider,
  TwitterAuthProvider,
  signInWithEmailAndPassword,
  signInWithPopup,
  createUserWithEmailAndPassword,
  onAuthStateChanged,
  db,
  collection,
  doc,
  getDoc,
  setDoc,
  addDoc,
  getDocs,
  updateDoc,
  processReview,
  reviewStars,
  distribute,
  getStar,
};
