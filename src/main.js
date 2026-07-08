import "./style.css";
import rabbitUrl from "./assets/rabbit.svg";

const canvas = document.getElementById("game");
const context = canvas.getContext("2d");

const GAME_SIZE = 384;

const grid = 32;
const tileCount = GAME_SIZE / grid;

function resizeCanvas() {
  const dpr = window.devicePixelRatio || 1;

  canvas.width = GAME_SIZE * dpr;
  canvas.height = GAME_SIZE * dpr;

  canvas.style.width = "90vw";
  canvas.style.height = "90vw";
  canvas.style.maxWidth = "90vh";
  canvas.style.maxHeight = "90vh";

  context.setTransform(dpr, 0, 0, dpr, 0, 0);

  context.imageSmoothingEnabled = true;
  context.imageSmoothingQuality = "high";
}

resizeCanvas();

window.addEventListener("resize", resizeCanvas);

const COLORS = {
  bus: "#E53935",
  busDark: "#B71C1C",
  busFront: "#FF5252",
  window: "#FFCDD2",
  wheel: "#263238",
};

const rabbitImg = new Image();
rabbitImg.src = rabbitUrl;

let lastTime = 0;
const step = 1000 / 6;
let accumulator = 0;
let snake;
let pickup;
let score;
let gameOver = false;

function updateHud() {
  document.getElementById("hud").innerText = "Пассажиры: " + score;
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

  pickup = spawnPickup();
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

function spawnPickup() {
  let x, y;
  let tries = 0;

  do {
    x = getRandomInt(0, tileCount) * grid;
    y = getRandomInt(0, tileCount) * grid;
    tries++;
  } while (isOnSnake(x, y) && tries < 100);

  return { x, y };
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

function drawWheels() {
  const wheelR = grid / 8;
  const wheelY = grid - grid / 8;

  context.fillStyle = COLORS.wheel;
  context.beginPath();
  context.arc(grid / 4, wheelY, wheelR, 0, Math.PI * 2);
  context.arc(grid - grid / 4, wheelY, wheelR, 0, Math.PI * 2);
  context.fill();
}

function drawRabbitInWindow(x, y, size) {
  if (!rabbitImg.complete) return;
  context.drawImage(rabbitImg, x, y, size, size);
}

function drawBusHead() {
  const bodyH = grid - grid / 4;
  const radius = grid / 10;

  context.fillStyle = COLORS.bus;
  roundRect(0, grid / 16, grid - 1, bodyH, radius);
  context.fill();

  context.fillStyle = COLORS.busFront;
  roundRect(
    grid - grid / 2.3,
    grid / 8,
    grid / 5.3,
    grid - grid / 5.3,
    grid / 16,
  );
  context.fill();

  context.fillStyle = COLORS.window;
  roundRect(grid / 10, grid / 10, grid / 4, grid / 4.5, grid / 16);
  context.fill();

  drawRabbitInWindow(grid / 9, grid / 12, grid / 4.5);

  drawWheels();
}

function drawBusCarriage() {
  const bodyH = grid - grid / 4;
  const radius = grid / 16;

  context.fillStyle = COLORS.bus;
  roundRect(0, grid / 16, grid - 1, bodyH, radius);
  context.fill();

  context.strokeStyle = COLORS.busDark;
  context.lineWidth = 2;
  context.strokeRect(1, grid / 10, grid - 2, bodyH - grid / 20);

  context.fillStyle = COLORS.window;
  roundRect(grid / 10, grid / 10, grid - grid / 5, grid / 4.5, grid / 16);
  context.fill();

  drawRabbitInWindow(grid / 8, grid / 10, grid / 5.3);

  drawWheels();
}

function drawBusSegment(cell, index) {
  const { dx, dy } = getSegmentDirection(index);

  context.save();
  context.translate(cell.x + grid / 2, cell.y + grid / 2);

  if (dx < 0) context.rotate(Math.PI);
  else if (dy > 0) context.rotate(Math.PI / 2);
  else if (dy < 0) context.rotate(-Math.PI / 2);

  context.translate(-grid / 2, -grid / 2);

  if (index === 0) {
    drawBusHead();
  } else {
    drawBusCarriage();
  }

  context.restore();
}

function drawPickup() {
  if (!rabbitImg.complete) return;

  context.save();

  const padding = 2;
  const size = grid - padding * 2;

  context.drawImage(
    rabbitImg,
    pickup.x + padding,
    pickup.y + padding,
    size,
    size,
  );

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

  if (snake.x === pickup.x && snake.y === pickup.y) {
    snake.maxCells++;
    score++;
    updateHud();
    pickup = spawnPickup();
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

  drawPickup();

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

canvas.addEventListener(
  "touchstart",
  (e) => {
    const touch = e.touches[0];
    startX = touch.clientX;
    startY = touch.clientY;
  },
  { passive: true },
);

canvas.addEventListener(
  "touchend",
  (e) => {
    const touch = e.changedTouches[0];
    const dx = touch.clientX - startX;
    const dy = touch.clientY - startY;

    if (Math.abs(dx) < 20 && Math.abs(dy) < 20) return;

    if (Math.abs(dx) > Math.abs(dy)) {
      setDirection(dx > 0 ? grid : -grid, 0);
    } else {
      setDirection(0, dy > 0 ? grid : -grid);
    }
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

if (rabbitImg.complete) {
  startGame();
} else {
  rabbitImg.onload = startGame;
}
