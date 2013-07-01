var activeWorkflow,
  moduleTargetPortX = {},
  moduleSourcePortX = {},
  moduleTargetPortY = {},
  moduleSourcePortY = {},
  moduleRegistry = {},
  moduleInstances = {},
  style = climatePipesStyle;

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

function resizeWorkflow() {
  var canvasContainer = $('#canvasContainer')[0],
    canvas =  $('#workspace')[0],
    rect = canvasContainer.getBoundingClientRect(),
    translated = myTranslated();
  canvas.width = rect.width - 20;
  canvas.height = rect.height - 20;
  canvas.getContext('2d').translate(translated.x, translated.y);
  activeWorkflow.draw();
}

$(function () {
  activeWorkflow = new WorkflowGUI(exworkflow);
  //activeWorkflow = new WorkflowGUI(newWorkflow());
  setupDragAndDrop();
  setupModuleList();
  setupInteraction();

  $(window).on('resize', resizeWorkflow);
  //$(window).resize();

  //setTimeout(resizeWorkflow, 300);


  var canvas = $('#workspace')[0];
  //myTranslate(canvas.getContext('2d'), Math.floor(canvas.width/2), Math.floor(canvas.height/2));
});

function WorkflowGUI(data) {
  this.data = data;

  var i, nextId = nextModuleId(), workflow = this.data.workflow;

  for(i = 0; i < workflow.module.length; i++) {
    var mid = parseInt(workflow.module[i]['@id']);
    moduleInstances[workflow.module[i]['@id']] = workflow.module[i];
    workflow.module[i].location['@x'] = parseFloat(workflow.module[i].location['@x']);
    workflow.module[i].location['@y'] = parseFloat(workflow.module[i].location['@y']);

    while (mid > nextId) {
      nextId = nextModuleId();
    }
  }
}

WorkflowGUI.prototype.draw = function() {
	var canvas = $('#workspace')[0],
    ctx,
    i,
    translated = myTranslated();

  $(canvas).css({
    border: '1px solid black'
  });

  ctx = canvas.getContext('2d');


  ctx.fillStyle = style.fill;
  ctx.fillRect(-translated.x, -translated.y, canvas.width, canvas.height);

  for(i = 0; i < this.data.workflow.module.length; i++) {
    drawModuleExpanded(ctx, this.data.workflow.module[i]);
  }

  for(i = 0; i < this.data.workflow.connection.length; i++) {
    drawConnectionExpanded(ctx, this.data.workflow.connection[i]);
  }

  ctx.restore();
};

function moduleMetrics(ctx, moduleObject) {
  var moduleInfo = moduleRegistry[moduleObject['@package']][moduleObject['@name']],
    inPortCount = 0,
    outPortCount = 0,
    portWidth = style.module.port.width,
    mx = Math.floor(moduleObject.location['@x']),
    my = -Math.floor(moduleObject.location['@y']),
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
      style.module.text.ypad*2 + textHeight;

  mx = mx - Math.floor(moduleWidth/2);

  return {
    mx: mx,
    my: my,
    totalPortWidth: totalPortWidth,
    inPortsWidth: inPortsWidth,
    fontMetrics: fontMetrics,
    textWidth: textWidth,
    moduleWidth: moduleWidth,
    textHeight: textHeight,
    moduleHeight: moduleHeight,
    inPortX: mx + style.module.port.pad,
    inPortY: my + style.module.port.pad,
    outPortX: mx + moduleWidth - outPortsWidth,
    outPortY: my + moduleHeight - style.module.port.pad - portWidth
  };

}

