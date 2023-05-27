"use strict";
(function () {
  const query = { clientType: "server", script: "main" };
  var socket = io("", { query });
  var canvas = document.getElementsByClassName("whiteboard")[0];
  var context = canvas.getContext("2d");
  function $(selector) {
    return document.querySelector(selector);
  }

  var current = { color: "black", lineWidth: 2 };
  var user = { color: null, lineWidth: null };
  var drawing = false;

  // function addEventListenersToCanvas(canvas) {
  canvas.addEventListener("mousedown", onMouseDown, false);
  canvas.addEventListener("mouseup", onMouseUp, false);
  canvas.addEventListener("mouseout", onMouseUp, false);
  canvas.addEventListener("mousemove", throttle(onMouseMove, 10), false);

  //Touch support for mobile devices
  canvas.addEventListener("touchstart", onMouseDown, false);
  canvas.addEventListener("touchend", onMouseUp, false);
  canvas.addEventListener("touchcancel", onMouseUp, false);
  canvas.addEventListener("touchmove", throttle(onMouseMove, 10), false);
  // }

  // socket.on('drawing', onDrawingEvent);

  window.addEventListener("resize", onResize, false);
  onResize();

  function drawLine(x0, y0, x1, y1, color, emit) {
    context.beginPath();
    context.moveTo(x0, y0);
    context.lineTo(x1, y1);
    context.strokeStyle = color;
    context.lineWidth = user.lineWidth;
    context.stroke();
    context.closePath();

    if (!emit) {
      return;
    }
    var w = canvas.width;
    var h = canvas.height;

    socket.emit("drawing", {
      x0: x0 / w,
      y0: y0 / h,
      x1: x1 / w,
      y1: y1 / h,
      color: color,
      admin: true,
    });
  }

  function onMouseDown(e) {
    drawing = true;
    current.x = e.clientX || e.touches[0].clientX;
    current.y = e.clientY || e.touches[0].clientY;
  }

  function onMouseUp(e) {
    if (!drawing) {
      return;
    }
    drawing = false;
    drawLine(
      current.x,
      current.y,
      e.clientX || e.touches[0].clientX,
      e.clientY || e.touches[0].clientY,
      current.color,
      true
    );
  }

  function onMouseMove(e) {
    if (!drawing) {
      return;
    }
    drawLine(
      current.x,
      current.y,
      e.clientX || e.touches[0].clientX,
      e.clientY || e.touches[0].clientY,
      current.color,
      true
    );
    current.x = e.clientX || e.touches[0].clientX;
    current.y = e.clientY || e.touches[0].clientY;
  }

  // Controls

  // color setters
  var adminColors = document.getElementsByClassName("admin-color");
  for (let color of adminColors) color.addEventListener("click", onColorUpdate);
  function onColorUpdate(e) {
    current.color = e.target.className.split(" ")[1];
    socket.emit("changeAdminColor", current.color);
  }

  // line width setter
  var strokeServer = document.getElementById("stroke-server-button");
  strokeServer.addEventListener("click", onStrokeServerUpdate);
  function onStrokeServerUpdate(e) {
    current.lineWidth = $("#stroke-server").value;
    socket.emit("changeLineWidth", {
      lineWidth: current.lineWidth,
      admin: true,
    });
  }
  var strokeUser = document.getElementById("stroke-user-button");
  strokeUser.addEventListener("click", onStrokeUserUpdate);
  function onStrokeUserUpdate(e) {
    user.lineWidth = $("#stroke-user").value;
    socket.emit("changeLineWidth", { lineWidth: user.lineWidth, admin: false });
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
    var w = canvas.width;
    var h = canvas.height;
    drawLine(
      data.x0 * w,
      data.y0 * h,
      data.x1 * w,
      data.y1 * h,
      user.color || data.color
    );
  }

  // make the canvas fill its parent
  function onResize() {
    canvas.width = window.innerWidth;
    canvas.height = window.innerHeight;
  }

  // Frame controls
  var savedDrawings = [];
  var saveButton = $("#new-frame");
  saveButton.addEventListener("click", () => {
    // Save current drawing to an object
    var dataURL = canvas.toDataURL();
    savedDrawings.push(dataURL);

    // add new canvas button
    var drawingNumber = savedDrawings.length;
    var button = document.createElement("button");
    button.innerHTML = `${drawingNumber}`;
    button.id = `canvas-refresh-${drawingNumber}`;
    button.addEventListener("click", (e) => {
      e.preventDefault();
      loadCanvas(drawingNumber);
    });
    $(".user-colors").appendChild(button);
    socket.emit("save");
  });

  function loadCanvas(number) {
    var img = new Image();
    img.onload = () => context.drawImage(img, 0, 0);
    img.src = savedDrawings[number - 1];
    socket.emit("loadCanvas", number);
  }

  $("#clear").addEventListener("click", clearCanvas);
  function clearCanvas() {
    context.clearRect(0, 0, canvas.width, canvas.height);
    socket.emit("clear");
  }

  // trails
  // var record = $('#record');
  // record.addEventListener('click', () => {
  //   const recordTime = $('#record-time').value;
  //   socket.emit('startRecording', recordTime);
  // });
  // var play = $('#play');
  // play.addEventListener('click', () => {
  //   socket.emit('playRecording');
  // });

  // animations
  var stop = $("#toggle-trails");
  stop.addEventListener("click", () => socket.emit("toggleTrails"));
  var rotate = $("#toggle-rotate");
  rotate.addEventListener("click", () => socket.emit("toggleRotate"));
  var zoom = $("#toggle-zoom");
  zoom.addEventListener("click", () => socket.emit("toggleZoom"));
  const animationSpeed = $("#animation-speed");
  animationSpeed.addEventListener("change", () =>
    socket.emit("changeAnimationSpeed", animationSpeed.value)
  );
  const eraser = $("#eraser");
  eraser.addEventListener("click", () => {
    const eraserSpeed = $("#eraser-speed").value;
    socket.emit("toggleEraser", eraserSpeed);
  });

  var toggleDrawing = $("#toggle-drawing");
  toggleDrawing.addEventListener("click", () => socket.emit("toggleDrawing"));
})();
