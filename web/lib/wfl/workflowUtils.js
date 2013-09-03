//////////////////////////////////////////////////////////////////////////////
/**
 * @module ogs.wfl
 */

/*jslint devel: true, forin: true, newcap: true, plusplus: true*/
/*jslint white: true, indent: 2*/

/*global geoModule, ogs, inherit, $, HTMLCanvasElement, Image, wflModule*/
/*global vglModule, proj4, document, climatePipesStyle, window, reg*/
//////////////////////////////////////////////////////////////////////////////

/**
 * Overwrites obj1's values with obj2's and adds obj2's if non existent in obj1
 * @param obj1 object
 * @param obj2 object
 * @returns object a new object based on obj1 and obj2
 */
"use strict";

function merge_options(obj1,obj2){
  var obj3 = {}, attrName;
  for (attrName in obj1) { obj3[attrName] = obj1[attrName]; }
  for (attrName in obj2) { obj3[attrName] = obj2[attrName]; }
  return obj3;
}

function merge_options_in_place(obj1, obj2) {
  var attrName;
  for (attrName in obj2) { obj1[attrName] = obj2[attrName]; }
  return obj1;
}

function defaultValue(param, dflt) {
  return typeof param !== 'undefined' ? param: dflt;
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
var nextFunctionId = createIdCounter();


function blankWorkflow(name, version, connections, modules, vistrail_id, id) {
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
      "@{http://www.w3.org/2001/XMLSchema-instance}schemaLocation":
        "http://www.vistrails.org/workflow.xsd",
      "connection": connections,
      "module": modules,
      "@vistrail_id": vistrail_id,
      "@id": id
    }
  };
}

var moduleRegistry = {},
  currentWorkflowStyle = climatePipesStyle,
  activeWorkflow;

function debug(msg) {
  console.log(msg);
}

function setupWorkflowCSS() {
  var stylesheet = document.styleSheets[0],
    selector = "[draggable]",
    rule = [
      '{-moz-user-select: none;',
      '-khtml-user-select: none;',
      '-webkit-user-select: none;',
      'user-select: none;',
      '-khtml-user-drag: element;',
      '-webkit-user-drag: element;',
      'cursor: move;}'
    ].join(''),
    pos,
    $canvas = $('#workspace'),
    context = $canvas[0].getContext('2d'),
    modulePattern = new Image(),
    workflowPattern = new Image();

  if (stylesheet.insertRule) {
    pos = stylesheet.cssRules ? stylesheet.cssRules.length : 0;
    stylesheet.insertRule(selector + rule, pos);
  } else if (stylesheet.addRule) {
    stylesheet.addRule(selector, rule, -1);
  }

  $('#modulediv').css({
    height: '100%',
    width: 225,
    overflow: 'auto',
    float: 'left'
  });

  $('#canvasContainer').css({
    position: 'relative',
    height: '100%',
    overflow: 'hidden'
  });

  $('#inputContainer').css({
    position: 'absolute',
    top: climatePipesStyle.shadowBlur,
    left: climatePipesStyle.shadowBlur,
    bottom: climatePipesStyle.shadowBlur,
    right: climatePipesStyle.shadowBlur,
    overflow: 'hidden',
    'pointer-events': 'none'
  });

  $('#workflow-dialog').hide();

  //give modules a texture fill
  modulePattern.onload = function() {
    climatePipesStyle.module.fill = context.createPattern(modulePattern,
      'repeat');
  };
  modulePattern.src = '/common/img/squairy_light.png';

  workflowPattern.onload = function() {
    climatePipesStyle.fill = context.createPattern(workflowPattern, 'repeat');
  };
  workflowPattern.src = '/common/img/tweed.png';
}

function setupWorkflowDragAndDrop() {
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
    var ctxPos = this.ctxMousePos(e);

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


    activeWorkflow.addNewModule(
      e.dataTransfer.getData("Text"),
      ctxPos.x,
      ctxPos.y
    );

    activeWorkflow.draw($canvas[0].getContext('2d'));

    return false;
  });
}

function addModuleToList(moduleInfo, $moduleTableBody) {
  var $text = $(document.createElement('div')),
    $td = $(document.createElement('td')),
    $tr = $(document.createElement('tr'));

  $text.append(moduleInfo['@name'])
    .attr('draggable', 'true')
    .data('moduleInfo', moduleInfo)
    .on('dragstart', function(e) {
      if (e.originalEvent) { //jQuery
        e = e.originalEvent;
      }
      e.dataTransfer.effectAllowed = 'copy';
      e.dataTransfer.setData("Text",
        JSON.stringify($(this).data('moduleInfo')));

      debug(e);
    });

  $moduleTableBody.append($tr.append($td.append($text)));
}

