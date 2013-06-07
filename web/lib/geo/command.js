/**
 * @module ogs.geo
 */

/*jslint devel: true, forin: true, newcap: true, plusplus: true, white: true, indent: 2*/
/*global geoModule, ogs, inherit*/

/**
 * Create a new instance of class command
 *
 * @class
 * @returns {geoModule.command}
 */
geoModule.command = function() {
  "use strict";
  if (!(this instanceof geoModule.command)) {
    return new geoModule.command();
  }
  ogs.vgl.command.call(this);

  return this;
};

inherit(geoModule.command, ogs.vgl.command);

/**
 * Event types
 */
geoModule.command.updateEvent = "updateEvent";
geoModule.command.updateLayerOpacityEvent = "updateLayerOpacityEvent";
geoModule.command.addLayerEvent = "addLayerEvent";
geoModule.command.removeLayerEvent = "removeLayerEvent";
geoModule.command.toggleLayerEvent = "toggleLayerEvent";
geoModule.command.selectLayerEvent = "selectLayerEvent";
geoModule.command.unselectLayerEvent = "unselectLayerEvent";
geoModule.command.updateZoomEvent = "updateZoomEvent";
geoModule.command.resizeEvent = "resizeEvent";
geoModule.command.animateEvent = "animateEvent";
