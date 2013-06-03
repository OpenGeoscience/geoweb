var activeWorkflow,
  moduleTargetPortX = {},
  moduleSourcePortX = {},
  moduleTargetPortY = {},
  moduleSourcePortY = {},
  moduleRegistry = {},
  moduleInstances = {};

if (typeof Object.create !== 'function') {
  Object.create = function (o) {
    function F() {}
    F.prototype = o;
    return new F();
  };
}

function debug(text) {
  console.log(text);
}

$(function () {
  activeWorkflow = new WorkflowGUI(exworkflow);
  //activeWorkflow = new WorkflowGUI(newWorkflow());
	setupDragAndDrop();
	setupModuleList();

  function myResize() {
    var canvasContainer = $('#canvasContainer')[0],
      canvas =  $('#workspace')[0],
      rect = canvasContainer.getBoundingClientRect();
    canvas.width = rect.width - 20;
    canvas.height = rect.height - 20;
    activeWorkflow.draw();
  }

  $(window).on('resize', myResize);
  $(window).resize();

  setTimeout(myResize, 300);
});




function WorkflowGUI(data) {
  this.data = data;

  var i, nextId = nextModuleId();

  for(i = 0; i < this.data.workflow.module.length; i++) {
    var mid = parseInt(this.data.workflow.module[i]['@id']);
    moduleInstances[this.data.workflow.module[i]['@id']] = this.data.workflow.module[i];
    while (mid > nextId) {
      nextId = nextModuleId();
    }
  }
}

WorkflowGUI.prototype.draw = function() {
	var canvas = $('#workspace')[0],
    ctx,
    i;

  $(canvas).css({
    border: '1px solid black'
  });

  ctx = canvas.getContext('2d');

  ctx.save();


  ctx.fillStyle = style.fill;
  ctx.fillRect(0, 0, canvas.width, canvas.height);

  ctx.translate(Math.floor(canvas.width/2), Math.floor(canvas.height/2));

  for(i = 0; i < this.data.workflow.module.length; i++) {
    drawModule(ctx, this.data.workflow.module[i]);
  }

  for(i = 0; i < this.data.workflow.connection.length; i++) {
    drawConnection(ctx, this.data.workflow.connection[i]);
  }

  ctx.restore();
};

function drawModule(ctx, moduleObject) {
  var moduleInfo = moduleRegistry[moduleObject['@package']][moduleObject['@name']],
    inPortCount = 0,
    outPortCount = 0,
    portWidth = style.module.port.width,
    mx = Math.floor(parseFloat(moduleObject.location['@x'])),
    my = -Math.floor(parseFloat(moduleObject.location['@y'])),
    i;

  for(i = 0; i < moduleInfo.portSpec.length; i++) {
    if(moduleInfo.portSpec[i]['@type'] != 'output') {
      inPortCount += 1;
    } else {
      outPortCount += 1;
    }
  }

  var totalPortWidth = portWidth + style.module.port.pad,
    inPortsWidth = inPortCount * totalPortWidth + style.module.text.xpad,
    outPortsWidth = outPortCount * totalPortWidth,
    fontMetrics = ctx.measureText(moduleObject['@name']),
    textWidth = fontMetrics.width + style.module.text.xpad * 2,
    moduleWidth = Math.max(inPortsWidth, outPortsWidth+style.module.text.xpad,
      textWidth, style.module.minWidth),
    textHeight = 12, //TODO: get real height based on text font
    moduleHeight = style.module.port.pad*4 + portWidth*2 +
      style.module.text.ypad*2 + textHeight,
    inPortX = mx + style.module.port.pad,
    inPortY = my + style.module.port.pad,
    outPortX = mx + moduleWidth - outPortsWidth,
    outPortY = my + moduleHeight - style.module.port.pad - portWidth;

  //draw rectangle
  ctx.fillStyle = style.module.fill;
  ctx.strokeStyle = style.module.stroke;
  ctx.fillRect(mx, my, moduleWidth, moduleHeight);
  ctx.strokeRect(mx, my, moduleWidth, moduleHeight);

  //draw ports
  if(!moduleSourcePortX.hasOwnProperty(moduleObject['@id'])) {
    moduleSourcePortX[moduleObject['@id']] = {};
  }
  if(!moduleTargetPortX.hasOwnProperty(moduleObject['@id'])) {
    moduleTargetPortX[moduleObject['@id']] = {};
  }

  ctx.fillStyle = style.module.port.fill;
  ctx.strokeStyle = style.module.port.stroke;
  for(i = 0; i < moduleInfo.portSpec.length; i++) {
    if(moduleInfo.portSpec[i]['@type'] != 'output') {
      moduleTargetPortX[moduleObject['@id']][moduleInfo.portSpec[i]['@name']] = inPortX;
      ctx.fillRect(inPortX, inPortY, portWidth, portWidth);
      ctx.strokeRect(inPortX, inPortY, portWidth, portWidth);
      inPortX += portWidth + style.module.port.pad;
    } else {
      moduleSourcePortX[moduleObject['@id']][moduleInfo.portSpec[i]['@name']] = outPortX;
      ctx.fillRect(outPortX, outPortY, portWidth, portWidth);
      ctx.strokeRect(outPortX, outPortY, portWidth, portWidth);
      outPortX += portWidth + style.module.port.pad;
    }
  }
  moduleTargetPortY[moduleObject['@id']] =  inPortY;
  moduleSourcePortY[moduleObject['@id']] =  outPortY;

  //draw module name
  ctx.fillStyle = style.module.text.fill;
  ctx.font = style.module.text.font;
  ctx.fillText(moduleObject['@name'], mx + Math.floor((moduleWidth - fontMetrics.width)/2),
    my + style.module.port.pad*2 + portWidth + textHeight + style.module.text.ypad);
}

