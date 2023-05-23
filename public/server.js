'use strict';
(function() {
  var socket = io();
//   var canvas = document.getElementsByClassName('whiteboard')[0];

//   var context = canvas.getContext('2d');
    var context;
    var currentCanvas;

    var current = { color: 'black' };
    var user = { color: 'black', lineWidth: 2 }
    var drawing = false;

    function addEventListenersToCanvas(canvas) {
        canvas.addEventListener('mousedown', onMouseDown, false);
        canvas.addEventListener('mouseup', onMouseUp, false);
        canvas.addEventListener('mouseout', onMouseUp, false);
        canvas.addEventListener('mousemove', throttle(onMouseMove, 10), false);
        
        //Touch support for mobile devices
        canvas.addEventListener('touchstart', onMouseDown, false);
        canvas.addEventListener('touchend', onMouseUp, false);
        canvas.addEventListener('touchcancel', onMouseUp, false);
        canvas.addEventListener('touchmove', throttle(onMouseMove, 10), false);
    }

  socket.on('drawing', onDrawingEvent);

  window.addEventListener('resize', onResize, false);
  onResize();


  function drawLine(x0, y0, x1, y1, color, emit){
    context.beginPath();
    context.moveTo(x0, y0);
    context.lineTo(x1, y1);
    context.strokeStyle = color;
    context.lineWidth = user.lineWidth;
    context.stroke();
    context.closePath();

    if (!emit) { return; }
    var w = currentCanvas.width;
    var h = currentCanvas.height;

    socket.emit('drawing', {
      x0: x0 / w,
      y0: y0 / h,
      x1: x1 / w,
      y1: y1 / h,
      color: color
    });
  }

  function onMouseDown(e) {
    drawing = true;
    current.x = e.clientX||e.touches[0].clientX;
    current.y = e.clientY||e.touches[0].clientY;
  }

  function onMouseUp(e) {
    if (!drawing) { return; }
    drawing = false;
    drawLine(current.x, current.y, e.clientX||e.touches[0].clientX, e.clientY||e.touches[0].clientY, current.color, true);
  }

  function onMouseMove(e){
    if (!drawing) { return; }
    drawLine(current.x, current.y, e.clientX||e.touches[0].clientX, e.clientY||e.touches[0].clientY, current.color, true);
    current.x = e.clientX||e.touches[0].clientX;
    current.y = e.clientY||e.touches[0].clientY;
  }

  // Color setters
  var colors = document.getElementsByClassName('color');
  for (let color of colors)
    color.addEventListener('click', onColorUpdate, false);
  function onColorUpdate(e){
    current.color = e.target.className.split(' ')[1];
  }
  var userColors = document.getElementsByClassName('user-color');
  for (let color of userColors) {
    color.addEventListener('click', onUserColorUpdate)
  }
  function onUserColorUpdate(e) {
    user.color = e.target.className.split(' ')[1]
  }

  // limit the number of events per second
  function throttle(callback, delay) {
    var previousCall = new Date().getTime();
    return function() {
      var time = new Date().getTime();

      if ((time - previousCall) >= delay) {
        previousCall = time;
        callback.apply(null, arguments);
      }
    };
  }

  function onDrawingEvent(data){
    var w = currentCanvas.width;
    var h = currentCanvas.height;
    drawLine(data.x0 * w, data.y0 * h, data.x1 * w, data.y1 * h, user.color || data.color);
  }

  // make the canvas fill its parent
  function onResize() {
    var canvases = document.querySelectorAll('.whiteboard')
    for (let canvas of canvases) {
        canvas.width = window.innerWidth;
        canvas.height = window.innerHeight;   
    }
  }

  // Frame controls
  var whiteboards = []
  var newFrameButton = document.querySelector('#new-frame')
  newFrameButton.addEventListener('click', () => {
    var newCanvas = document.createElement('canvas');
    newCanvas.className = 'whiteboard'
    var allCanvas = document.getElementsByClassName('whiteboard');
    newCanvas.id = `board-${allCanvas.length + 1}`
    document.querySelector('#main').appendChild(newCanvas);
    context = newCanvas.getContext('2d')
    whiteboards.push(newCanvas)
    addEventListenersToCanvas(newCanvas)
    hideAllCanvasBut(newCanvas.id);

    // add new canvas button
    var canvases = document.querySelector('.canvases')
    var button = document.createElement('button')
    button.innerHTML = `${newCanvas.id}`
    button.id = `canvas-refresh-${newCanvas.id}`
    canvases.appendChild(button)

    document.querySelector(`#${button.id}`).addEventListener('click', (e) => hideAllCanvasBut(newCanvas.id))
    // button.addEventListener('click', (e) => hideAllCanvasBut(newCanvas.id))
  })

  function hideAllCanvasBut(canvasId) {
    for (let whiteboard of whiteboards) {
        console.log(whiteboard, whiteboard.id.includes(canvasId))
        if (!whiteboard.id.includes(canvasId))
            whiteboard.className = `${whiteboard.className} hidden`
        else  {
            whiteboard.style = whiteboard.className
                .split(' ')
                .filter(n => n !== 'hidden')
                .join(' ');
            currentCanvas = whiteboard
            onResize()
        }
    }
  }
})();
