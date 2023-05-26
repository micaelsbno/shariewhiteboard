'use strict';

(function () {
  var socket = io();
  var canvas = document.getElementsByClassName('whiteboard')[0];
  var context = canvas.getContext('2d');

  var current = { color: 'black', lineWidth: 2 };
  var userDrawing = false;
  var drawing = true;

  canvas.addEventListener('mousedown', onMouseDown, false);
  canvas.addEventListener('mouseup', onMouseUp, false);
  canvas.addEventListener('mouseout', onMouseUp, false);
  canvas.addEventListener('mousemove', throttle(onMouseMove, 10), false);

  //Touch support for mobile devices
  canvas.addEventListener('touchstart', onMouseDown, false);
  canvas.addEventListener('touchend', onMouseUp, false);
  canvas.addEventListener('touchcancel', onMouseUp, false);
  canvas.addEventListener('touchmove', throttle(onMouseMove, 10), false);

  // socket.on('drawing', onDrawingEvent);

  window.addEventListener('resize', onResize, false);
  onResize();

  function drawLine(x0, y0, x1, y1, color, lineWidth, emit) {
    context.beginPath();
    context.moveTo(x0, y0);
    context.lineTo(x1, y1);
    context.strokeStyle = color;
    context.lineWidth = lineWidth;
    context.stroke();
    context.closePath();

    if (!emit) {
      return;
    }
    var w = canvas.width;
    var h = canvas.height;

    socket.emit('drawing', {
      x0: x0 / w,
      y0: y0 / h,
      x1: x1 / w,
      y1: y1 / h,
      color: color,
      lineWidth: lineWidth,
      emit: false,
    });
  }

  function onMouseDown(e) {
    userDrawing = true;
    current.x = e.clientX || e.touches[0].clientX;
    current.y = e.clientY || e.touches[0].clientY;
  }

  function onMouseUp(e) {
    if (!userDrawing || !drawing) {
      return;
    }
    userDrawing = false;
    drawLine(
      current.x,
      current.y,
      e.clientX || e.touches[0].clientX,
      e.clientY || e.touches[0].clientY,
      current.color,
      current.lineWidth,
      true
    );
  }

  function onMouseMove(e) {
    e.preventDefault();
    if (!userDrawing || !drawing) {
      return;
    }
    drawLine(
      current.x,
      current.y,
      e.clientX || e.touches[0].clientX,
      e.clientY || e.touches[0].clientY,
      current.color,
      current.lineWidth,
      true
    );
    current.x = e.clientX || e.touches[0].clientX;
    current.y = e.clientY || e.touches[0].clientY;
  }

  // stroke width
  const slider = document.querySelector('#stroke-width');
  slider.addEventListener('change', function (e) {
    const newWidth = e.target.value;
    current.lineWidth = newWidth;
    context.lineWidth = newWidth;
  });

  // color picker
  const picker = new CP(document.querySelector('#colorpicker'));
  picker.on('change', function (r, g, b, a) {
    const newColor = this.color(r, g, b, a);
    this.source.value = newColor;
    document.querySelector('#colorpicker').style = `background: ${newColor}`;
    current.color = newColor;
    slider.style.setProperty('--pseudo-color', newColor);
  });

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
      data.color,
      data.lineWidth
    );
  }

  socket.on('clear', () => clearCanvas());
  function clearCanvas() {
    context.clearRect(0, 0, canvas.width, canvas.height);
  }
  socket.on('toggleDrawing', () => {
    drawing = !drawing;
    canvas.classList.toggle('hidden');
  });

  // make the canvas fill its parent
  function onResize() {
    canvas.width = window.innerWidth;
    canvas.height = window.innerHeight;
  }
  socket.on('state', (data) => {
    drawing = data.drawing;
  });
})();
