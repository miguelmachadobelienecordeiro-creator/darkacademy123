// ----------------- IMPORTS FIREBASE -----------------
import { initializeApp } from "https://www.gstatic.com/firebasejs/9.23.0/firebase-app.js";
import { getDatabase, ref, set, get, onValue, update, push } from "https://www.gstatic.com/firebasejs/9.23.0/firebase-database.js";

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

const app = initializeApp(firebaseConfig);
const db = getDatabase(app);

// ----------------- USUÁRIO LOGADO -----------------
let usuarioLogado = null;
let chatUsuarioAtual = null;

// ----------------- LOGIN -----------------
async function login() {
    const nome = document.getElementById("login-nome").value.trim();
    const senha = document.getElementById("login-senha").value.trim();

    const snapshot = await get(ref(db, `usuarios/${nome}`));
    const usuario = snapshot.val();
    if (!usuario || usuario.senha !== senha) { alert("Usuário ou senha incorretos!"); return; }

    usuarioLogado = usuario;
    usuarioLogado.nome = nome;
    window.location.href = "dashboard.html";
}

// ----------------- CADASTRO -----------------
async function cadastrar() {
    const nome = document.getElementById("reg-nome").value.trim();
    const senha = document.getElementById("reg-senha").value.trim();

    const snapshot = await get(ref(db, `usuarios/${nome}`));
    if (snapshot.exists()) { alert("Usuário já cadastrado!"); return; }

    await set(ref(db, `usuarios/${nome}`), {
        senha,
        BedWars: { partidas: 0, kills: 0, vitorias: 0, videos: [] },
        Fortnite: { partidas: 0, kills: 0, videos: [] },
        envios: [],
        chats: {}
    });
    alert("Cadastro realizado!");
    window.location.href = "index.html";
}

// ----------------- DASHBOARD -----------------
function mostrarPerfil() {
    if (!usuarioLogado) return;
    const div = document.getElementById("perfil");
    div.innerHTML = `<img src="https://via.placeholder.com/80">
                     <div><h2>${usuarioLogado.nome}</h2></div>`;
}

// ----------------- FORMULÁRIOS -----------------
function abrirForm(jogo) {
    document.getElementById("form-BedWars").style.display = "none";
    document.getElementById("form-Fortnite").style.display = "none";
    document.getElementById("form-" + jogo).style.display = "block";
}

// ----------------- ENVIAR STATS -----------------
async function enviarStats(jogo) {
    const partidas = parseInt(document.getElementById(jogo==='BedWars'?'bw-partidas':'fn-partidas').value) || 0;
    const kills = parseInt(document.getElementById(jogo==='BedWars'?'bw-kills':'fn-kills').value) || 0;
    const vitorias = jogo==='BedWars'?parseInt(document.getElementById('bw-vitorias').value)||0:0;
    const videoURL = document.getElementById(jogo==='BedWars'?'bw-video':'fn-video').value.trim();

    // Adicionar envio para validação
    if (!usuarioLogado.envios) usuarioLogado.envios = [];
    usuarioLogado.envios.push({ jogo, partidas, kills, vitorias, video: videoURL, validado: false });

    await set(ref(db, `usuarios/${usuarioLogado.nome}`), usuarioLogado);

    alert("Stats enviados para validação!");
    document.getElementById(jogo==='BedWars'?'bw-video':'fn-video').value = "";
    renderRanking();
    atualizarVideos();
    mostrarValidacao();
}

// ----------------- VALIDAÇÃO -----------------
async function mostrarValidacao() {
    if (usuarioLogado.nome!=="DARK" && usuarioLogado.nome!=="ARTHUR") return;

    document.getElementById("validacao-container").style.display="block";
    const div = document.getElementById("validacao-list");
    div.innerHTML="";

    const snapshot = await get(ref(db, "usuarios"));
    const data = snapshot.val();

    for(let u in data){
        if(data[u].envios){
            data[u].envios.forEach((env, i)=>{
                if(!env.validado){
                    const p = document.createElement("p");
                    p.innerHTML = `${u} - ${env.jogo}: ${env.kills} kills, ${env.partidas} partidas, ${env.vitorias||'-'} vitórias 
                                   <button onclick="validar('${u}',${i})">Validar</button>`;
                    div.appendChild(p);
                }
            });
        }
    }
}