function expandedModuleMetrics(ctx, moduleObject) {
  var moduleInfo = moduleRegistry[moduleObject['@package']][moduleObject['@name']],
    inPortCount = 0,
    outPortCount = 0,
    maxInPortTextWidth = 0,
    maxOutPortTextWidth = 0,
    maxInPortTextIndex = 0,
    maxOutPortTextIndex = 0,
    portWidth = style.module.port.width,
    mx = Math.floor(moduleObject.location['@x']),
    my = -Math.floor(moduleObject.location['@y']),
    i;


  for(i = 0; i < moduleInfo.portSpec.length; i++) {
    if(moduleInfo.portSpec[i]['@type'] != 'output') {
      inPortCount += 1;
      if(moduleInfo.portSpec[i]['@name'].length > maxInPortTextWidth) {
        maxInPortTextWidth = moduleInfo.portSpec[i]['@name'].length;
        maxInPortTextIndex = i;
      }
    } else {
      outPortCount += 1;
      if(moduleInfo.portSpec[i]['@name'].length > maxOutPortTextWidth) {
        maxOutPortTextWidth = moduleInfo.portSpec[i]['@name'].length;
        maxOutPortTextIndex = i;
      }
    }
  }

  var textHeight = 12, //TODO: get real height based on text font
    totalInPortHeight = style.module.port.inputHeight + textHeight + style.module.port.inputYPad + style.module.port.inpad,
    totalOutPortHeight = textHeight + style.module.port.outpad,
    inPortsHeight = inPortCount * totalInPortHeight + style.module.text.xpad,
    outPortsHeight = outPortCount * totalOutPortHeight,
    titleFontMetrics = ctx.measureText(moduleObject['@name']),
    titleTextWidth = titleFontMetrics.width + style.module.text.xpad * 2,
    inPortFontMetrics = ctx.measureText(
      moduleInfo.portSpec[maxInPortTextIndex]['@name']),
    outPortFontMetrics = ctx.measureText(
      moduleInfo.portSpec[maxOutPortTextIndex]['@name']),
    inPortsWidth = Math.max(inPortFontMetrics.width, style.module.port.inputWidth),
    outPortsWidth = outPortFontMetrics.width,
    moduleWidth = Math.max(
      inPortsWidth + outPortsWidth + portWidth*2 + style.module.port.pad*6,
      titleTextWidth + style.module.text.xpad*2,
      style.module.minWidth
    ),
    moduleHeight = Math.max(
      inPortsHeight,
      outPortsHeight,
      style.module.minWidth
    ) + style.module.text.ypad*2 + textHeight;

  mx = mx - Math.floor(moduleWidth/2);

  return {
    mx: mx,
    my: my,
    fontMetrics: titleFontMetrics,
    textWidth: titleTextWidth,
    moduleWidth: moduleWidth,
    textHeight: textHeight,
    moduleHeight: moduleHeight,
    inPortX: mx + style.module.port.pad,
    inPortY: my + style.module.port.pad + textHeight + portWidth*2,
    outPortX: mx + moduleWidth - style.module.port.pad - portWidth,
    outPortY: my + moduleHeight - style.module.port.pad - portWidth,
    outPortTextX: mx + inPortsWidth + portWidth + style.module.port.pad*4
  };

}

