var moduleRegistry = {},
  moduleInstances = {},
  style = climatePipesStyle,
  activeWorkflow;

function debug(msg) {
  console.log(msg);
}

function initWorkflowCanvas() {

  setupDragAndDrop();
  setupModuleList();
  setupInteraction();

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
  ctx.bezierCurveTo(
    posInfo.cx1, posInfo.cy1 + style.module.ypad,
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
  ctx.bezierCurveTo(
    posInfo.cx1 + style.module.ypad, posInfo.cy1,
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

    activeWorkflow.addNewModule(
      e.dataTransfer.getData("Text"),
      ctxPos.x,
      ctxPos.y
    );

    activeWorkflow.draw($canvas[0].getContext('2d'));

		return false;
	});
}

//function newModule(workflow, moduleInfoJSON, x, y) {
//  var moduleInfo = JSON.parse(moduleInfoJSON),
//    module = {
//      "@name": moduleInfo['@name'],
//      "@package": moduleInfo['@package'],
//      "@version": moduleInfo['@packageVersion'],
//      "@namespace": moduleInfo['@namespace'],
//      "@cache": "1",
//      "location": {
//        "@x": parseFloat(x),
//        "@y": -parseFloat(y),
//        "@id": nextLocationId()
//      },
//      "@id": nextModuleId()
//    };
//
//  moduleInstances[module['@id']] = module;
//  workflow.data().workflow.module.push(module);
//  workflow.draw();
//}

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
      modules = activeWorkflow.modules(),
      module,
      port;

    lastPoint = this.ctxMousePos(e);

    // find modules
    for(i = modules.length-1; i >= 0; i--) {
      module = modules[i];
      if(module.contains(lastPoint)) {
        if(port = module.portByPos(lastPoint)) {
          draggingPort = port.data();
          draggingPortPos = lastPoint;
          draggingPortModule = module;
        } else {
          draggingModule = module;
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
      draggingModule.data().location['@x'] += newPoint.x - lastPoint.x;
      draggingModule.data().location['@y'] -= newPoint.y - lastPoint.y;
      lastPoint = newPoint;
      activeWorkflow.draw(ctx);
    } else if (draggingPort) {
      lastPoint = this.ctxMousePos(e);
      activeWorkflow.draw(ctx);
      drawConnectionCurve(this.getContext('2d'), {
        cx1: draggingPortPos.x,
        cy1: draggingPortPos.y,
        cx2: lastPoint.x,
        cy2: lastPoint.y
      });
    } else if (panning) {
      //var text = ['(', newPoint.x, ', ', newPoint.y, ') (',lastPoint.x, ', ', lastPoint.y, ')'].join('');
      activeWorkflow.translate(
        this.getContext('2d'),
        e.clientX - lastPanEvent.clientX,
        e.clientY - lastPanEvent.clientY
      );
      lastPanEvent = e;
      activeWorkflow.draw(ctx);
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
    translated = activeWorkflow.translated();

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
