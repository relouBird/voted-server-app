// import express from "express";
const express = require("express");
// import { createServer } from "node:http";
const { createServer } = require("http");
// import cors from "cors"
const cors = require("cors");
// import { Server } from "socket.io";
const { Server } = require("socket.io");

// import { initializeApp } from "firebase/app";
const { initializeApp } = require("firebase/app");

// import {
//   getFirestore,
//   collection,
//   doc,
//   setDoc,
//   getDocs,
// } from "firebase/firestore";
const {
  getFirestore,
  collection,
  doc,
  query,
  where,
  setDoc,
  getDocs,
  updateDoc,
} = require("firebase/firestore");

const {
  getStorage,
  ref,
  uploadBytes,
  getDownloadURL,
} = require("firebase/storage");

// import { config } from "dotenv";
const { config } = require("dotenv");

const corsOptions = {
  origin: "*",
  methods: "GET,HEAD,PUT,PATCH,POST,DELETE",
  credentials: true,
  optionsSuccessStatus: 204,
};

const app = express();
app.use(cors(corsOptions));
const server = createServer(app);
const io = new Server(server, {
  cors: {
    origin: "*",
    methods: ["GET", "POST"],
    credentials: true,
  },
  transports: ["websocket", "polling"],
  path: '/server/socket.io', // Chemin pour Socket.IO
  connectionStateRecovery: {},
});

config();

// Your web app's Firebase configuration
// For Firebase JS SDK v7.20.0 and later, measurementId is optional
const firebaseConfig = {
  apiKey: process.env.FIREBASE_API_KEY,
  authDomain: "voted-web-app-9e54c.firebaseapp.com",
  projectId: "voted-web-app-9e54c",
  storageBucket: "voted-web-app-9e54c.appspot.com",
  messagingSenderId: "213625233671",
  appId: "1:213625233671:web:bdee62afcb0bc157f725a2",
};

// Initialize Firebase
const appFirebase = initializeApp(firebaseConfig);
// Initialize Cloud Firestore and get a reference to the service
const db = getFirestore(appFirebase);
// Initialize Cloud Storage;
const storage = getStorage(appFirebase);

let data = [];

let vote = [];


// Appel de la fonction asynchrone
// fetchData();

let totalVoting = 0;

let votingPolls = {
  "I'am crazy.": 0,
  "I'm good person.": 0,
};

app.get("/", (req, res) => {
  res.send("<h1>Hello world</h1>");
});

io.on("connection", (socket) => {
  console.log("a user connected");

  socket.emit("receive-submission", data);
  socket.on("send-submission", async ({ id, mat, nom, imageFile, text }) => {
    try {
      const storageRef = ref(storage, `candidates-${id}/${mat}`);

      // 'file' comes from the Blob or File API
      await uploadBytes(storageRef, imageFile).then( (snapshot) => {
        console.log("Uploaded a blob or file!");
         getDownloadURL(snapshot.ref).then(async (url) => {
          await setDoc(doc(collection(db, "candidates")), {
            matricule: mat,
            voteId: id,
            nameCandidate: nom,
            response: text,
            image: url,
          });
        });
      });
      // recuperation donc du doc
      data = [];
      const q = query(collection(db, "candidates"), where("voteId", "==", id));
      const querySnapshot = await getDocs(q);
      querySnapshot.forEach((candidateData) => {
        // console.log(`${doc.id} => ${doc.data()}`);
        if (candidateData.data()) {
          data.push(candidateData.data());
          console.log(candidateData.data());
        } else {
          console.log("No data");
        }
      });
    } catch (e) {
      console.error("Error adding document: ", e);
    }
    console.log("");
    socket.broadcast.emit("receive-submission-teacher", data);
    io.emit("receive-submission", data);
  });

  socket.emit("receive-vote", vote);
  socket.on("send-vote", async (tabData) => {
    // ici il s'agit de mettre les données dans la base de données et maintenant il faut les ressortir pour les envoyer au prof.
    const q = query(
      collection(db, "vote"),
      where("vid", "==", tabData[0])
    );
    const querySnapshot = await getDocs(q);
    querySnapshot.forEach(async (vote) => {
      // doc.data() is never undefined for query doc snapshots
      if(vote.data()){
        let updatedListeVote = [];
        if(vote.data().liste_vote && vote.data().liste_vote.length){
          updatedListeVote = vote.data().liste_vote.map(voteItem => {
            if (String(voteItem)) {
              return [...voteItem];
            }
            return voteItem;
          });
        } 
        updatedListeVote.push(tabData[1]+ ","+ tabData[2]);

        await updateDoc(doc(db, "vote", vote.id), {
          liste_vote: updatedListeVote,
        });
        console.log(`on vote-${tabData[0]} user with matricule ${tabData[2]} voted for candidate with matricule ${tabData[1]}`)
      }
    });

    // envoyer les données coté prof.
    //----------------------------------
    const querySnapshotUpdate = await getDocs(q);
    querySnapshotUpdate.forEach((ob)=>{
      if(ob.data()){
        let d = ob.data();
        d.liste_candidate.forEach((candidateMatricule) => {
          // permet de recuperer le nombre de vote du candidat
          let candidateVote = 0;
          d.liste_vote.forEach((tabVote) => {
            let currentTab = tabVote.split(",");
            if (currentTab[0] == candidateMatricule) {
              candidateVote++;
            }
          });
          vote.push([
            candidateMatricule,
            "",
            candidateVote,
            d.liste_vote.length,
          ]);
        })
      }
    })

    async function getDataFrom() {
      for (let i = 0; i < vote.length; i++) {
        const candidateData = vote[i];
        const candidateMatriculeQuery = query(
          collection(db, "candidates"),
          where("matricule", "==", candidateData[0])
        );
        const candidateMatriculeQuerySnapshot = await getDocs(
          candidateMatriculeQuery
        );
        candidateMatriculeQuerySnapshot.forEach((candidate) => {
          if (candidate.data()) {
            vote[i][1] = candidate.data().nameCandidate;
          }
        });
      }
    }
    await getDataFrom();

    socket.broadcast.emit("receive-vote", vote);
    io.emit("receive-vote-teacher", vote);
    io.emit("receive-vote", vote);
  });

  socket.on("disconnect", () => {
    console.log("user disconnected");
  });
});

server.listen(process.env.PORT, () => {
  console.log("server running at 127.1.0.0:"+ process.env.PORT);
});