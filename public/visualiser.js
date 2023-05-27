"use strict";

(function () {
  const query = { clientType: "visualiser", script: "drawing" };
  // socket.io.opts.query = customData;
  var socket = io("", { query });
  var canvas = document.getElementsByClassName("whiteboard")[0];
  var context = canvas.getContext("2d");

  var admin = { color: "black", lineWidth: 2 };
  var user = { color: null, lineWidth: null };
  var drawing = false;

  socket.on("drawing", onDrawingEvent);

  window.addEventListener("resize", onResize, false);
  onResize();

  function drawLine(x0, y0, x1, y1, color, lineWidth, emit) {
    context.beginPath();
    context.moveTo(x0, y0);
    context.lineTo(x1, y1);
    context.strokeStyle = color;
    context.lineWidth = lineWidth;
    context.lineCap = "round";
    context.stroke();
    context.closePath();
  }

  function onMouseDown(e) {
    drawing = true;
    admin.x = e.clientX || e.touches[0].clientX;
    admin.y = e.clientY || e.touches[0].clientY;
  }

  // Color setters
  var colors = document.getElementsByClassName("color");
  for (let color of colors)
    color.addEventListener("click", onColorUpdate, false);
  function onColorUpdate(e) {
    admin.color = e.target.className.split(" ")[1];
  }
  var userColors = document.getElementsByClassName("user-color");
  for (let color of userColors) {
    color.addEventListener("click", onUserColorUpdate);
  }
  function onUserColorUpdate(e) {
    user.color = e.target.className.split(" ")[1];
  }

  // limit the number of events per second
  function throttle(callback, delay) {
    var previousCall = new Date().getTime();
    return function () {
      var time = new Date().getTime();

      if (time - previousCall >= delay) {
        previousCall = time;
        callback.apply(null, arguments);
      }
    };
  }

  function onDrawingEvent(data) {
    if (!drawing) return;
    var w = canvas.width;
    var h = canvas.height;
    var color = user.color || data.color;
    var lineWidth = user.lineWidth || data.lineWidth;

    if (data.admin) {
      color = admin.color;
      lineWidth = admin.lineWidth;
    }
    drawLine(
      data.x0 * w,
      data.y0 * h,
      data.x1 * w,
      data.y1 * h,
      color,
      lineWidth,
      false
    );
  }

  // make the canvas fill its parent
  function onResize() {
    canvas.width = window.innerWidth;
    canvas.height = window.innerHeight;
  }

  // Frame controls
  var savedDrawings = [];
  socket.on("save", () => saveCanvas());
  function saveCanvas() {
    var dataURL = canvas.toDataURL();
    savedDrawings.push(dataURL);
  }

  socket.on("loadCanvas", (number) => {
    loadCanvas(number);
  });
  function loadCanvas(number) {
    var img = new Image();
    img.onload = () => context.drawImage(img, 0, 0);
    img.src = savedDrawings[number - 1];
    socket.emit("loadCanvas", number);
  }
  socket.on("clear", () => clearCanvas());
  function clearCanvas() {
    context.clearRect(0, 0, canvas.width, canvas.height);
  }

  // server commands
  socket.on("changeUserColor", (color) => {
    console.log("changing user color", color);
    user.color = color;
  });
  socket.on("changeAdminColor", (color) => {
    console.log("changing admin color", color);
    admin.color = color;
  });
  socket.on("changeLineWidth", (data) => {
    if (data.admin) {
      admin.lineWidth = data.lineWidth;
    } else {
      user.lineWidth = data.lineWidth;
    }
  });

  // animations

  let animating;
  let zoom;
  socket.on("state", (state) => {
    console.log(state);
    drawing = state.drawing;
    if (state.eraser.active) {
      toggleEraser();
    }
  });

  const animations = {
    rotate: {
      string: "partyAnimation 2s linear infinite",
      keyframes: {
        "0%": "rotate(0deg)",
        "50%": "rotate(180deg)",
        "100%": "rotate(360deg)",
      },
      active: false,
    },
    zoom: {
      string: "zoomAnimation 2s linear infinite",
      keyframes: {
        "0%": "scale(1)",
        "50%": "scale(1)",
        "100%": "scale(4)",
      },
      active: false,
    },
    skew: {
      string: "skewAnimation 2s linear infinite",
      keyframes: {
        "0%": "skew(0deg, 0deg)",
        "50%": "skew(150deg, 130deg)",
        "100%": "skew(355deg, 320deg)",
      },
      active: false,
    },
    matrix: {
      string: "matrixAnimation 2s linear infinite",
      keyframes: {
        "0%": "matrix(2, 2, 3, 4, 5, 6)",
        "50%": "matrix(1, 0, 0, 1, 0, 0)",
        "100%": "matrix(1, 0, 0, 1, 100, 100)",
      },
      active: false,
    },
    blur: {
      string: "blurAnimation 2s linear infinite",
      keyframes: {
        "0%": "blur(0px)",
        "50%": "blur(20px)",
        "100%": "blur(0px)",
      },
      getBlur: function (percentage) {
        return this.active ? this.keyframes[percentage] : "";
      },
      active: false,
    },
  };

  function getCurrentAnimationKeyframes() {
    let strings = {
      "0%": "",
      "50%": "",
      "100%": "",
    };

    const allAnimations = Object.keys(animations);
    allAnimations.forEach((animation, i) => {
      if (animations[animation].active) {
        Object.keys(animations[animation].keyframes).forEach((keyframe) => {
          strings[keyframe] = strings[keyframe]
            .concat(" ")
            .concat(animations[animation].keyframes[keyframe]);
        });
      }
    });

    return strings;
  }

  function toggleAnimation(anima) {
    animations[anima].active = !animations[anima].active;

    function findKeyframesRule(animationName) {
      const styleSheets = document.styleSheets;

      for (let i = 0; i < styleSheets.length; i++) {
        const styleSheet = styleSheets[i];

        for (let j = 0; j < styleSheet.cssRules.length; j++) {
          const rule = styleSheet.cssRules[j];

          if (
            rule.type === CSSRule.KEYFRAMES_RULE &&
            rule.name === animationName
          ) {
            return rule;
          }
        }
      }

      return null; // Keyframes rule not found
    }

    const keyframesRule = findKeyframesRule("defaultAnimation");
    keyframesRule?.deleteRule("0%");
    // keyframesRule?.deleteRule("25%");
    keyframesRule?.deleteRule("50%");
    // keyframesRule?.deleteRule("75%");
    keyframesRule?.deleteRule("100%");

    const newKeyframes = getCurrentAnimationKeyframes();

    keyframesRule.appendRule(
      `0% {transform: ${newKeyframes["0%"]} } ${animations.blur.getBlur("%0")}`
    );
    keyframesRule.appendRule(
      `50% {transform: ${newKeyframes["50%"]} } ${animations.blur.getBlur(
        "%50"
      )}`
    );
    keyframesRule.appendRule(
      `100% { transform: ${newKeyframes["100%"]} ${animations.blur.getBlur(
        "%100"
      )} }`
    );
  }

  // animations
  socket.on("toggleRotate", () => {
    console.log("toggling animation");
    toggleAnimation("rotate");
  });
  socket.on("toggleZoom", () => {
    toggleAnimation("zoom");
  });
  socket.on("toggleSkew", () => toggleAnimation("skew"));
  socket.on("toggleMatrix", () => toggleAnimation("matrix"));
  socket.on("toggleBlur", () => toggleAnimation("blur"));

  socket.on("changeAnimationSpeed", (speed) => {
    console.log("changing animation speed", speed);
    canvas.style.setProperty("animation-duration", `${speed / 10}s`);
  });

  let eraserInterval;
  function toggleEraser() {
    if (!eraserInterval) {
      eraserInterval = setInterval(clearCanvas, 1000);
    } else {
      clearInterval(eraserInterval);
      eraserInterval = null;
    }
  }
  socket.on("toggleEraser", (speed) => {
    toggleEraser();
  });

  socket.on("toggleDrawing", () => {
    console.log("toggling drawing");
    drawing = !drawing;
    canvas.classList.toggle("hidden");
  });
})();
