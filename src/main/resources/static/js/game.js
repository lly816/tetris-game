const COLS = 10;
const ROWS = 20;
const BLOCK_SIZE = 30;
const COLORS = [
    null,
    '#00ffff',
    '#ffff00',
    '#800080',
    '#00ff00',
    '#ff0000',
    '#0000ff',
    '#ffa500'
];

const SHAPES = [
    [],
    [[0, 0, 0, 0], [1, 1, 1, 1], [0, 0, 0, 0], [0, 0, 0, 0]],
    [[2, 2], [2, 2]],
    [[0, 3, 0], [3, 3, 3], [0, 0, 0]],
    [[0, 4, 4], [4, 4, 0], [0, 0, 0]],
    [[5, 5, 0], [0, 5, 5], [0, 0, 0]],
    [[6, 0, 0], [6, 6, 6], [0, 0, 0]],
    [[0, 0, 7], [7, 7, 7], [0, 0, 0]]
];

const canvas = document.getElementById('gameCanvas');
const ctx = canvas.getContext('2d');
const nextCanvas = document.getElementById('nextCanvas');
const nextCtx = nextCanvas.getContext('2d');

let board = [];
let currentPiece = null;
let nextPiece = null;
let score = 0;
let level = 1;
let highScore = localStorage.getItem('tetrisHighScore') || 0;
let gameOver = false;
let paused = false;
let dropInterval = 1000;
let lastDropTime = 0;
let animationId = null;

document.getElementById('highScore').textContent = highScore;

function createBoard() {
    board = [];
    for (let r = 0; r < ROWS; r++) {
        board.push(new Array(COLS).fill(0));
    }
}

function createPiece() {
    const typeId = Math.floor(Math.random() * 7) + 1;
    return {
        shape: SHAPES[typeId].map(row => [...row]),
        color: typeId,
        x: Math.floor(COLS / 2) - 2,
        y: 0
    };
}

function drawBlock(ctx, x, y, color, size = BLOCK_SIZE) {
    ctx.fillStyle = color;
    ctx.fillRect(x * size, y * size, size, size);
    ctx.strokeStyle = '#000';
    ctx.strokeRect(x * size, y * size, size, size);
    ctx.fillStyle = 'rgba(255, 255, 255, 0.3)';
    ctx.fillRect(x * size + 2, y * size + 2, size - 4, 4);
}

function draw() {
    ctx.fillStyle = '#0a0a1a';
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    for (let r = 0; r < ROWS; r++) {
        for (let c = 0; c < COLS; c++) {
            if (board[r][c]) {
                drawBlock(ctx, c, r, COLORS[board[r][c]]);
            }
        }
    }

    if (currentPiece) {
        currentPiece.shape.forEach((row, y) => {
            row.forEach((value, x) => {
                if (value) {
                    drawBlock(ctx, currentPiece.x + x, currentPiece.y + y, COLORS[value]);
                }
            });
        });
    }
}

function drawNext() {
    nextCtx.fillStyle = '#0a0a1a';
    nextCtx.fillRect(0, 0, nextCanvas.width, nextCanvas.height);

    if (nextPiece) {
        const offsetX = (4 - nextPiece.shape[0].length) / 2;
        const offsetY = (4 - nextPiece.shape.length) / 2;
        nextPiece.shape.forEach((row, y) => {
            row.forEach((value, x) => {
                if (value) {
                    drawBlock(nextCtx, offsetX + x, offsetY + y, COLORS[value], 25);
                }
            });
        });
    }
}

function isValidMove(piece, newX, newY) {
    for (let y = 0; y < piece.shape.length; y++) {
        for (let x = 0; x < piece.shape[y].length; x++) {
            if (piece.shape[y][x]) {
                const boardX = newX + x;
                const boardY = newY + y;
                if (boardX < 0 || boardX >= COLS || boardY >= ROWS) {
                    return false;
                }
                if (boardY >= 0 && board[boardY][boardX]) {
                    return false;
                }
            }
        }
    }
    return true;
}

function rotate() {
    const rotated = currentPiece.shape[0].map((_, i) =>
        currentPiece.shape.map(row => row[i]).reverse()
    );
    const original = currentPiece.shape;
    currentPiece.shape = rotated;
    if (!isValidMove(currentPiece, currentPiece.x, currentPiece.y)) {
        currentPiece.shape = original;
    }
}

