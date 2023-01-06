let img;
let localization;
var started = false;
var imgView;
var zoom = 1;
var zoomSensitivity = 0.0005;

let generalSettings = new function() {
  this.crosshairEnabled = true;
  this.language = 'ENG';
  this.openImageFiles = function(){ document.getElementById('file-input').click() };
}();

let crosshairSettings = new function() {
  this.crosshairEnabled = true;
  this.crosshairLinesEnd = 10;
  this.crosshairRadius = 10;
  this.crosshairColor = [255, 0, 0];
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
    this.seenX = 0;
    this.seenY = 0;
    this.seenWidth = imageWidth;
    this.seenHeight = imageHeight;
  }

  // translate(x, y) {
  //   this.seenLeft += x;
  //   this.seenRight += x;
  //   this.seenTop += y;
  //   this.seenBottom += y;
  // }

  // getScreenPosition(screenWidth, screenHeight) {
  //   return {
  //     left: max(0, screenWidth/2-this.seenLeft),
  //     right: min(screenWidth, screenWidth/2+this.seenRight),
  //     top: max(0, screenHeight/2-this.seenTop),
  //     bottom: min(screenHeight, screenHeight/2+this.seenBottom),
  //   }
  // }

  zoomTo(screenX, screenY, zoomDelta, screenWidth, screenHeight) {
    let screenAdjustX = screenX / screenWidth;
    let screenAdjustY = screenY / screenHeight;
    print(screenAdjustX, screenAdjustY)
    this.seenWidth -= this.imageWidth*zoomDelta;
    this.seenX += this.seenWidth*screenAdjustX*zoomDelta;
    this.seenHeight -= this.imageHeight*zoomDelta;
    this.seenY += this.seenHeight*screenAdjustY*zoomDelta;
  }

  toString() {
    return `X=${this.seenX} W=${this.seenWidth} Y=${this.seenY} H=${this.seenHeight}`;
  }
}

function setupGui(gui, panel) {
  let savedGui = undefined;
  if (gui !== undefined) {
    savedGui = gui.getSaveObject();
    gui.destroy();
  }
  dat.GUI.TEXT_CLOSED = getLocalized('closeControls');
  dat.GUI.TEXT_OPEN = getLocalized('openControls');
  gui = new dat.GUI(load=savedGui, autoPlace=false);
  gui.width = 300;
  gui.add(panel, 'language', ['RUS', 'ENG'])
    .name(getLocalized('language'))
    .onFinishChange(
      function(){
        panel.language = this.getValue();
        setupGui(gui, panel);
      }
    );

  let addCrosshairFolder = function(gui) {
    let crosshairFolder = gui.addFolder(getLocalized('crosshairFolder'));
    crosshairFolder.add(crosshairSettings, 'crosshairEnabled')
      .name(getLocalized('crosshairEnabled'))
    crosshairFolder.add(crosshairSettings, 'crosshairLinesEnd', 1, 50)
      .name(getLocalized('crosshairLinesEnd'));
    crosshairFolder.add(crosshairSettings, 'crosshairRadius', 0, 50)
      .name(getLocalized('crosshairRadius'));
    crosshairFolder.addColor(crosshairSettings, 'crosshairColor')
      .name(getLocalized('crosshairColor'));
    return crosshairFolder;
  };
  addCrosshairFolder(gui);

  gui.add(panel, 'openImageFiles')
    .name(getLocalized('openImageFiles'));

  document.title = getLocalized('title');
  return gui;
}

function mouseWheel(event) {
  zoom += zoomSensitivity*event.delta; // * exp(zoom) * event.delta;
  // zoom = constrain(zoom, zoomMin, zoomMax);
  imgView.zoomTo(mouseX, mouseY, -zoomSensitivity*event.delta, windowWidth, windowHeight);
  print(zoom, imgView.toString())
  return false;
}

function preload() {
  const response = fetch('./localization.json');
  response
    .then((response) => response.json())
    .then((data) => localization = data);
  img = loadImage('assets/example_trees/000001.jpg');
}
function setup() {
  print(img.width, img.height)
  createCanvas(windowWidth, windowHeight);
  windowResized();

  var gui = setupGui(gui, generalSettings);
  imgView = new ImageAABBView(img.width, img.height);
}

function drawCrosshair(x, y, beginOffset, endOffset, colorRgbArray) {
  push();
  noFill();
  stroke(...colorRgbArray);
  strokeWeight(3);
  strokeCap(SQUARE);
  line(x + beginOffset, y, x + endOffset, y);
  line(x - beginOffset, y, x - endOffset, y);
  line(x, y + beginOffset, x, y + endOffset);
  line(x, y - beginOffset, x, y - endOffset);
  circle(x, y, beginOffset*2);
  pop();
}

function draw() {
  clear();
  image(img,
    0, 0,
    windowWidth, windowHeight,
    imgView.seenX, imgView.seenY,
    // img.width, img.height,
    imgView.seenWidth, imgView.seenHeight,
    CONTAIN);

  if (crosshairSettings.crosshairEnabled) {
    drawCrosshair(mouseX, mouseY,
      beginOffset=crosshairSettings.crosshairRadius,
      endOffset=crosshairSettings.crosshairLinesEnd,
      colorRgbArray=crosshairSettings.crosshairColor,
      );
  }

}

function windowResized() {
  const css = getComputedStyle(canvas.parentElement),
        mw = float(css.marginLeft) + float(css.marginRight),
        mh = float(css.marginTop)  + float(css.marginBottom),
        ww = float(css.width)  || windowWidth,
        wh = float(css.height) || windowHeight,
        w = ceil(ww - mw) | 0, h = ceil(wh - mh) | 0;
        // resizeCanvas(w, h);
  print(`Resize ${windowWidth}, ${windowHeight}`)
  resizeCanvas(windowWidth, windowHeight);
}