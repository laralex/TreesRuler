'use strict';

let img;
let localization;
let gui;
let guiMeasureComposer;
var imgView;

let generalSettings = new function() {
  this.crosshairEnabled = true;
  this.language = 'RUS';
  this.guiOpacity = 0.9;
  this.guiWidth = 300;
  this.guiTheme = 'yorha';
  this.guiAskUnsaved = false;
}();

function openImageFiles(){
   document.getElementById('file-input').click()
}

let crosshairSettings = new function() {
  this.crosshairEnabled = true;
  this.crosshairLinesEnd = 10;
  this.crosshairRadius = 10;
  this.crosshairColor = '#ff0000';
}();

let zoomSettings = new function() {
  this.panX = 0;
  this.panY = 0;
  this.zoom = 1;
  this.zoomMin = 0.01;
  this.zoomMax = 100;
  this.zoomSensitivity = 0.0005;
}();

let imageInfo = new function() {
  this.imageSizeStr = "";
}();

function getLocalized(key) {
  if (key in localization) {
    return localization[key][generalSettings.language];
  }
  console.warn(key, ' missing localization');
  return key;
}

class ImageAABBView {
  constructor(imageWidth, imageHeight) {
    this.imageWidth = imageWidth;
    this.imageHeight = imageHeight;
  }

  toScreenBbox(screenWidth, screenHeight, zoom, panX, panY) {
    let width = this.imageWidth*zoom;
    let height = this.imageHeight*zoom;
    return {
      left: screenWidth/2-width/2 - panX*width,
      width: width,
      top: screenHeight/2-height/2 - panY*height,
      height: height,
    }
  }
}

class MeasureGroupGuiComposer {
  constructor(imageWidth, imageHeight) {
    this.groups = [];
    this.imageWidth = imageWidth;
    this.imageHeight = imageHeight;
  }

  _newMeasure({gui=null, parentFolder=null, newFolderName=null, boundData=null, open=false, removable=false}) {
    let definitions = [
      {
        type: 'folder',
        label: newFolderName,
        folder: parentFolder,
        open: open
      },
      {
        type: 'range',
        label: getLocalized('beginPointX'),
        min: 0, max: this.imageWidth, step: 1,
        property: 'x0',
        object: boundData, folder: newFolderName
      },
      {
        type: 'range',
        label: getLocalized('beginPointY'),
        min: 0, max: this.imageHeight, step: 1,
        property: 'y0',
        object: boundData, folder: newFolderName
      },
      {
        type: 'range',
        label: getLocalized('endPointX'),
        min: 0, max: this.imageWidth, step: 1,
        property: 'x1',
        object: boundData, folder: newFolderName
      },
      {
        type: 'range',
        label: getLocalized('endPointY'),
        min: 0, max: this.imageHeight, step: 1,
        property: 'y1',
        object: boundData, folder: newFolderName
      }
    ];
    let objects = [];
    for (let definition of definitions) {
      objects.push(gui.Register(definition));
    }
    print(boundData, newFolderName);
    if (removable) {
      objects.push(gui.Register({
        type: 'button',
        label: getLocalized('guiRemoveMeasure'),
        folder: newFolderName,
        action: () => { objects.forEach(obj => gui.Remove(obj)) },
      }));
    }
    return objects;
  }
  newGroup(gui, parentFolder) {
    let uniqueSpaces = '@'.repeat(this.groups.length);
    let groupFolder = `${getLocalized('guiGroup')}${this.groups.length}`;
    let groupFolderObj = gui.Register({
      type: 'folder',
      label: groupFolder,
      folder: parentFolder,
      open: true
    });
    let guiObjects = [groupFolderObj];
    let groupBoundData = {
      color: "#00FF00",
      denotation: 'a',
      baseMeasure: {x0: 0, y0: 0, x1: 0, y1: 0},
      measures: [{x0: 0, y0: 0, x1: 0, y1: 0}]
    };
    guiObjects.push(gui.Register({
        type: 'color',
        label: getLocalized('guiGroupColor'),
        format: 'hex',
        property: 'color',
        object: groupBoundData, folder: groupFolder
    }));
    guiObjects.push(gui.Register({
        type: 'text',
        label: getLocalized('guiGroupDenotation'),
        property: 'denotation',
        object: groupBoundData, folder: groupFolder
    }));
    guiObjects.push(gui.Register({
      type: 'button',
      label: getLocalized('guiNewMeasure'),
      folder: groupFolder
    }));
    guiObjects.push(...this._newMeasure({
      gui: gui, parentFolder: groupFolder,
      newFolderName: `${getLocalized('baseMeasure')}${uniqueSpaces}`,
      boundData: groupBoundData.baseMeasure,
      open: false,
      removable: false
    }));
    guiObjects.push(...this._newMeasure({
      gui: gui, parentFolder: groupFolder, 
      newFolderName: `${getLocalized('measure')}-${0}${uniqueSpaces}`,
      boundData: groupBoundData.measures[0], 
      open: false,
      removable: true
    }));
    this.groups.push({guiObjects: guiObjects, data: groupBoundData});
  }

