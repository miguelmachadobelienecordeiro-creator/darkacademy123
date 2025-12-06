// ----------------- CONFIG FIREBASE -----------------
const firebaseConfig = {
  apiKey: "AIzaSyCkmqu60VH5bsHE4c8J0fZesiPGBFJprw0",
  authDomain: "dark-academy-dc5f4.firebaseapp.com",
  databaseURL: "https://dark-academy-dc5f4-default-rtdb.firebaseio.com",
  projectId: "dark-academy-dc5f4",
  storageBucket: "dark-academy-dc5f4.firebasestorage.app",
  messagingSenderId: "182340690460",
  appId: "1:182340690460:web:ee84ca564efb931a7535d9",
  measurementId: "G-66Q9VXG8CE"
};
firebase.initializeApp(firebaseConfig);
const database = firebase.database();

// ----------------- DASHBOARD -----------------
let currentUserId = localStorage.getItem("currentUser");
let currentMode = "bedwars";
let chattingWith = null;
const allowedVideoUsers = ["DARK","ARTHUR"];

if(!currentUserId){
    window.location.href = "index.html";
}else{
    database.ref("users/" + currentUserId).once("value", snap=>{
        const user = snap.val();
        document.getElementById("welcome").innerText = `Bem-vindo, ${user.nick}`;
    });
}

// ----------------- Modo BedWars / Fortnite -----------------
function showMode(mode){
    currentMode = mode;
    const container = document.getElementById("mode-container");
    container.innerHTML = "";

    const kills = document.createElement("input");
    kills.placeholder = "Kills";
    kills.id = "stat-kills";

    const wins = document.createElement("input");
    wins.placeholder = "Vitórias";
    wins.id = "stat-wins";
    if(mode==="fortnite") wins.style.display="none";

    const partidas = document.createElement("input");
    partidas.placeholder = "Partidas";
    partidas.id = "stat-partidas";

    let serverInput = null;
    if(mode==="bedwars"){
        serverInput = document.createElement("select");
        serverInput.id="stat-server";
        ["Hylex","Mush","Hypixel"].forEach(s=>{
            const option = document.createElement("option");
            option.value = s;
            option.text = s;
            serverInput.appendChild(option);
        });
    }

    const video = document.createElement("input");
    video.placeholder = "URL do vídeo";
    video.id="stat-video";

    const submitBtn = document.createElement("button");
    submitBtn.innerText="Enviar";
    submitBtn.onclick = ()=>submitStats();

    container.appendChild(kills);
    if(wins.style.display!=="none") container.appendChild(wins);
    container.appendChild(partidas);
    if(serverInput) container.appendChild(serverInput);
    container.appendChild(video);
    container.appendChild(submitBtn);
}

// ----------------- Enviar Stats -----------------
function submitStats(){
    const kills = document.getElementById("stat-kills").value || 0;
    const wins = document.getElementById("stat-wins")? document.getElementById("stat-wins").value : 0;
    const partidas = document.getElementById("stat-partidas").value || 0;
    const server = document.getElementById("stat-server")? document.getElementById("stat-server").value : "";
    const videoURL = document.getElementById("stat-video").value || "";

    const userRef = database.ref("users/"+currentUserId+"/stats/"+currentMode);
    userRef.once("value", snap=>{
        const data = snap.val();
        const updated = {
            kills: Number(kills) || data.kills,
            wins: Number(wins) || data.wins,
            partidas: Number(partidas) || data.partidas,
            server: server || data.server,
            videos: videoURL ? [...(data.videos||[]), videoURL] : data.videos||[]
        };
        userRef.set(updated, ()=>{
            alert("Stats enviados!");
            updateRanking();
        });
    });
}

// ----------------- Ranking Top 100 -----------------
function updateRanking(){
    const rankingContainer = document.getElementById("ranking-container");
    rankingContainer.innerHTML = `<h3>Ranking ${currentMode}</h3>`;

    database.ref("users").once("value", snap=>{
        const users = [];
        snap.forEach(u=>{
            const userData = u.val();
            users.push({nick:userData.nick,id:u.key,stats:userData.stats[currentMode]});
        });
        users.sort((a,b)=>b.stats.kills - a.stats.kills);
        users.slice(0,100).forEach((u,index)=>{
            const div = document.createElement("div");
            div.innerText = `#${index+1} ${u.nick} - Kills: ${u.stats.kills}, Partidas: ${u.stats.partidas}`;
            div.onclick = ()=>openChat(u.id,u.nick);
            rankingContainer.appendChild(div);
        });
    });
}

// ----------------- Chat -----------------
function openChat(userId,nick){
    chattingWith = userId;
    document.getElementById("chat-with").innerText = nick;
    document.getElementById("chat-container").style.display="block";
    loadChat();
}

function closeChat(){
    chattingWith = null;
    document.getElementById("chat-container").style.display="none";
}

function sendMessage(){
    const msgInput = document.getElementById("chat-input");
    if(!chattingWith || msgInput.value==="") return;
    const msg = {
        from: currentUserId,
        text: msgInput.value,
        timestamp: Date.now()
    };
    database.ref("chats/"+currentUserId+"/"+chattingWith).push(msg);
    database.ref("chats/"+chattingWith+"/"+currentUserId).push(msg);
    msgInput.value="";
}

function loadChat(){
    const messagesDiv = document.getElementById("chat-messages");
    messagesDiv.innerHTML="";
    if(!chattingWith) return;

    database.ref("chats/"+currentUserId+"/"+chattingWith).on("value", snap=>{
        messagesDiv.innerHTML="";
        snap.forEach(s=>{
            const m = s.val();
            const div = document.createElement("div");
            div.innerText = `${m.from===currentUserId?"Você":"Outro"}: ${m.text}`;
            messagesDiv.appendChild(div);
        });
        messagesDiv.scrollTop = messagesDiv.scrollHeight;
    });
}

// Atualiza ranking automaticamente
updateRanking();
