/*global $, document, window, console*/

// Disable console log
// console.log = function() {}

/**
 * Main program
 */
function main() {
  "use strict";

  var ws = ogs.srv.webSocket({}),
  baseurl = 'http://' + window.location.host,
  registeredHandlers = {},
  recieveCount = 0,

  startText = '<h1>Start Streaming<h1>',
  stopText = '<h1>Stop Streaming</h1>',
  streaming = false,

  ctx = $('#cvs')[0].getContext('2d');

  ws.bind('StreamMaster', function(message) {
    if(message == 'done') {
      output("Stopping streaming threads");
      $.get(streamstopurl, function(response) {
	output(response);
	$('#button').html(startText);
	$('#button').fadeIn();
	streaming = false;
	registeredHandlers = {};
      });
    } else {
      var img = new Image();
      img.onload = function() {
        ctx.drawImage(img, parseInt(message.x), parseInt(message.y)-img.height);
      };
      img.src = "data:image/png;base64," + message.img;
      recieveCount += 1;
    }
  });

  ws.bind('nodemanager', function(message) {
    registeredHandlers[message.node] = message.running;

    if(registeredHandlers.hasOwnProperty('streammaster')) {
      if(registeredHandlers.hasOwnProperty('streamworker')) {
	//start streaming process
	ws.signal('StreamMaster', 'start',
		  [$("#file").val(), $("#var").val(), recieveCount]);
	$('#button').fadeIn();
	$('#button').html(stopText);
	streaming = true;
      }
    }
  });

  $('#button').click(function () {
    if(!streaming) {
      output("Starting streaming threads");
      ws.message('nodemanager',['start','streammaster']);
      ws.message('nodemanager',['start','streamworker']);
      $(this).hide();
    } else {
      ws.signal('StreamMaster','stop');
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
