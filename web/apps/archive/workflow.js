var moduleRegistry = {},
  style = climatePipesStyle,
  activeWorkflow;

function debug(msg) {
  console.log(msg);
}

function initWorkflowCanvas() {
  $(window).on('resize', function() {
    activeWorkflow.resize();
  });
  setupDragAndDrop();
  setupModuleList();
  setupInteraction();
  $('#canvasContainer').css({
    position: 'relative',
    overflow: 'hidden'
  })
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

function setupInteraction() {
  var $canvas = $('#workspace'),
    ctx = $canvas[0].getContext('2d'),
    panning,
    lastPoint,
    lastPanEvent,
    draggingPort,
    draggingPortPos,
    draggingPortModule,
    draggingModule,
    tempConnection = uiModule.connection();

  $canvas.mousedown(function (e) {
    var modules = activeWorkflow.modules(),
      key,
      module;

    lastPoint = this.ctxMousePos(e);

    // find modules
    for(key in modules) {
      if(modules.hasOwnProperty(key)) {
        module = modules[key];
        if(module.contains(lastPoint)) {
          if(draggingPort = module.portByPos(lastPoint)) {
            draggingPortPos = lastPoint;
            draggingPortModule = module;
          } else {
            draggingModule = module;
          }
          return;
        }
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
      draggingModule.getData().location['@x'] += newPoint.x - lastPoint.x;
      draggingModule.getData().location['@y'] -= newPoint.y - lastPoint.y;
      draggingModule.recomputeMetrics($canvas[0].getContext('2d'), style);
      lastPoint = newPoint;
      activeWorkflow.draw(ctx);
    } else if (draggingPort) {
      lastPoint = this.ctxMousePos(e);
      activeWorkflow.draw(ctx);
      tempConnection.drawCurve(ctx, style, {
        cx1: draggingPortPos.x,
        cy1: draggingPortPos.y,
        cx2: lastPoint.x,
        cy2: lastPoint.y
      });
    } else if (panning) {
      activeWorkflow.translate(
        this.getContext('2d'),
        e.clientX - lastPanEvent.clientX,
        e.clientY - lastPanEvent.clientY
      );
      lastPanEvent = e;
      activeWorkflow.draw(ctx);
      activeWorkflow.updateElementPositions();
    }
  });

  $canvas.mouseup(function (e) {
    panning = false;
    draggingModule = null;
    if( draggingPort ) {
      var port,
        modules = activeWorkflow.modules(),
        key,
        module,
        ctx = this.getContext('2d');

      for(key in modules) {
        if(modules.hasOwnProperty(key)) {
          module = modules[key];
          if(module.contains(lastPoint)) {
            if(port = module.portByPos(lastPoint)) {
              activeWorkflow.addConnection(
                draggingPortModule,
                draggingPort,
                module,
                port
              );
              break;
            }
          }
        }
      }
      draggingPort = null;
      draggingPortModule = null;
      draggingPortPos = null;
      activeWorkflow.draw(ctx, style);
    }
  });

  $canvas.mouseout(function (e) {
    panning = false;
  });
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
