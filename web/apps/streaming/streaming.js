/*global $, document, window, console, ogs*/

// Disable console log
// console.log = function() {}

/**
 * Main program
 */
function main() {
  "use strict";

  var ws = ogs.srv.webSocket({nodes: ['streammaster','streamworker']}),
  baseurl = 'http://' + window.location.host,
  recieveCount = 0,

  startText = '<h1>Start Streaming<h1>',
  stopText = '<h1>Stop Streaming</h1>',
  streaming = false,

  ctx = $('#cvs')[0].getContext('2d');

  ws.bind('streammaster', function(message) {
    if(message == 'done') {
      streaming = false;
      $('#button').html(startText);
    } else {
      var img = new Image();
      img.onload = function() {
        ctx.drawImage(img, parseInt(message.x), parseInt(message.y)-img.height);
      };
      img.src = "data:image/png;base64," + message.img;
      recieveCount += 1;
    }
  });

  // ws.bind('nodemanager', function(message) {
  //   registeredHandlers[message.node] = message.running;

  //   if(registeredHandlers.hasOwnProperty('streammaster')) {
  //     if(registeredHandlers.hasOwnProperty('streamworker')) {
  // 	//start streaming process
  // 	ws.signal('streammaster', 'start',
  // 		  [$("#file").val(), $("#var").val(), recieveCount]);
  // 	$('#button').fadeIn();
  // 	$('#button').html(stopText);
  // 	streaming = true;
  //     }
  //   }
  // });

  $('#button').click(function () {
    if(!streaming) {
      output("Starting streaming threads");
      ws.signal('streammaster', 'start', [$('#file').val(), $('#var').val(), recieveCount]);
      streaming = true;
      $(this).html(stopText);
    } else {
      ws.signal('streammaster','stop');
      streaming = false;
      $(this).html(startText);
    }
  }).hover(function() {
    $(this).css({background:'yellow'});
  },function() {
    $(this).css({background:'blue'});
  }).css({background:'blue',cursor:'pointer',width:'200px'}).hide();

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

  $(ws).on('ready', function() {
    output('Nodes ready');
    $('#button').fadeIn();
  });

  $(ws).on('opened', function() {
    output('WebSocket connection established, starting nodes');
    $('#button').fadeIn();
  });

  $(ws).on('closed', function() {
    output('WebSocket connection closed');
    $('#button').hide();
  });

} //end main function

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

$(document).ready(function () {
  main();
});
