/*global $, document, window, console*/

$(document).ready(function () {
  "use strict";

  var ws, websocketurl = 'ws://' + window.location.host + '/ws';

  if (window.WebSocket) {
    ws = new window.WebSocket(websocketurl);
  } else if (window.MozWebSocket) {
    ws = window.MozWebSocket(websocketurl);
  } else {
    console.log('WebSocket Not Supported');
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
    $('#chat').val($('#chat').val() +'\n' + evt.data);
  };
  ws.onopen = function () {
    ws.onmessage({
      data: 'Connected to server'
    });
  };
  ws.onclose = function (evt) {
    $('#chat').val([$('#chat').val(),
                    'Connection closed by server: ',
                    evt.code, ' \"', evt.reason, '\"\n'
		   ].join(''));
  };

  $('#send').click(function () {
    var val = $('#message').val();
    ws.onmessage({
      data: 'Starting Process.'
    });
    ws.send(val);
    $('#message').val('');
    return false;
  });

  //initialize the websocket worker
  $.ajax({
    url: ['http://',window.location.host,'/services/streaming/start'].join(''),
    success: function(result) {
      ws.onmessage({data:"WebSocket streaming worker started"});
      ws.onmessage({data:result});
      ws.onmessage({data:"Send anythong to start the process"});
    },
    error: function() {
      ws.onmessage({data:"Failed to start the streaming websocket worker"});
    }
  });

});