  removeAllGroups(gui) {
    this.groups.forEach(group => group.guiObjects.forEach(obj => gui.Remove(obj)));
  }
}

function setupGui(gui, panel) {
  if (gui !== undefined) {
    let guifyContainers = document.getElementsByClassName('guify-container');
    for (let element of guifyContainers) {
        element.remove();
    }
    print('Deleted GUI instances');
  }

  gui = new guify({
    title:  getLocalized('title'),
    theme: panel.guiTheme, // dark, light, yorha, or theme object
    align: 'right', // left, right
    width: panel.guiWidth,
    barMode: 'above', // none, overlay, above, offset
    panelMode: 'inner',
    panelOverflowBehavior: 'scroll',
    pollRateMS: 300,
    opacity: panel.guiOpacity,
    open: true
  });
  document.title = getLocalized('title');
  gui.Register([
    {
      type: 'select',
      options: ['RUS', 'ENG'],
      label: getLocalized('language'),
      object: panel,
      property: 'language',
      onChange: (data) => {
        setupGui(gui, panel);
      },
    },

    {
      type: 'folder',
      label: getLocalized('guiFolder'),
      open: false
    },

    {
      type: 'folder',
      label: getLocalized('crosshairFolder'),
      open: false
    },

    {
      type: 'folder',
      label: getLocalized('zoomFolder'),
      open: false
    },

    {
      type: 'folder',
      label: getLocalized('measuresFolder'),
      open: true
    },

    {
      type: 'checkbox',
      label: getLocalized('guiAskUnsaved'),
      property: 'guiAskUnsaved',
      object: panel,
    },

    {
      type: 'file',
      label: getLocalized('openImageFiles'),
      object: this,
      onChange: (data) => {
        if (!generalSettings.guiAskUnsaved || confirm(getLocalized('loosingUnsavedDialog'))) {
          myLoadImage(data);
        } else {
          print('Cancel openning of file');
        }
      }
    },
    {
      type: 'text',
      label: getLocalized('imageSize'),
      object: imageInfo, property: 'imageSizeStr',
      listenMode: 'change',
    }
  ]);

  gui.Register([
    {
      type: 'range',
      label: getLocalized('guiOpacity'),
      min: 0.1, max: 1.0, step: 0.05,
      object: panel,
      property: 'guiOpacity',
      onChange: (data) => {
        document.getElementsByClassName('guify-panel-container')[0].style.opacity = data;
      }
    },

    {
      type: 'select',
      label: getLocalized('guiWidth'),
      options: [300, 375, 600],
      object: panel,
      property: 'guiWidth',
      onChange: (data) => {
        let value = data+'px';
        document.getElementsByClassName('guify-panel-container')[0].style.width = value;
      }
    },

    {
      type: 'select',
      label: getLocalized('guiTheme'),
      options: ['yorha', 'dark', 'light'],
      object: panel,
      property: 'guiTheme',
      onChange: (data) => {
        setupGui(gui, panel);
      }
    },
  ], { object: panel, folder: getLocalized('guiFolder') });

  gui.Register([
    {
      type: 'button',
      label: getLocalized('zoomReset'),
      action: resetZoom
    },
    {
      type: 'range',
      label: getLocalized('zoomX'),
      min: -0.5, max: 0.5, step: 0.01,
      property: 'panX'
    },
    {
      type: 'range',
      label: getLocalized('zoomY'),
      min: -0.5, max: 0.5, step: 0.01,
      property: 'panY'
    },
    {
      type: 'range',
      label: getLocalized('zoomLevel'),
      scale: 'log',
      min: zoomSettings.zoomMin, max: zoomSettings.zoomMax,
      property: 'zoom'
    },
  ], { object: zoomSettings, folder: getLocalized('zoomFolder') });

  gui.Register([
    {
      type: 'checkbox',
      label: getLocalized('crosshairEnabled'),
      property: 'crosshairEnabled',
    },
    {
      type: 'range',
      label: getLocalized('crosshairRadius'),
      min: 0, max: 50, step: 1,
      property: 'crosshairRadius'
    },

    {
      type: 'range',
      label: getLocalized('crosshairLinesEnd'),
      min: 1, max: 50, step: 1,
      property: 'crosshairLinesEnd'
    },

    {
      type: 'color',
      label: getLocalized('crosshairColor'),
      format: 'hex',
      property: 'crosshairColor'
    },
  ], { object: crosshairSettings, folder: getLocalized('crosshairFolder') });

  let guifyBarButtons = document.getElementsByClassName('guify-bar-button');
  for (let element of guifyBarButtons) {
    if (element.ariaLabel === null || !element.ariaLabel.includes("screen")) {
        element.innerText = getLocalized('controls');
      }
  }

  return gui;
}