function lockPiece() {
    currentPiece.shape.forEach((row, y) => {
        row.forEach((value, x) => {
            if (value) {
                const boardY = currentPiece.y + y;
                const boardX = currentPiece.x + x;
                if (boardY >= 0) {
                    board[boardY][boardX] = currentPiece.color;
                }
            }
        });
    });

    clearLines();
    spawnPiece();
}

function clearLines() {
    let linesCleared = 0;
    for (let r = ROWS - 1; r >= 0; r--) {
        if (board[r].every(cell => cell !== 0)) {
            board.splice(r, 1);
            board.unshift(new Array(COLS).fill(0));
            linesCleared++;
            r++;
        }
    }

    if (linesCleared > 0) {
        const points = [0, 100, 300, 500, 800];
        score += points[linesCleared];
        level = Math.floor(score / 1000) + 1;
        dropInterval = Math.max(100, 1000 - (level - 1) * 100);

        document.getElementById('score').textContent = score;
        document.getElementById('level').textContent = level;

        if (score > highScore) {
            highScore = score;
            localStorage.setItem('tetrisHighScore', highScore);
            document.getElementById('highScore').textContent = highScore;
        }
    }
}

function spawnPiece() {
    currentPiece = nextPiece || createPiece();
    nextPiece = createPiece();
    drawNext();

    if (!isValidMove(currentPiece, currentPiece.x, currentPiece.y)) {
        gameOver = true;
    }
}

function hardDrop() {
    while (isValidMove(currentPiece, currentPiece.x, currentPiece.y + 1)) {
        currentPiece.y++;
    }
    lockPiece();
    draw();
}

function update(time = 0) {
    if (gameOver) {
        ctx.fillStyle = 'rgba(0, 0, 0, 0.7)';
        ctx.fillRect(0, 0, canvas.width, canvas.height);
        ctx.fillStyle = '#fff';
        ctx.font = '30px Arial';
        ctx.textAlign = 'center';
        ctx.fillText('游戏结束', canvas.width / 2, canvas.height / 2);
        ctx.font = '16px Arial';
        ctx.fillText('按 R 重新开始', canvas.width / 2, canvas.height / 2 + 40);
        return;
    }

    if (paused) {
        ctx.fillStyle = 'rgba(0, 0, 0, 0.5)';
        ctx.fillRect(0, 0, canvas.width, canvas.height);
        ctx.fillStyle = '#fff';
        ctx.font = '30px Arial';
        ctx.textAlign = 'center';
        ctx.fillText('已暂停', canvas.width / 2, canvas.height / 2);
        return;
    }

    const deltaTime = time - lastDropTime;
    if (deltaTime > dropInterval) {
        if (isValidMove(currentPiece, currentPiece.x, currentPiece.y + 1)) {
            currentPiece.y++;
        } else {
            lockPiece();
        }
        lastDropTime = time;
    }

    draw();
    animationId = requestAnimationFrame(update);
}

function startGame() {
    createBoard();
    score = 0;
    level = 1;
    dropInterval = 1000;
    gameOver = false;
    paused = false;
    lastDropTime = 0;

    document.getElementById('score').textContent = score;
    document.getElementById('level').textContent = level;

    spawnPiece();
    if (animationId) {
        cancelAnimationFrame(animationId);
    }
    update();
}

document.addEventListener('keydown', event => {
    if (gameOver && event.key.toLowerCase() !== 'r') return;

    switch (event.key) {
        case 'ArrowLeft':
            if (!paused && !gameOver && isValidMove(currentPiece, currentPiece.x - 1, currentPiece.y)) {
                currentPiece.x--;
                draw();
            }
            break;
        case 'ArrowRight':
            if (!paused && !gameOver && isValidMove(currentPiece, currentPiece.x + 1, currentPiece.y)) {
                currentPiece.x++;
                draw();
            }
            break;
        case 'ArrowDown':
            if (!paused && !gameOver && isValidMove(currentPiece, currentPiece.x, currentPiece.y + 1)) {
                currentPiece.y++;
                draw();
            }
            break;
        case 'ArrowUp':
        case 'w':
        case 'W':
            if (!paused && !gameOver) {
                rotate();
                draw();
            }
            break;
        case ' ':
            if (!paused && !gameOver) {
                hardDrop();
            }
            break;
        case 'p':
        case 'P':
            paused = !paused;
            if (!paused) {
                lastDropTime = performance.now();
                update();
            }
            break;
        case 'r':
        case 'R':
            startGame();
            break;
    }
});

startGame();
