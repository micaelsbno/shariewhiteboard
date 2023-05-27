"use strict";
(function () {
  const query = { clientType: "visualiser", script: "trails" };
  var socket = io("", { query });
  const trails = {};
  const total = 50;
  const pointer = {
    x: window.innerWidth / 2,
    y: window.innerHeight / 2,
  };

  const ease = 0.75;
  const pointers = {};
  let currentSocketId = null;

  const svgns = "http://www.w3.org/2000/svg";
  const root = document.querySelector("svg");

  const generateTrails = (id) => {
    const lines = [];
    for (let i = 0; i < total; i++) {
      const line = document.createElementNS(svgns, "line");
      line.setAttributeNS(null, "stroke", "white");
      line.setAttributeNS(null, "stroke-width", 20);
      line.setAttribute("id", `${id}:${i}`);
      root.appendChild(line);

      const alpha = (total - i) / total;
      line.setAttributeNS(null, "opacity", alpha);

      lines.push({
        line,
        pos: { x: -15, y: -15 },
      });
      trails[id] = lines;
      pointers[id] = {
        x: window.innerWidth / 2,
        y: window.innerHeight / 2,
      };
    }
  };

  socket.on("connect", () => {
    currentSocketId = socket.id;
    socket.on("draw_start", (data) => {
      const { x, y } = data;
      const color = data[3];
      path = new paper.Path();
      path.strokeColor = color;
      path.add(new paper.Point(x, y));
    });

    socket.on("draw", (data) => {
      if (!pointers[data.id]) return;
      pointers[data.id].x = data.x;
      pointers[data.id].y = data.y;
    });

    socket.on("draw_end", (id) => {
      trails[id].forEach((trail) => {
        trail.disabled = true;
        trail.line.setAttributeNS(null, "opacity", 0);
        trail.line.classList.toggle("hide");
      });
    });

    socket.on("new_client", (data) => {
      for (let clientId of data) {
        if (!pointers[clientId]) generateTrails(clientId);
      }
    });

    window.addEventListener("mousemove", (event) => {
      socket.emit("draw", {
        x: event.clientX,
        y: event.clientY,
        id: socket.id,
      });
    });

    window.addEventListener("touchmove", (event) => {
      socket.emit("draw", {
        x: event.touches[0].clientX,
        y: event.touches[0].clientY,
        id: socket.id,
      });
    });
    animateLines(trails);
  });
  let recordingData = {};
  let recording = false;
  let stop = false;

  function animateLines(trailsRepo) {
    Object.keys(trailsRepo).forEach((trailKey) =>
      trailsRepo[trailKey].forEach((currentLine, i) => {
        const leader =
          i === 0 ? pointers[trailKey] : trailsRepo[trailKey][i - 1].pos;

        const { line, pos } = currentLine;

        const x = pos.x + (leader.x - pos.x) * ease;
        const y = pos.y + (leader.y - pos.y) * ease;

        line.setAttributeNS(null, "x1", pos.x);
        line.setAttributeNS(null, "y1", pos.y);
        line.setAttributeNS(null, "x2", x);
        line.setAttributeNS(null, "y2", y);

        currentLine.pos = { x, y };
        if (recording && !stop) {
          if (!recordingData[`${trailKey}-rec`]) {
            recordingData[`${trailKey}-rec`] = [];
          }
          recordingData[`${trailKey}-rec`].push({
            line,
            id: trailKey,
            pos: { x, y },
          });
        }
      })
    );

    setTimeout(() => requestAnimationFrame(() => animateLines(trailsRepo)), 20);
  }

  // starts here

  let recordingTimeoutId;

  socket.on("startRecording", (seconds) => startRecording(seconds));
  function startRecording(seconds) {
    recordingData = [];
    recording = true;
    recordingTimeoutId = setTimeout(toggleTrails, seconds * 1000);
  }

  socket.on("state", (data) => {
    if (data.trails) {
      document.querySelector("svg").classList.contains("hide") &&
        toggleTrails();
    }
  });

  socket.on("toggleTrails", toggleTrails);
  function toggleTrails() {
    document.querySelector("svg").classList.toggle("hide");
    stop = !stop;
  }
  socket.on("playRecording", (data) => {
    log = true;
    playRecording(recordingData);
  });

  function playRecording(data) {
    const recordedTrails = Object.keys(recordingData);
    recordedTrails.forEach((trail) => generateTrails(trail));
    animateLines(recordingData, true);
  }
})();