function resetZoom() {
  zoomSettings.panX = 0;
  zoomSettings.panY = 0;
  zoomSettings.zoom = min(windowHeight / img.height, windowWidth / img.width);
}

function mouseWheel(event) {
  var zoomDelta = -zoomSettings.zoomSensitivity*exp(zoomSettings.zoom)*event.delta;
  zoomDelta = constrain(zoomDelta, -zoomSettings.zoom/5, zoomSettings.zoom/5);
  zoomSettings.zoom += zoomDelta;
  zoomSettings.zoom = constrain(zoomSettings.zoom, zoomSettings.zoomMin, zoomSettings.zoomMax);
  return false;
}

function myLoadImage(uri) {
  loadImage(uri, newImg => {
    img = newImg;
    imgView = new ImageAABBView(img.width, img.height);
    imageInfo.imageSizeStr = `${img.width} x ${img.height}`;
    resetZoom();
    if (guiMeasureComposer !== undefined) {
      guiMeasureComposer.removeAllGroups(gui);
    }
    guiMeasureComposer = new MeasureGroupGuiComposer(img.width, img.height);
    // if (uri.includes('000006')) {
      guiMeasureComposer.newGroup(gui, getLocalized('measuresFolder'));
      guiMeasureComposer.newGroup(gui, getLocalized('measuresFolder'));
    // }

    print('Loaded image', uri.slice(0, 100));
  });
  
}

function preload() {
  localization = loadJSON('./localization.json');
}

function setup() {
  createCanvas(windowWidth, windowHeight);
  windowResized();
  gui = setupGui(gui, generalSettings);
  myLoadImage('./assets/example_trees/000006.jpg');
}

function drawCrosshair({x=0, y=0, beginOffset=0, endOffset=0, colorHexStr="#00000000"}) {
  push();
  noFill();
  stroke(colorHexStr);
  strokeWeight(3);
  strokeCap(SQUARE);
  line(x + beginOffset, y, x + endOffset, y);
  line(x - beginOffset, y, x - endOffset, y);
  line(x, y + beginOffset, x, y + endOffset);
  line(x, y - beginOffset, x, y - endOffset);
  circle(x, y, beginOffset*2);
  pop();
}

function drawZoomRect(bbox) {
  push();
  stroke(255, 0, 0);
  noFill();
  rect(bbox.left, bbox.top, bbox.width, bbox.height);
  pop();
}

function draw() {
  clear();
  if (imgView !== undefined) {
    let zoomScreenBbox = imgView.toScreenBbox(
      windowWidth, windowHeight,
      zoomSettings.zoom, zoomSettings.panX, zoomSettings.panY);
    image(img,
      zoomScreenBbox.left, zoomScreenBbox.top,
      zoomScreenBbox.width, zoomScreenBbox.height);
  }

  if (crosshairSettings.crosshairEnabled) {
    drawCrosshair({
      x: mouseX, y: mouseY,
      beginOffset: crosshairSettings.crosshairRadius,
      endOffset: crosshairSettings.crosshairLinesEnd,
      colorHexStr: crosshairSettings.crosshairColor,
    });
  }
}

function windowResized() {
  const css = getComputedStyle(canvas.parentElement),
        mw = float(css.marginLeft) + float(css.marginRight),
        mh = float(css.marginTop)  + float(css.marginBottom),
        ww = float(css.width)  || windowWidth,
        wh = float(css.height) || windowHeight,
        w = ceil(ww - mw) | 0, h = ceil(wh - mh) | 0;
  print(`Resize ${windowWidth}, ${windowHeight}`)
  resizeCanvas(windowWidth, windowHeight);
}

function mouseDragged() {
  if (mouseButton === RIGHT) {
    zoomSettings.panX -= movedX/img.width/zoomSettings.zoom;
    zoomSettings.panY -= movedY/img.height/zoomSettings.zoom;
  }
}