function drawModuleExpanded(ctx, moduleObject) {
  var moduleInfo = moduleRegistry[moduleObject['@package']][moduleObject['@name']],
    portWidth = style.module.port.width,
    i,
    props = expandedModuleMetrics(ctx, moduleObject),
    mx = props.mx,
    my = props.my,
    inPortY = props.inPortY,
    outPortY = props.outPortY;

  //draw rectangle
  ctx.fillStyle = style.module.fill;
  ctx.strokeStyle = style.module.stroke;
  ctx.fillRect(mx, my, props.moduleWidth, props.moduleHeight);
  ctx.strokeRect(mx, my, props.moduleWidth, props.moduleHeight);

  //draw ports
  if(!moduleSourcePortY.hasOwnProperty(moduleObject['@id'])) {
    moduleSourcePortY[moduleObject['@id']] = {};
  }
  if(!moduleTargetPortY.hasOwnProperty(moduleObject['@id'])) {
    moduleTargetPortY[moduleObject['@id']] = {};
  }

  ctx.strokeStyle = style.module.port.stroke;
  ctx.font = style.module.port.font;
  for(i = 0; i < moduleInfo.portSpec.length; i++) {
    ctx.fillStyle = style.module.port.fill;
    if(moduleInfo.portSpec[i]['@type'] != 'output') {
      moduleTargetPortY[moduleObject['@id']][moduleInfo.portSpec[i]['@name']] = inPortY;
      ctx.fillRect(props.inPortX, inPortY, portWidth, portWidth);
      ctx.strokeRect(props.inPortX, inPortY, portWidth, portWidth);
      ctx.fillStyle = style.module.text.fill;
      ctx.fillText(moduleInfo.portSpec[i]['@name'], props.inPortX + portWidth*2, inPortY);
      ctx.fillStyle = 'white';
      ctx.fillRect(
        props.inPortX + portWidth*2,
        inPortY + style.module.port.inputYPad,
        style.module.port.inputWidth,
        style.module.port.inputHeight
      );
      inPortY += style.module.port.inputHeight + props.textHeight + style.module.port.inputYPad + style.module.port.inpad;
    } else {
      moduleSourcePortY[moduleObject['@id']][moduleInfo.portSpec[i]['@name']] = outPortY;
      ctx.fillRect(props.outPortX, outPortY, portWidth, portWidth);
      ctx.strokeRect(props.outPortX, outPortY, portWidth, portWidth);
      ctx.fillStyle = style.module.text.fill;
      ctx.fillText(moduleInfo.portSpec[i]['@name'], props.outPortTextX, outPortY);
      outPortY += props.textHeight + style.module.port.outpad;
    }
  }
  moduleTargetPortX[moduleObject['@id']] = props.inPortX;
  moduleSourcePortX[moduleObject['@id']] = props.outPortX;

  //draw module name
  ctx.fillStyle = style.module.text.fill;
  ctx.font = style.module.text.font;
  ctx.fillText(
    moduleObject['@name'],
    mx + Math.floor((props.moduleWidth - props.fontMetrics.width)/2),
    my + props.textHeight + style.module.text.ypad
  );
}

function drawModule(ctx, moduleObject) {
  var moduleInfo = moduleRegistry[moduleObject['@package']][moduleObject['@name']],
    portWidth = style.module.port.width,
    i,
    props = moduleMetrics(ctx, moduleObject),
    mx = props.mx,
    my = props.my,
    inPortX = props.inPortX,
    outPortX = props.outPortX;

  //draw rectangle
  ctx.fillStyle = style.module.fill;
  ctx.strokeStyle = style.module.stroke;
  ctx.fillRect(mx, my, props.moduleWidth, props.moduleHeight);
  ctx.strokeRect(mx, my, props.moduleWidth, props.moduleHeight);

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
      ctx.fillRect(inPortX, props.inPortY, portWidth, portWidth);
      ctx.strokeRect(inPortX, props.inPortY, portWidth, portWidth);
      inPortX += portWidth + style.module.port.pad;
    } else {
      moduleSourcePortX[moduleObject['@id']][moduleInfo.portSpec[i]['@name']] = outPortX;
      ctx.fillRect(outPortX, props.outPortY, portWidth, portWidth);
      ctx.strokeRect(outPortX, props.outPortY, portWidth, portWidth);
      outPortX += portWidth + style.module.port.pad;
    }
  }
  moduleTargetPortY[moduleObject['@id']] = props.inPortY;
  moduleSourcePortY[moduleObject['@id']] = props.outPortY;

  //draw module name
  ctx.fillStyle = style.module.text.fill;
  ctx.font = style.module.text.font;
  ctx.fillText(moduleObject['@name'],
    mx + Math.floor((props.moduleWidth - props.fontMetrics.width)/2),
    my + style.module.port.pad*2 + portWidth + props.textHeight +
      style.module.text.ypad);
}

function drawConnection(ctx, connectionObject) {
  drawConnectionCurve(ctx, computeConnectionPositions(connectionObject));
}

function drawConnectionExpanded(ctx, connectionObject) {
  drawConnectionCurveExpanded(ctx, computeConnectionPositionsExpanded(connectionObject));
}

