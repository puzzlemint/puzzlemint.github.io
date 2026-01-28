// Simple mobile-first Word Search (tap start cell, tap end cell)

const gridEl = document.getElementById("grid");
const wordsEl = document.getElementById("words");
const metaEl = document.getElementById("meta");
const msgEl = document.getElementById("message");

const SIZE_DEFAULT = 12;
const FILLER = "ABCDEFGHIJKLMNOPQRSTUVWXYZ";

let puzzle = null;
let board = [];
let found = new Set();

let startCell = null;

function fmtDate(d){
  const y = d.getFullYear();
  const m = String(d.getMonth()+1).padStart(2,"0");
  const day = String(d.getDate()).padStart(2,"0");
  return `${y}-${m}-${day}`;
}

async function loadToday(){
  const dateStr = fmtDate(new Date());
  const url = `../puzzles/wordsearch/${dateStr}.json`;
  try{
    const res = await fetch(url, {cache:"no-store"});
    if(!res.ok) throw new Error("Not found");
    const data = await res.json();
    initPuzzle(data, dateStr);
  }catch(e){
    initPuzzle({
      title:"Daily Word Search",
      theme:"GENERAL",
      size: SIZE_DEFAULT,
      words:["PUZZLE","BRAIN","MOBILE","SEARCH","LOGIC","DAILY","FOCUS","SMART","GRID","LETTER","PLAY","FUN"]
    }, "Generated");
  }
}

function initPuzzle(data, dateStr){
  puzzle = normalizePuzzle(data, dateStr);
  found = new Set();
  startCell = null;
  board = buildBoard(puzzle.size, puzzle.words);
  render();
  metaEl.textContent = `${puzzle.title} • ${puzzle.theme} • ${dateStr}`;
  msgEl.textContent = "Tap a start letter, then tap an end letter in a straight line.";
}

function normalizePuzzle(data, dateStr){
  const size = clampInt(data.size ?? SIZE_DEFAULT, 8, 16);
  let words = Array.isArray(data.words) ? data.words : [];
  words = words.map(w => String(w).toUpperCase().replace(/[^A-Z]/g,"")).filter(w => w.length >= 3);
  words = [...new Set(words)].filter(w => w.length <= size);
  if(words.length < 6){
    words = ["PUZZLE","BRAIN","MOBILE","SEARCH","LOGIC","DAILY"].filter(w=>w.length<=size);
  }
  return { title: data.title ?? "Daily Word Search", theme: data.theme ?? "GENERAL", date: dateStr, size, words };
}

function clampInt(v,min,max){
  const n = Number(v);
  if(!Number.isFinite(n)) return min;
  return Math.max(min, Math.min(max, Math.trunc(n)));
}

function buildBoard(size, words){
  const grid = Array.from({length:size}, () => Array.from({length:size}, () => ""));
  const dirs = [[1,0],[-1,0],[0,1],[0,-1],[1,1],[1,-1],[-1,1],[-1,-1]];
  const shuffled = [...words].sort((a,b)=>b.length-a.length);

  for(const w of shuffled){
    let placed=false;
    for(let tries=0; tries<250 && !placed; tries++){
      const [dx,dy] = dirs[Math.floor(Math.random()*dirs.length)];
      const x0 = Math.floor(Math.random()*size);
      const y0 = Math.floor(Math.random()*size);
      const x1 = x0 + dx*(w.length-1);
      const y1 = y0 + dy*(w.length-1);
      if(x1<0||x1>=size||y1<0||y1>=size) continue;

      let ok=true;
      for(let i=0;i<w.length;i++){
        const x=x0+dx*i, y=y0+dy*i;
        const ch = grid[y][x];
        if(ch!=="" && ch!==w[i]){ ok=false; break; }
      }
      if(!ok) continue;

      for(let i=0;i<w.length;i++){
        const x=x0+dx*i, y=y0+dy*i;
        grid[y][x]=w[i];
      }
      placed=true;
    }
  }

  for(let y=0;y<size;y++){
    for(let x=0;x<size;x++){
      if(grid[y][x]==="") grid[y][x]=FILLER[Math.floor(Math.random()*FILLER.length)];
    }
  }
  return grid;
}

function render(){
  renderGrid();
  renderWordList();
}

function renderGrid(){
  gridEl.innerHTML = "";
  gridEl.style.gridTemplateColumns = `repeat(${puzzle.size}, minmax(0, 1fr))`;

  for(let y=0;y<puzzle.size;y++){
    for(let x=0;x<puzzle.size;x++){
      const cell = document.createElement("button");
      cell.className = "cell";
      cell.type = "button";
      cell.textContent = board[y][x];
      cell.dataset.x = String(x);
      cell.dataset.y = String(y);
      cell.addEventListener("click", () => onCellTap(x,y));
      gridEl.appendChild(cell);
    }
  }
}

function renderWordList(){
  wordsEl.innerHTML = "";
  for(const w of puzzle.words){
    const div = document.createElement("div");
    div.className = "word" + (found.has(w) ? " done" : "");
    div.textContent = w;
    wordsEl.appendChild(div);
  }
}

function onCellTap(x,y){
  clearSelectionUI();

  if(!startCell){
    startCell = {x,y};
    cellAt(x,y)?.classList.add("selected");
    return;
  }

  const end = {x,y};
  const path = getStraightPath(startCell, end);
  if(!path){
    msgEl.textContent = "Must be a straight line. Try again.";
    startCell = null;
    return;
  }

  highlightPath(path);

  const str = path.map(p => board[p.y][p.x]).join("");
  const rev = str.split("").reverse().join("");
  const match = puzzle.words.find(w => w === str || w === rev);

  if(match){
    found.add(match);
    markFound(path);
    msgEl.textContent = `Found: ${match} (${found.size}/${puzzle.words.length})`;
    renderWordList();
  }else{
    msgEl.textContent = "Not a word. Try again.";
  }

  startCell = null;
}

function getStraightPath(a,b){
  const dx = b.x - a.x;
  const dy = b.y - a.y;
  if(!(dx===0 || dy===0 || Math.abs(dx)===Math.abs(dy))) return null;

  const stepX = dx===0 ? 0 : dx/Math.abs(dx);
  const stepY = dy===0 ? 0 : dy/Math.abs(dy);
  const len = Math.max(Math.abs(dx), Math.abs(dy)) + 1;

  const path=[];
  let x=a.x, y=a.y;
  for(let i=0;i<len;i++){
    path.push({x,y});
    x+=stepX; y+=stepY;
  }
  return path;
}

function clearSelectionUI(){
  gridEl.querySelectorAll(".cell.selected").forEach(el=>el.classList.remove("selected"));
}
function highlightPath(path){
  path.forEach(p=>cellAt(p.x,p.y)?.classList.add("selected"));
}
function markFound(path){
  path.forEach(p=>cellAt(p.x,p.y)?.classList.add("found"));
}
function cellAt(x,y){
  return gridEl.querySelector(`.cell[data-x="${x}"][data-y="${y}"]`);
}

// boot
loadToday();
