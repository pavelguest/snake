import "./style.css";
import rabbitUrl from "./assets/rabbit.svg";
import cardUrl from "./assets/card.svg";
import busHeadUrl from "./assets/bus-head.svg";
import busBodyUrl from "./assets/bus-body.svg";
import busBackUrl from "./assets/bus-back.svg";

const canvas = document.getElementById("game");
const context = canvas.getContext("2d");

const tileCount = 12;
let GAME_SIZE;
let grid;

function calculateGameSize() {
  const screen = Math.min(window.innerWidth, window.innerHeight);
  const size = screen * 0.92;
  return Math.min(Math.max(size, 384), 768);
}

function updateGameSize() {
  GAME_SIZE = calculateGameSize();
  grid = GAME_SIZE / tileCount;
}

updateGameSize();

function resizeCanvas() {
  const dpr = window.devicePixelRatio || 1;

  canvas.width = GAME_SIZE * dpr;
  canvas.height = GAME_SIZE * dpr;

  canvas.style.width = `${GAME_SIZE}px`;
  canvas.style.height = `${GAME_SIZE}px`;
  canvas.style.maxWidth = `min(90vw, 90dvh)`;
  canvas.style.maxHeight = `min(90vw, 90dvh)`;

  context.setTransform(dpr, 0, 0, dpr, 0, 0);

  context.imageSmoothingEnabled = true;
  context.imageSmoothingQuality = "high";
}

resizeCanvas();

window.addEventListener("resize", resizeCanvas);

const rabbitImg = new Image();
rabbitImg.src = rabbitUrl;

const cardImg = new Image();
cardImg.src = cardUrl;

const busHeadImg = new Image();
busHeadImg.src = busHeadUrl;

const busBodyImg = new Image();
busBodyImg.src = busBodyUrl;

const busBackImg = new Image();
busBackImg.src = busBackUrl;

let lastTime = 0;
const step = 1000 / 4;
let accumulator = 0;
let snake;
let score;
let gameOver = false;
let pickupsSinceLastCard = 0;
let nextCardAt = 0;
const CARD_TTL = 5; // seconds
let rabbit;
let card = null;

function updateHud() {
  document.getElementById("hud").innerText = "Зайцы: " + score;
}

function init() {
  snake = {
    x: grid * 6,
    y: grid * 6,
    dx: grid,
    dy: 0,
    cells: [],
    maxCells: 4,
  };

  pickupsSinceLastCard = 0;
  nextCardAt = 3 + Math.floor(Math.random() * 3);
  rabbit = spawnRabbit();
  card = null;
  score = 0;
  gameOver = false;

  updateHud();
  document.getElementById("overlay").style.display = "none";
}

function getRandomInt(min, max) {
  return Math.floor(Math.random() * (max - min)) + min;
}

function isOnSnake(x, y) {
  return snake.cells.some((cell) => cell.x === x && cell.y === y);
}

function spawnRabbit() {
  let x, y;
  let tries = 0;

  do {
    x = getRandomInt(0, tileCount) * grid;
    y = getRandomInt(0, tileCount) * grid;
    tries++;
  } while (isOnSnake(x, y) && tries < 100);

  return { x, y };
}

function spawnCard() {
  let x, y;
  let tries = 0;

  do {
    x = getRandomInt(0, tileCount) * grid;
    y = getRandomInt(0, tileCount) * grid;
    tries++;
  } while (
    (isOnSnake(x, y) || (rabbit && x === rabbit.x && y === rabbit.y)) &&
    tries < 100
  );

  return { x, y, ttl: CARD_TTL };
}

function endGame() {
  if (gameOver) return;

  gameOver = true;

  document.getElementById("overlay").style.display = "flex";
  document.getElementById("finalScore").innerText = "Зайцы: " + score;

  if (window.ReactNativeWebView) {
    window.ReactNativeWebView.postMessage(
      JSON.stringify({
        event: "GAME_OVER",
        score,
        gameType: "snake",
      }),
    );
  }
}

function restart() {
  init();
}

function setDirection(dx, dy) {
  if (gameOver) return;
  if (dx !== 0 && snake.dx === 0) {
    snake.dx = dx;
    snake.dy = 0;
  } else if (dy !== 0 && snake.dy === 0) {
    snake.dx = 0;
    snake.dy = dy;
  }
}

function getSegmentDirection(index) {
  if (index === 0) {
    return { dx: snake.dx, dy: snake.dy };
  }

  const curr = snake.cells[index];
  const towardHead = snake.cells[index - 1];
  return { dx: towardHead.x - curr.x, dy: towardHead.y - curr.y };
}

function roundRect(x, y, width, height, radius) {
  context.beginPath();
  context.moveTo(x + radius, y);
  context.lineTo(x + width - radius, y);
  context.quadraticCurveTo(x + width, y, x + width, y + radius);
  context.lineTo(x + width, y + height - radius);
  context.quadraticCurveTo(
    x + width,
    y + height,
    x + width - radius,
    y + height,
  );
  context.lineTo(x + radius, y + height);
  context.quadraticCurveTo(x, y + height, x, y + height - radius);
  context.lineTo(x, y + radius);
  context.quadraticCurveTo(x, y, x + radius, y);
  context.closePath();
}

function drawSegmentImage(img, cell, index) {
  const { dx, dy } = getSegmentDirection(index);

  context.save();
  context.translate(cell.x + grid / 2, cell.y + grid / 2);

  if (dx < 0) context.rotate(Math.PI);
  else if (dy > 0) context.rotate(Math.PI / 2);
  else if (dy < 0) context.rotate(-Math.PI / 2);

  context.translate(-grid / 2, -grid / 2);

  if (img.complete) {
    context.drawImage(img, 0, 0, grid, grid);
  } else {
    context.fillStyle = "#E53935";
    context.fillRect(0, 0, grid, grid);
  }

  context.restore();
}

