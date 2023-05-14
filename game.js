/**
 * @type HTMLCanvasElement
 */

const canvas = document.getElementById("canvas");
const clearButton = document.getElementById("clearButton");
const playButton = document.getElementById("play");
const ctx = canvas.getContext("2d");
const w = ctx.canvas.width;
const h = ctx.canvas.height;

const BACKGROUND_COLOR = "#ffffff";
const CELL_COLOR = "#000000";
const CELL_ROWS = 100;
const CELL_SIZE = w / CELL_ROWS 
let playgame = false;
let isDrawing = false;

class Cell {
    constructor(color, x, y, nbors) {
        this.color = color;
        this.x = x;
        this.y = y;
        this.nbors = nbors
    }
}

var m;

const initMatrix = () => {
  const matrix = [];
  for (let i = 0; i < CELL_ROWS; i++) {
    const row = [];
    for (let j = 0; j < CELL_ROWS; j++) {
      row.push(new Cell(BACKGROUND_COLOR,j,i,0));
    }
    matrix.push(row);
  }
  return matrix;
}


const drawGrid = () => {
    for (var i = 0; i < CELL_ROWS; i++) {
        ctx.beginPath();
        ctx.moveTo(i * CELL_SIZE, 0);
        ctx.lineTo(i * CELL_SIZE, h);
        ctx.stroke();
        ctx.beginPath();
        ctx.moveTo(0,i * CELL_SIZE);
        ctx.lineTo(w, i * CELL_SIZE);
        ctx.stroke();
    }
}

const drawBackground = (c) => {
    ctx.fillStyle = c;
    ctx.fillRect(0,0,w,h);
}

const handleMouseDownEvent = (e) => {
    isDrawing = true;
    draw(e);
}

const draw = (e) => {
    if (e.button !== 0 || !isDrawing) {
        return;
    }
    const x = e.offsetX;
    const y = e.offsetY;
    const r = Math.floor(x / CELL_SIZE);
    const c = Math.floor(y / CELL_SIZE);
    if (m[c][r].color == BACKGROUND_COLOR){
        m[c][r].color = CELL_COLOR;
        fillCell(r,c, CELL_COLOR); 
    }
}

const stopDrawing = () => {
    isDrawing = false;
}

const handleClearButtonClick = () => {
    setGrid();
}

const fillCell = (cellX, cellY, color) => {
    ctx.fillStyle = color;
    ctx.fillRect(cellX * CELL_SIZE, cellY * CELL_SIZE, CELL_SIZE, CELL_SIZE);
}

const setGrid = () => {
    drawBackground("#ffffff");
    //drawGrid();
    m = initMatrix();
    playgame = false;
}


const checkNbors = () => {
    for (var i = 0; i < CELL_ROWS; i++) {
        for (var j = 0; j < CELL_ROWS; j++) {
            var nbors = 0;
            if (i == 0 || i == CELL_ROWS - 1 || j == 0 || j == CELL_ROWS - 1 ){
                //
            }
            else {
                if (m[i+1][j].color == CELL_COLOR){
                    nbors++;
                }
                if (m[i-1][j].color == CELL_COLOR){
                    nbors++;
                }
                if (m[i+1][j+1].color == CELL_COLOR){
                    nbors++;
                }
                if (m[i-1][j+1].color == CELL_COLOR){
                    nbors++;
                }
                if (m[i][j+1].color == CELL_COLOR){
                    nbors++;
                }
                if (m[i][j-1].color == CELL_COLOR){
                    nbors++;
                }
                if (m[i+1][j - 1].color == CELL_COLOR){
                    nbors++;
                }
                if (m[i-1][j - 1].color == CELL_COLOR){
                    nbors++;
                }
            }
            m[i][j].nbors = nbors; 
        }
    }
}

const updateGrid = () => {
    for (var i = 0; i < CELL_ROWS; i++) {
        for (var j = 0; j < CELL_ROWS; j++) {
            if (m[i][j].color == CELL_COLOR) {
                // alive
                if (m[i][j].nbors < 2) {
                    m[i][j].color = BACKGROUND_COLOR;
                    fillCell(m[i][j].x, m[i][j].y, BACKGROUND_COLOR);
                }
                else if (m[i][j].nbors == 2 || m[i][j].nbors == 3) {j
                    // nothing
                }
                else {
                    m[i][j].color = BACKGROUND_COLOR;j
                    fillCell(m[i][j].x, m[i][j].y, BACKGROUND_COLOR);
                }
            }
            else if (m[i][j].color === BACKGROUND_COLOR) {
                if (m[i][j].nbors === 3) {
                    m[i][j].color = CELL_COLOR;
                    fillCell(m[i][j].x, m[i][j].y, CELL_COLOR);
                }
            }
        }
    }
}

function rungame() {
    if (playgame){
        checkNbors();
        updateGrid();
        setTimeout(rungame, 100);    
    }
}

const handlePlayClick = () => {
    playgame = true;
    rungame();
}
setGrid();

canvas.addEventListener("mousedown", handleMouseDownEvent);
canvas.addEventListener("mousemove", draw)
canvas.addEventListener("mouseup", stopDrawing);
canvas.addEventListener("mouseout", stopDrawing);
clearButton.addEventListener("click", handleClearButtonClick);
playButton.addEventListener("click", handlePlayClick);