function setupWorkflowModuleList() {
  var $moduleTableBody = $('#moduletable > tbody:last'),
    pkg,
    moduleInfo,
    i,
    j;

  for(i = 0; i < reg.registry.package.length; i++) {
    pkg = reg.registry.package[i];
    if(!moduleRegistry.hasOwnProperty(pkg['@identifier'])) {
      moduleRegistry[pkg['@identifier']] = {};
    }
    if(pkg.hasOwnProperty('moduleDescriptor')) {
      for(j = 0; j < pkg.moduleDescriptor.length; j++) {
        moduleInfo = pkg.moduleDescriptor[j];
        moduleRegistry[pkg['@identifier']][moduleInfo['@name']] = moduleInfo;
        addModuleToList(moduleInfo, $moduleTableBody);
      }
    }
  }
}

function setupWorkflowInteraction() {
  var $canvas = $('#workspace'),
    ctx = $canvas[0].getContext('2d'),
    panning,
    lastPoint,
    lastPanEvent,
    draggingPort,
    draggingPortPos,
    draggingPortModule,
    draggingModule,
    tempConnection = wflModule.connection();

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
          draggingPort = module.portByPos(lastPoint);
          if(draggingPort) {
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
      draggingModule.recomputeMetrics($canvas[0].getContext('2d'),
        currentWorkflowStyle);
      lastPoint = newPoint;
      activeWorkflow.draw(ctx);
    } else if (draggingPort) {
      lastPoint = this.ctxMousePos(e);
      activeWorkflow.draw(ctx);
      tempConnection.drawCurve(ctx, currentWorkflowStyle, {
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
            port = module.portByPos(lastPoint);
            if(port) {
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
      activeWorkflow.draw(ctx, currentWorkflowStyle);
    }
  });

  $canvas.mouseout(function (e) {
    panning = false;
  });
}

var ctxMousePos = function(event){
  var totalOffsetX = 0,
    totalOffsetY = 0,
    currentElement = this,
    translated = activeWorkflow.translated();

  do{
    totalOffsetX += currentElement.offsetLeft - currentElement.scrollLeft;
    totalOffsetY += currentElement.offsetTop - currentElement.scrollTop;
    currentElement = currentElement.offsetParent;
  }
  while(currentElement);

  return {
    x: event.pageX - totalOffsetX - translated.x,
    y: event.pageY - totalOffsetY - translated.y
  };
};

/**
 * Draws a rounded rectangle using the current state of the canvas.
 * If you omit the last three params, it will draw a rectangle
 * outline with a 5 pixel border radius
 * @param {CanvasRenderingContext2D} ctx
 * @param {Number} x The top left x coordinate
 * @param {Number} y The top left y coordinate
 * @param {Number} width The width of the rectangle
 * @param {Number} height The height of the rectangle
 * @param {Number} radius The corner radius. Defaults to 5;
 * @param {Boolean} fill Whether to fill the rectangle. Defaults to false.
 * @param {Boolean} stroke Whether to stroke the rectangle. Defaults to true.
 */
function roundRect(ctx, x, y, width, height, radius, fill, stroke) {
  if (typeof radius === "undefined") {
    radius = 5;
  }
  ctx.beginPath();
  ctx.moveTo(x + radius, y);
  ctx.lineTo(x + width - radius, y);
  ctx.quadraticCurveTo(x + width, y, x + width, y + radius);
  ctx.lineTo(x + width, y + height - radius);
  ctx.quadraticCurveTo(x + width, y + height, x + width - radius, y + height);
  ctx.lineTo(x + radius, y + height);
  ctx.quadraticCurveTo(x, y + height, x, y + height - radius);
  ctx.lineTo(x, y + radius);
  ctx.quadraticCurveTo(x, y, x + radius, y);
  ctx.closePath();
  if (stroke || typeof stroke === "undefined") {
    ctx.stroke();
  }
  if (fill) {
    ctx.fill();
  }
}

function initWorkflowCanvas() {
  $(window).on('resize', function() {
    if (activeWorkflow) {
      activeWorkflow.resize();
    }
  });

//  append workflow html elements
  $('body').append(
    [
      '<div id="workflow-dialog" title="Workflow">',
      '<div id="modulediv"><table id="moduletable">',
      '<tbody></tbody></table></div>',
      '<div id="canvasContainer"><canvas id="workspace"></canvas>',
      '<div id="inputContainer"></div>',
      '</div>'
    ].join('')
  );

  setupWorkflowDragAndDrop();
  setupWorkflowModuleList();
  setupWorkflowInteraction();
  setupWorkflowCSS();
}

HTMLCanvasElement.prototype.ctxMousePos = ctxMousePos;
