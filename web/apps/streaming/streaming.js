/*global $, document, window, console*/

$(document).ready(function () {
  "use strict";

  var ws, websocketurl = 'ws://' + window.location.host + '/ws';
  var baseurl = 'http://' + window.location.host;
  var streamstarturl = baseurl + '/services/streaming/start';
  var streamstopurl = baseurl + '/services/streaming/stop';
  var registeredHandlers = {};
  var recieveCount = 0;

  var startText = '<h1>Start Streaming<h1>';
  var stopText = '<h1>Stop Streaming</h1>';
  var streaming = false;



  var ctx = $('#cvs')[0].getContext('2d');

  if (window.WebSocket) {
    ws = new window.WebSocket(websocketurl);
  } else if (window.MozWebSocket) {
    ws = window.MozWebSocket(websocketurl);
  } else {
    var msg = 'WebSocket Not Supported';
    console.log(msg);
    output(msg);
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
      if(msg == 'done') {
	output("Stopping streaming threads");
	$.get(streamstopurl, function(response) {
	  output(response);
	  $('#button').html(startText);
	  $('#button').fadeIn();
	  streaming = false;
	  registeredHandlers = {};
	});
      } else {
	var msgObj = JSON.parse(msg);
	var img = new Image();
	img.src = "data:image/png;base64," + msgObj['img'];
	img.onload = function() {
          ctx.drawImage(img, parseInt(msgObj['x']), parseInt(msgObj['y'])-img.height);
	};
	recieveCount += 1;
      }
    } else if (handler == 'register') {
      registeredHandlers[msg] = true;
      output('Websocket handler registered: ' + msg);

      if(registeredHandlers.hasOwnProperty('streammaster')) {
	if(registeredHandlers.hasOwnProperty('streamworker')) {
	  //start streaming process
	  var args = [$("#file").val(),$("#var").val(),recieveCount];
	  var startFunc = {func:'start',args:args,kwargs:{}};
	  ws.send('streammaster,' + JSON.stringify(startFunc));
	  $('#button').fadeIn();
	  $('#button').html(stopText);
	  streaming = true;
	}
      }
    }
  };

  ws.onopen = function () {
    output('Connected to server');
  };

  ws.onclose = function (evt) {
    output(['Connection closed by server: ',
                       evt.code, ' \"', evt.reason, '\"\n'
		      ].join(''));
  };

  $('#button').click(function () {

    var stopFunc = {func:'stop',args:[],kwargs:{}};

    if(!streaming) {
      output("Starting streaming threads");
      $.get(streamstarturl, function(response) {
	output(response);
      });
      $(this).hide();
    } else {
      ws.send('streammaster,' + JSON.stringify(stopFunc));
      $(this).hide();
    }
  }).hover(function() {
    $(this).css({background:'yellow'});
  },function() {
    $(this).css({background:'blue'});
  }).css({background:'blue',cursor:'pointer',width:'200px'});


  //initialize the files
  $.ajax({
    url: ['http://',window.location.host,'/services/ls/nc'].join(''),
    success: function(data) {
      var response = JSON.parse(data);
      var files = response['result'];
      $('#file').children('option').remove();
      for(var i = 0 ; i < files.length; i++) {
	var $newOption = $(document.createElement('option'));
	$newOption.attr('value',files[i]['path']);
	$newOption.html(files[i]['name']);
	$('#file').append($newOption);
      }
      fileChanged();
    },
    error: function() {
      output("Failed to fetch file list");
    }
  });

  $('#file').change(fileChanged);

  //initialize workers

});

function fileChanged() {
  var filePath = $('#file').val();
  if(!(cdmsVarCache.hasOwnProperty(filePath))) {
    $.ajax({
      url: ['http://',window.location.host,'/services/cdms/getVars?filepath=',filePath].join(''),
      success: function(data) {
	var response = JSON.parse(data);
	var vars = response['result']
	cdmsVarCache[filePath] = vars;
	setVars(vars);
      },
      error: function() {
	output("Failed to fetch var list");
      }
    });
  } else {
    setVars(cdmsVarCache[filePath])
  }
};

function setVars(cdmsVars) {
  $('#var').children('option').remove();
  for(var i = 0 ; i < cdmsVars.length; i++) {
    var $newOption = $(document.createElement('option'));
    $newOption.html(cdmsVars[i]);
    $newOption.attr('value',cdmsVars[i]['id']);
    $newOption.html(cdmsVars[i]['label']);
    $('#var').append($newOption);
  }
}

var cdmsVarCache = {};

function output(msg) {
  $('#output').append('<br />'+msg);
}