async function validar(usuarioNome, envIdx){
    const snapshot = await get(ref(db, `usuarios/${usuarioNome}`));
    const usuario = snapshot.val();
    usuario.envios[envIdx].validado=true;

    const env = usuario.envios[envIdx];
    if(env.jogo==="BedWars"){
        usuario.BedWars = { kills: env.kills, partidas: env.partidas, vitorias: env.vitorias, videos: usuario.BedWars?.videos||[] };
    } else {
        usuario.Fortnite = { kills: env.kills, partidas: env.partidas, videos: usuario.Fortnite?.videos||[] };
    }

    await set(ref(db, `usuarios/${usuarioNome}`), usuario);
    mostrarValidacao();
    renderRanking();
    atualizarVideos();
}

// ----------------- VÍDEOS -----------------
async function atualizarVideos(){
    if(usuarioLogado.nome!=="DARK" && usuarioLogado.nome!=="ARTHUR"){ 
        document.getElementById("videos-container").style.display="none"; 
        return; 
    }
    document.getElementById("videos-container").style.display="block";
    const div = document.getElementById("videos-list");
    div.innerHTML="";

    const snapshot = await get(ref(db, "usuarios"));
    const data = snapshot.val();

    for(let u in data){
        if(data[u].envios){
            data[u].envios.forEach(env=>{
                if(env.video){
                    div.innerHTML+=`<p>${u} - ${env.jogo}: <a href="${env.video}" target="_blank">${env.video}</a></p>`;
                }
            });
        }
    }
}

// ----------------- RANKING -----------------
function renderRanking(){
    const bwDiv = document.getElementById("ranking-list-BW");
    const fnDiv = document.getElementById("ranking-list-FN");

    get(ref(db,"usuarios")).then(snapshot=>{
        const data = snapshot.val();

        if(bwDiv){
            const sortedBW = Object.keys(data).map(u=>({nome:u,...data[u].BedWars})).sort((a,b)=>b.kills-a.kills).slice(0,100);
            bwDiv.innerHTML="";
            sortedBW.forEach((u,i)=>{
                bwDiv.innerHTML+=`<p>Top ${i+1} - <span onclick="abrirChat('${u.nome}')">${u.nome}</span>: ${u.kills} kills, ${u.partidas} partidas, ${u.vitorias||'-'} vitórias</p>`;
            });
        }

        if(fnDiv){
            const sortedFN = Object.keys(data).map(u=>({nome:u,...data[u].Fortnite})).sort((a,b)=>b.kills-a.kills).slice(0,100);
            fnDiv.innerHTML="";
            sortedFN.forEach((u,i)=>{
                fnDiv.innerHTML+=`<p>Top ${i+1} - <span onclick="abrirChat('${u.nome}')">${u.nome}</span>: ${u.kills} kills, ${u.partidas} partidas</p>`;
            });
        }
    });
}

// ----------------- CHAT -----------------
async function abrirChat(nomeUsuario){
    chatUsuarioAtual = nomeUsuario;
    document.getElementById("chat-container").style.display="block";
    document.getElementById("chat-titulo").innerText="Chat com "+nomeUsuario;
    atualizarChat();
}

async function enviarMensagem(){
    const input = document.getElementById("chat-input");
    const msg = input.value.trim();
    if(!msg||!chatUsuarioAtual) return;

    // Salvar para usuário logado
    if(!usuarioLogado.chats) usuarioLogado.chats={};
    if(!usuarioLogado.chats[chatUsuarioAtual]) usuarioLogado.chats[chatUsuarioAtual]=[];
    usuarioLogado.chats[chatUsuarioAtual].push({de:usuarioLogado.nome,msg});
    await set(ref(db, `usuarios/${usuarioLogado.nome}/chats`), usuarioLogado.chats);

    input.value="";
    atualizarChat();
}

async function atualizarChat(){
    if(!chatUsuarioAtual) return;

    const div = document.getElementById("chat-mensagens");
    div.innerHTML="";

    const snapshot = await get(ref(db,"usuarios"));
    const data = snapshot.val();

    // Mensagens deste usuário
    const msgs1 = usuarioLogado.chats?.[chatUsuarioAtual] || [];
    msgs1.forEach(m=>{ div.innerHTML+=`<p><strong>${m.de}:</strong> ${m.msg}</p>`; });

    // Mensagens do outro usuário
    const msgs2 = data[chatUsuarioAtual]?.chats?.[usuarioLogado.nome] || [];
    msgs2.forEach(m=>{ div.innerHTML+=`<p><strong>${m.de}:</strong> ${m.msg}</p>`; });

    div.scrollTop = div.scrollHeight;
}

// ----------------- LOGOUT -----------------
function logout(){ window.location.href="index.html"; }