function drawConnectionCurve(ctx, posInfo) {
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

function drawConnectionCurveExpanded(ctx, posInfo) {
  ctx.beginPath();
  ctx.moveTo(posInfo.cx1, posInfo.cy1);
  ctx.bezierCurveTo(posInfo.cx1 + style.module.ypad, posInfo.cy1,
    posInfo.cx2 - style.module.ypad, posInfo.cy2,
    posInfo.cx2, posInfo.cy2);
  ctx.lineWidth = style.conn.lineWidth;

  // line color
  ctx.strokeStyle = style.conn.stroke;
  ctx.stroke();
}

function computeConnectionPositionsExpanded(connectionObject) {
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
    cx1: moduleSourcePortX[sourceModule['@id']] + centerOffset,
    cy1: moduleSourcePortY[sourceModule['@id']][sourcePort['@name']] + centerOffset,
    cx2: moduleTargetPortX[targetModule['@id']] + centerOffset,
    cy2: moduleTargetPortY[targetModule['@id']][targetPort['@name']] + centerOffset
  };
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

    var ctxPos = this.ctxMousePos(e);

    try {
      newModule(activeWorkflow, e.dataTransfer.getData("Text"), ctxPos.x,
        ctxPos.y);
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
        "@x": parseFloat(x),
        "@y": -parseFloat(y),
        "@id": nextLocationId()
      },
      "@id": nextModuleId()
    };

  moduleInstances[module['@id']] = module;
  workflow.data.workflow.module.push(module);
  workflow.draw();
}

