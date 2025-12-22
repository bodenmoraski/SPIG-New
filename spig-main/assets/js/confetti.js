/**
 * @typedef {[number, number]} Vec2
 */

const colors = [
  "#fa4aeb",
  "#4ab2fa",
  "#f1f01c",
  "#f11c30",
  "#1cf137",
  "#ffbb22",
];

function randomColor() {
  const i = Math.floor(Math.random() * colors.length);
  return colors[i];
}

/**
 * Generates a random velocity
 * @returns {Vec2}
 */
function randomVelocity() {
  const a = Math.random() * 5 + 30;
  const b = -a;
  const direction = Math.random() * Math.PI + Math.PI / 4;

  const x = Math.cos(direction) * a - Math.sin(direction) * b;
  const y = Math.sin(direction) * b + Math.cos(direction) * a;

  return [x, y * 4];
}

class Confetti {
  /**
   * The position of the confetti
   * @type {Vec2}
   */
  position;

  /**
   * The velocity of the confetti
   * @type {Vec2}
   */
  velocity;

  /**
   * The color of the confetti (canvas fill)
   * @type {string}
   */
  color;

  /**
   * The current rotation of the confetti
   * @type {number}
   */
  rotation;

  /**
   * The number of seconds this confetti has survived
   * @type {number}
   */
  timer;

  constructor(position) {
    this.position = position;
    this.velocity = randomVelocity();
    this.color = randomColor();
    this.rotation = Math.random() * 2 * Math.PI;
    this.timer = 0;
  }
}

/**
 * A class that wraps around a confetti canvas.
 */
export class ConfettiCannon {
  /**
   * A canvas element
   * @type {HTMLCanvasElement}
   */
  canvas;

  /**
   * The canvas context
   * @type {CanvasRenderingContext2D}
   */
  ctx;

  /**
   * The confetti currently on the screen
   * @type {Confetti[]}
   */
  confetti = [];

  /**
   * @type {number}
   */
  prevTime;

  /**
   * @type {number}
   */
  currentTime;

  updateSizes() {
    this.canvas.width = window.innerWidth;
    this.canvas.height = window.innerHeight;
  }

  /**
   * @param {HTMLElement} target
   */
  makeCanvas(target) {
    const canvas = document.createElement("canvas");
    canvas.id = "confetti";
    canvas.style.pointerEvents = "none";
    canvas.style.zIndex = "999";
    canvas.style.position = "fixed";
    canvas.style.top = "0";
    canvas.style.left = "0";
    document.body.addEventListener("resize", () => this.updateSizes());
    console.log(target);
    target.appendChild(canvas);
    this.canvas = canvas;
    this.updateSizes();
    this.ctx = canvas.getContext("2d");
  }

  /**
   * @param {HTMLElement} target
   */
  constructor(target) {
    this.makeCanvas(target);
    requestAnimationFrame(() => {
      this.frame();
    });
  }

  frame() {
    this.currentTime = performance.now();
    // delta time in seconds
    const dt = (this.currentTime - this.prevTime) / 1000;
    this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
    for (let i = this.confetti.length - 1; i >= 0; i--) {
      // move all the confetti
      let c = this.confetti[i];
      // apply gravity
      c.velocity[1] += 200 * dt;
      const newPos = [
        c.position[0] + c.velocity[0] * dt,
        c.position[1] + c.velocity[1] * dt,
      ];
      this.confetti[i].position = newPos;
      this.confetti[i].timer += 1 * dt;

      c = this.confetti[i];
      if (c.position[1] > this.canvas.height) {
        this.confetti.splice(i, 1);
      }

      // draw the confetti
      // const opacity = Math.min(1, c.timer / 2);
      this.ctx.fillStyle = c.color;
      this.ctx.translate(c.position[0], c.position[1]);
      this.ctx.rotate(c.rotation);
      this.ctx.fillRect(0, 0, 20, 5);
      this.ctx.setTransform(1, 0, 0, 1, 0, 0);
    }
    this.prevTime = performance.now();
    requestAnimationFrame(() => {
      this.frame();
    });
  }

  /**
   * Makes some confetti at the position specified! :)
   * @param {[number, number]} at
   */
  makeConfetti(at) {
    const numConfetti = 100;
    let i = 0;
    let stopit = setInterval(() => {
      this.confetti.push(new Confetti(at));
      i += 1;
      if (i >= numConfetti) {
        clearInterval(stopit);
      }
    }, 5);
  }
}

window.ConfettiCannon = ConfettiCannon;
