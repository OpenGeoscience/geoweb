/*global $, document, window, console*/

$(document).ready(function () {
  "use strict";

  var ws, websocketurl = 'ws://' + window.location.host + '/ws';

  var ctx = $('#cvs')[0].getContext('2d');

  if (window.WebSocket) {
    ws = new window.WebSocket(websocketurl);
  } else if (window.MozWebSocket) {
    ws = window.MozWebSocket(websocketurl);
  } else {
    var msg = 'WebSocket Not Supported';
    console.log(msg);
    $('#status').html(msg);
    return;
  }

  window.onbeforeunload = function (e) {
    ws.close(1000, 'Window closed');

    if (!e) {
      e = window.event;
    }
    e.stopPropagation();
    e.preventDefault();
  };

  ws.onmessage = function (evt) {
    var handler_msg = evt.data.split(',');
    var handler = handler_msg.shift();
    var msg = handler_msg.join(',');
    if (handler == 'streammaster') {
      var msgObj = JSON.parse(msg);
      var img = new Image();
      img.src = "data:image/png;base64," + msgObj['data'];
      img.onload = function() {
        ctx.drawImage(img, parseInt(msgObj['x']), parseInt(msgObj['y'])-img.height);
      };
    }
  };

  ws.onopen = function () {
    $('#status').html('Connected to server');
  };

  ws.onclose = function (evt) {
    $('#status').html(['Connection closed by server: ',
                       evt.code, ' \"', evt.reason, '\"\n'
		      ].join(''));
  };

  var streaming = false;

  $('#button').click(function () {
    var startText = '<h1>Start Streaming<h1>';
    var stopText = '<h1>Stop Streaming</h1>';

    var startFunc = {func:'start',args:[],kwargs:{}};
    var stopFunc = {func:'stop',args:[],kwargs:{}};

    if(!streaming) {
      ws.send('streammaster,' + JSON.stringify(startFunc));
      $(this).html(stopText);
      streaming = true;
    } else {
      ws.send('streammaster,' + JSON.stringify(stopFunc));
      $(this).html(startText);
      streaming = false;
    }

    $(this).fadeOut().fadeIn();
  });

  //initialize the websocket worker
  $.ajax({
    url: ['http://',window.location.host,'/services/streaming/start'].join(''),
    success: function(result) {
      $('#status').html([
	"WebSocket streaming worker started",
	result, "Send anythong to start the process"].join(' - '));
    },
    error: function() {
      $('#status').html("Failed to start the streaming websocket worker");
    }
  });

});
