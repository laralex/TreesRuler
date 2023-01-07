'use strict';

let img;
let localization;
var imgView;

let generalSettings = new function() {
  this.crosshairEnabled = true;
  this.language = 'RUS';
  this.guiOpacity = 0.9;
  this.guiWidth = 275;
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
  this.x = 0;
  this.y = 0;
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

  toScreenBbox(screenWidth, screenHeight, zoomSettings) {
    let width = this.imageWidth*zoomSettings.zoom;
    let height = this.imageHeight*zoomSettings.zoom;
    return {
      left: screenWidth/2-width/2 - zoomSettings.x*width,
      width: width,
      top: screenHeight/2-height/2 - zoomSettings.y*height,
      height: height,
    }
  }
}

var file = null;
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
    panelOverflowBehavior: 'overflow',
    pollRateMS: 750,
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
      property: 'file',
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
      options: [275, 350, 600],
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
      property: 'x'
    },
    {
      type: 'range',
      label: getLocalized('zoomY'),
      min: -0.5, max: 0.5, step: 0.01,
      property: 'y'
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
  zoomSettings.x = 0;
  zoomSettings.y = 0;
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
    print('Loaded image', uri.slice(0, 100));
  });
  
}

function preload() {
  localization = loadJSON('./localization.json');
}

function setup() {
  createCanvas(windowWidth, windowHeight);
  windowResized();
  var gui = setupGui(gui, generalSettings);
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
  if (img !== undefined) {
    let zoomScreenBbox = imgView.toScreenBbox(windowWidth, windowHeight, zoomSettings);
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