'use strict';

(function () {
  var socket = io();
  var canvas = document.getElementsByClassName('whiteboard')[0];
  var context = canvas.getContext('2d');

  var admin = { color: 'black', lineWidth: 2 };
  var user = { color: null, lineWidth: null };
  var drawing = false;

  socket.on('drawing', onDrawingEvent);

  window.addEventListener('resize', onResize, false);
  onResize();

  function drawLine(x0, y0, x1, y1, color, lineWidth, emit) {
    context.beginPath();
    context.moveTo(x0, y0);
    context.lineTo(x1, y1);
    context.strokeStyle = color;
    context.lineWidth = lineWidth;
    context.lineCap = 'round';
    context.stroke();
    context.closePath();
  }

  function onMouseDown(e) {
    drawing = true;
    admin.x = e.clientX || e.touches[0].clientX;
    admin.y = e.clientY || e.touches[0].clientY;
  }

  // Color setters
  var colors = document.getElementsByClassName('color');
  for (let color of colors)
    color.addEventListener('click', onColorUpdate, false);
  function onColorUpdate(e) {
    admin.color = e.target.className.split(' ')[1];
  }
  var userColors = document.getElementsByClassName('user-color');
  for (let color of userColors) {
    color.addEventListener('click', onUserColorUpdate);
  }
  function onUserColorUpdate(e) {
    user.color = e.target.className.split(' ')[1];
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
    console.log(drawing);
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
  socket.on('save', () => saveCanvas());
  function saveCanvas() {
    var dataURL = canvas.toDataURL();
    savedDrawings.push(dataURL);
  }
  socket.on('loadCanvas', (number) => {
    loadCanvas(number);
  });
  function loadCanvas(number) {
    var img = new Image();
    img.onload = () => context.drawImage(img, 0, 0);
    img.src = savedDrawings[number - 1];
    socket.emit('loadCanvas', number);
  }
  socket.on('clear', () => clearCanvas());
  function clearCanvas() {
    context.clearRect(0, 0, canvas.width, canvas.height);
  }

  // server commands
  socket.on('changeUserColor', (color) => {
    console.log('changing user color', color);
    user.color = color;
  });
  socket.on('changeAdminColor', (color) => {
    console.log('changing admin color', color);
    admin.color = color;
  });
  socket.on('changeLineWidth', (data) => {
    if (data.admin) {
      admin.lineWidth = data.lineWidth;
    } else {
      user.lineWidth = data.lineWidth;
    }
  });

  // animations

  let animating;
  socket.on('state', (state) => {
    console.log(state);
    drawing = state.drawing;
  });

  socket.on('toggleAnimation', () => {
    const element = document.querySelector('canvas');
    if (!animating) {
      element.classList.add('party-div');
      animating = true;
    } else {
      element.classList.remove('party-div');
      animating = false;
    }
  });
  socket.on('toggleDrawing', () => {
    console.log('toggling drawing');
    drawing = !drawing;
    canvas.classList.toggle('hidden');
  });
})();