function newConnection(workflow, sourceModule, sourcePortSpec, targetModule, targetPortSpec) {
  var connection = {
    "@id": nextConnectionId(),
    "port": [
      {
        "@moduleName": targetModule['@name'],
        "@name": targetPortSpec['@name'],
        "@signature": targetPortSpec['@sigstring'],
        "@id": nextPortId(),
        "@type": "destination",
        "@moduleId": targetModule['@id']
      }, {
        "@moduleName": sourceModule['@name'],
        "@name": sourcePortSpec['@name'],
        "@signature": sourcePortSpec['@sigstring'],
        "@id": nextPortId(),
        "@type": "source",
        "@moduleId": sourceModule['@id']
      }
    ]
  }
  workflow.connection.push(connection);
  activeWorkflow.draw();
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

function defaultValue(param, _default) {
  return typeof param !== 'undefined' ? param: _default;
}

function createIdCounter(initialId) {
  initialId = defaultValue(initialId, -1);
  return function() { initialId += 1; return initialId; };
}

var nextWorkflowId = createIdCounter();
var nextModuleId = createIdCounter();
var nextLocationId = createIdCounter();
var nextConnectionId = createIdCounter();
var nextPortId = createIdCounter();

function newWorkflow(name, version, connections, modules, vistrail_id, id) {
  name = defaultValue(name, 'untitled');
  version = defaultValue(version, '1.0.2');
  connections = defaultValue(connections, []);
  modules = defaultValue(modules, []);
  vistrail_id = defaultValue(vistrail_id, "");
  id = defaultValue(id, nextWorkflowId());
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

function createTranslateFunctions() {
  var dx=0,
    dy=0;

  return [function (ctx, x, y) {
    dx += x;
    dy += y;
    ctx.translate(x, y);
  }, function() {
    return {x:dx, y:dy};
  } ];
}

var translateFunctions = createTranslateFunctions();
var myTranslate = translateFunctions[0];
var myTranslated = translateFunctions[1];

function setupInteraction() {
  var $canvas = $('#workspace'),
    ctx = $canvas[0].getContext('2d'),
    panning,
    lastPoint,
    lastPanEvent,
    draggingPort,
    draggingPortPos,
    draggingPortModule,
    draggingModule;

  $canvas.mousedown(function (e) {
    var i,
      workflow = activeWorkflow.data.workflow,
      port;

    lastPoint = this.ctxMousePos(e);

    // find modules
    for(i = workflow.module.length-1; i >= 0; i--) {
      //var metrics = moduleMetrics(ctx, workflow.module[i]);
      var metrics = expandedModuleMetrics(ctx, workflow.module[i]);
      if(moduleContains(metrics, lastPoint)) {
        if(port = modulePortByPos(metrics, workflow.module[i], lastPoint)) {
          draggingPort = port;
          draggingPortPos = lastPoint;
          draggingPortModule = workflow.module[i];
        } else {
          draggingModule = workflow.module[i];
        }
        return;
      }
    }

    // find connections

    // else initiate pan
    panning = true;
    lastPanEvent = e;
  });

  $canvas.mousemove(function (e) {
    // if dragging module

    if(draggingModule) {
      var newPoint = this.ctxMousePos(e);
      draggingModule.location['@x'] += newPoint.x - lastPoint.x;
      draggingModule.location['@y'] -= newPoint.y - lastPoint.y;
      lastPoint = newPoint;
      activeWorkflow.draw();
    } else if (draggingPort) {
      lastPoint = this.ctxMousePos(e);
      activeWorkflow.draw();
      drawConnectionCurve(this.getContext('2d'), {
        cx1: draggingPortPos.x,
        cy1: draggingPortPos.y,
        cx2: lastPoint.x,
        cy2: lastPoint.y
      });
    } else if (panning) {
      //var text = ['(', newPoint.x, ', ', newPoint.y, ') (',lastPoint.x, ', ', lastPoint.y, ')'].join('');
      myTranslate(this.getContext('2d'), e.clientX - lastPanEvent.clientX,
          e.clientY - lastPanEvent.clientY);
      lastPanEvent = e;
      activeWorkflow.draw();
      //this.ctxMousePos();

//      var translated = myTranslated();
//      ctx.fillStyle = 'yellow';
//      ctx.fillRect(-translated.x, -translated.y, 100, 20);
//      //var np = this.ctxMousePos(e);
//      ctx.fillStyle = 'black';
//      ctx.fillText(text,
//        -translated.x + 5, -translated.y + 18);
    }

//    var translated = myTranslated(),
//      ctx = this.getContext('2d');
//    ctx.fillStyle = 'yellow';
//    ctx.fillRect(-translated.x, -translated.y, 100, 20);
//    var np = this.ctxMousePos(e);
//    ctx.fillStyle = 'black';
//    ctx.fillText(np.x + ', ' + np.y, -translated.x + 5, -translated.y + 18);
  });

  $canvas.mouseup(function (e) {
    panning = false;
    draggingModule = null;
    if( draggingPort ) {
      var i,
        port,
        workflow = activeWorkflow.data.workflow,
        ctx = this.getContext('2d');

      for(i = workflow.module.length-1; i >= 0; i--) {
        //var metrics = moduleMetrics(ctx, workflow.module[i]);
        var metrics = expandedModuleMetrics(ctx, workflow.module[i]);
        if(moduleContains(metrics, lastPoint)) {
          if(port = modulePortByPos(metrics, workflow.module[i], lastPoint)) {
            newConnection(workflow, draggingPortModule, draggingPort, workflow.module[i], port);
            break;
          }
        }
      }
      draggingPort = null;
      draggingPortModule = null;
      draggingPortPos = null;
    }
  });

  $canvas.mouseout(function (e) {
    panning = false;
  });
}

function moduleContains(metrics, pos) {
  return pos.x > metrics.mx && pos.x < metrics.mx + metrics.moduleWidth &&
    pos.y > metrics.my && pos.y < metrics.my + metrics.moduleHeight;
}

function modulePortByPos(metrics, module, pos) {
  return null;
}

function ctxMousePos(event){
  var totalOffsetX = 0,
    totalOffsetY = 0,
    currentElement = this,
    translated = myTranslated();

  do{
    totalOffsetX += currentElement.offsetLeft - currentElement.scrollLeft;
    totalOffsetY += currentElement.offsetTop - currentElement.scrollTop;
  }
  while(currentElement = currentElement.offsetParent)

//    var ctx = this.getContext('2d');
//    ctx.fillStyle = 'yellow';
//    ctx.fillRect(-translated.x, -translated.y, 100, 20);
//    ctx.fillStyle = 'black';
//    ctx.fillText(translated.x + ', ' + translated.y, -translated.x + 5, -translated.y + 18);

  return {
    x: event.pageX - totalOffsetX - translated.x,
    y: event.pageY - totalOffsetY - translated.y
  };
}

HTMLCanvasElement.prototype.ctxMousePos = ctxMousePos;
