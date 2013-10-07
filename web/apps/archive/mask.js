/**
 *
 * @param options
 * @constructor
 */
function NamedBitMask(options) {
  var mask = 0,
    namedMasks = {},
    nextMask = 1,
    maxMask = Math.pow(2,32);

  this.add = function(name) {
    if(namedMasks.hasOwnProperty(name)) {
      throw "Mask name already in use: " + name;
    } else if (nextMask >= maxMask) {
      throw "NamedBitMask is full, cannot add more names"
    }
    namedMasks[name] = nextMask;
    nextMask *= 2;
  };

  this.isOn = function(name) {
    return (mask & namedMasks[name]) > 0;
  };

  this.isOff = function(name) {
    return !this.isOn(name);
  };

  this.turnOn = function(name) {
    mask |= namedMasks[name];
  };

  this.turnOff = function(name) {
    mask &= (~namedMasks[name]);
  };

  this.toggle = function(name) {
    mask ^= namedMasks[name];
  };

  this.getMask = function() {
    return mask;
  };

  this.setMask = function(newMask) {
    mask = newMask;
  };

  this.getNamedMasks = function() {
    return namedMasks;
  };

  this.setNamedMasks = function(newNamedMasks) {
    nextMask = 1;
    for(var name in newNamedMasks) {
      if(newNamedMasks.hasOwnProperty(name)) {
        if(newNamedMasks[name] >= nextMask) {
          nextMask = newNamedMasks[name] * 2;
        }
        if(newNamedMasks[name] >= maxMask) {
          throw "Mask is too big";
        }
      }
    }
    namedMasks = newNamedMasks;
  };

  this.serialize = function() {
    return [mask, namedMasks, nextMask];
  };

  this.deserialize = function(serializedObject) {
    mask = serializedObject[0];
    namedMasks = serializedObject[1];
    nextMask = serializedObject[2];
  }
}