function drawBusSegment(cell, index) {
  let img;

  if (index === 0) {
    img = busHeadImg;
  } else if (index === snake.cells.length - 1) {
    img = busBackImg;
  } else {
    img = busBodyImg;
  }

  drawSegmentImage(img, cell, index);
}

function drawRabbit() {
  if (!rabbitImg.complete) return;

  context.save();

  const padding = 2;
  const size = grid - padding * 2;

  context.drawImage(
    rabbitImg,
    rabbit.x + padding,
    rabbit.y + padding,
    size,
    size,
  );

  context.restore();
}

function drawCard() {
  if (!card || !cardImg.complete) return;

  context.save();

  const padding = 2;
  const size = grid - padding * 2;

  context.drawImage(cardImg, card.x + padding, card.y + padding, size, size);

  context.restore();
}

function update() {
  snake.x += snake.dx;
  snake.y += snake.dy;

  if (snake.x < 0) snake.x = GAME_SIZE - grid;
  else if (snake.x >= GAME_SIZE) snake.x = 0;

  if (snake.y < 0) snake.y = GAME_SIZE - grid;
  else if (snake.y >= GAME_SIZE) snake.y = 0;

  snake.cells.unshift({ x: snake.x, y: snake.y });

  if (snake.cells.length > snake.maxCells) {
    snake.cells.pop();
  }

  if (snake.x === rabbit.x && snake.y === rabbit.y) {
    snake.maxCells++;
    score++;
    updateHud();
    rabbit = spawnRabbit();
    pickupsSinceLastCard++;

    if (pickupsSinceLastCard >= nextCardAt && snake.cells.length >= 4) {
      card = spawnCard();
      pickupsSinceLastCard = 0;
      nextCardAt = 3 + Math.floor(Math.random() * 3);
    }
  }

  if (card && snake.x === card.x && snake.y === card.y) {
    snake.maxCells = Math.max(1, snake.maxCells - 1);

    while (snake.cells.length > snake.maxCells) {
      snake.cells.pop();
    }

    score--;
    updateHud();
    card = null;
  }

  if (card) {
    card.ttl -= step / 1000;

    if (card.ttl <= 0) {
      card = null;
    }
  }

  for (let i = 1; i < snake.cells.length; i++) {
    if (snake.cells[i].x === snake.x && snake.cells[i].y === snake.y) {
      endGame();
      return;
    }
  }
}

function render() {
  context.clearRect(0, 0, GAME_SIZE, GAME_SIZE);

  drawRabbit();

  if (card) {
    drawCard();
  }

  snake.cells.forEach((cell, index) => {
    drawBusSegment(cell, index);
  });
}

function loop(time = 0) {
  requestAnimationFrame(loop);

  if (gameOver) return;

  const delta = time - lastTime;
  lastTime = time;
  accumulator += delta;

  while (accumulator >= step) {
    update();
    accumulator -= step;
  }

  render();
}

let startX = 0;
let startY = 0;
let isSwiping = false;

canvas.addEventListener(
  "touchstart",
  (e) => {
    if (gameOver) return;

    const touch = e.touches[0];

    startX = touch.clientX;
    startY = touch.clientY;
    isSwiping = false;
  },
  { passive: true },
);

canvas.addEventListener(
  "touchmove",
  (e) => {
    if (gameOver) return;

    const touch = e.touches[0];

    const dx = touch.clientX - startX;
    const dy = touch.clientY - startY;

    if (Math.max(Math.abs(dx), Math.abs(dy)) > 10) {
      isSwiping = true;
      e.preventDefault();
    }
  },
  { passive: false },
);

canvas.addEventListener(
  "touchend",
  (e) => {
    if (gameOver || !isSwiping) return;

    const touch = e.changedTouches[0];

    const dx = touch.clientX - startX;
    const dy = touch.clientY - startY;

    const absX = Math.abs(dx);
    const absY = Math.abs(dy);

    const threshold = 20;

    if (Math.max(absX, absY) < threshold) {
      isSwiping = false;
      return;
    }

    if (absX > absY) {
      setDirection(dx > 0 ? grid : -grid, 0);
    } else {
      setDirection(0, dy > 0 ? grid : -grid);
    }

    isSwiping = false;
  },
  { passive: true },
);

canvas.addEventListener(
  "touchcancel",
  () => {
    isSwiping = false;
  },
  { passive: true },
);

window.addEventListener("keydown", (e) => {
  if (gameOver) return;

  switch (e.key) {
    case "ArrowUp":
    case "w":
    case "W":
      setDirection(0, -grid);
      break;

    case "ArrowDown":
    case "s":
    case "S":
      setDirection(0, grid);
      break;

    case "ArrowLeft":
    case "a":
    case "A":
      setDirection(-grid, 0);
      break;

    case "ArrowRight":
    case "d":
    case "D":
      setDirection(grid, 0);
      break;
  }
});

document.getElementById("restart").addEventListener("click", restart);

function startGame() {
  init();
  loop();
}

const images = [rabbitImg, cardImg, busHeadImg, busBodyImg, busBackImg];
let imagesLoaded = 0;

function onImageReady() {
  imagesLoaded++;

  if (imagesLoaded === images.length) {
    startGame();
  }
}

images.forEach((img) => {
  if (img.complete) {
    onImageReady();
  } else {
    img.onload = onImageReady;
  }

  img.onerror = onImageReady;
});