function drawConnection(ctx, connectionObject) {
  var posInfo = computeConnectionPositions(connectionObject);

  ctx.beginPath();
  ctx.moveTo(posInfo.cx1, posInfo.cy1);
  ctx.bezierCurveTo(posInfo.cx1, posInfo.cy1 + style.module.ypad,
    posInfo.cx2, posInfo.cy2 - style.module.ypad,
    posInfo.cx2, posInfo.cy2);
  ctx.lineWidth = style.conn.lineWidth;

  // line color
  ctx.strokeStyle = style.conn.stroke;
  ctx.stroke();
}

function computeConnectionPositions(connectionObject) {
  var sourceModule, targetModule, sourcePort, targetPort,
    centerOffset = Math.floor(style.module.port.width/2);
  for(var i = 0; i < connectionObject.port.length; i++) {
    var port = connectionObject.port[i];
    if(port['@type'] == 'source') {
      sourcePort = port;
      sourceModule = moduleInstances[port['@moduleId']];
    } else {
      targetPort = port;
      targetModule = moduleInstances[port['@moduleId']];
    }
  }

  return {
    cx1: moduleSourcePortX[sourceModule['@id']][sourcePort['@name']] + centerOffset,
    cy1: moduleSourcePortY[sourceModule['@id']] + centerOffset,
    cx2: moduleTargetPortX[targetModule['@id']][targetPort['@name']] + centerOffset,
    cy2: moduleTargetPortY[targetModule['@id']] + centerOffset
  };
}

function setupDragAndDrop() {
	var $canvas = $('#workspace');

	$canvas.on('dragover', function(e) {
    if (e.originalEvent) { //jQuery
      e = e.originalEvent;
    }

    if (e.preventDefault) {
      e.preventDefault();
    }

    e.dataTransfer.dropEffect = 'copy';
	});

	$canvas.on('drop', function(e) {
    if (e.originalEvent) { //jQuery
      e = e.originalEvent;
    }

		if (e.preventDefault) {
			e.preventDefault();
		}

		// this / e.target is current target element.

		if (e.stopPropagation) {
			e.stopPropagation(); // stops the browser from redirecting.
		}

		// See the section on the DataTransfer object.

    var rect = this.getBoundingClientRect(),
      offsetX = rect.left,
      offsetY = rect.top;

    try {
      newModule(activeWorkflow, e.dataTransfer.getData("Text"),
        e.clientX - offsetX - Math.floor(this.width/2),
        e.clientY - offsetY - Math.floor(this.height/2));
    } catch(e) {

    }

		return false;
	});
}

function newModule(workflow, moduleInfoJSON, x, y) {
  var moduleInfo = JSON.parse(moduleInfoJSON),
    module = {
      "@name": moduleInfo['@name'],
      "@package": moduleInfo['@package'],
      "@version": moduleInfo['@packageVersion'],
      "@namespace": moduleInfo['@namespace'],
      "@cache": "1",
      "location": {
        "@x": x,
        "@y": -y,
        "@id": nextLocationId()
      },
      "@id": nextModuleId()
    };

  moduleInstances[module['@id']] = module;
  workflow.data.workflow.module.push(module);
  workflow.draw();
}

function setupModuleList() {
	var $moduleTableBody = $('#moduletable > tbody:last');

  for(var i = 0; i < reg.registry.package.length; i++) {
    var pkg = reg.registry.package[i];
    if(!moduleRegistry.hasOwnProperty(pkg['@identifier'])) {
      moduleRegistry[pkg['@identifier']] = {};
    }
    if(!pkg.hasOwnProperty('moduleDescriptor')) {
      continue;
    }
    for(var j = 0; j < pkg.moduleDescriptor.length; j++) {
      var moduleInfo = pkg.moduleDescriptor[j];
      moduleRegistry[pkg['@identifier']][moduleInfo['@name']] = moduleInfo;
      addModuleToList(moduleInfo, $moduleTableBody);
    }
  }
}

function addModuleToList(moduleInfo, $moduleTableBody) {
  var $text = $(document.createElement('div'));
  $text.append(moduleInfo['@name'])
    .attr('draggable', 'true')
    .data('moduleInfo', moduleInfo)
    .on('dragstart', function(e) {
      if (e.originalEvent) { //jQuery
        e = e.originalEvent;
      }
      e.dataTransfer.effectAllowed = 'copy';
      e.dataTransfer.setData("Text", JSON.stringify($(this).data('moduleInfo')));

      debug(e);
    });

  var $td = $(document.createElement('td'));
  var $tr = $(document.createElement('tr'));
  $moduleTableBody.append($tr.append($td.append($text)));
}

function defVal(param, defaultValue) {
  return typeof param !== 'undefined' ? param: defaultValue;
}

function createIdCounter(initialId) {
  initialId = defVal(initialId, -1);
  return function() { initialId += 1; return initialId; };
}

var nextWorkflowId = createIdCounter();
var nextModuleId = createIdCounter();
var nextLocationId = createIdCounter();
var nextConnectionId = createIdCounter();

function newWorkflow(name, version, connections, modules, vistrail_id, id) {
  name = defVal(name, 'untitled');
  version = defVal(version, '1.0.2');
  connections = defVal(connections, []);
  modules = defVal(modules, []);
  vistrail_id = defVal(vistrail_id, "");
  id = defVal(id, nextWorkflowId());
  return {
    "workflow": {
      "@name": name,
      "@version": version,
      "@{http://www.w3.org/2001/XMLSchema-instance}schemaLocation": "http://www.vistrails.org/workflow.xsd",
      "connection": connections,
      "module": modules,
      "@vistrail_id": vistrail_id,
      "@id": id
    }
  };
}
