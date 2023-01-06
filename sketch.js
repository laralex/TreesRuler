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
  this.crosshairColor = '#ff0000';
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

  toScreenBbox(screenWidth, screenHeight) {
    return {
      left: screenWidth/2-this.imageWidth/2-this.seenX,
      width: this.imageWidth,
      top: screenHeight/2-this.imageHeight/2-this.seenY,
      height: this.imageHeight,
    }
    // return {
    //   left: max(0, screenWidth/2-this.seenLeft),
    //   right: min(screenWidth, screenWidth/2+this.seenRight),
    //   top: max(0, screenHeight/2-this.seenTop),
    //   bottom: min(screenHeight, screenHeight/2+this.seenBottom),
    // }
  }

  zoomTo(screenX, screenY, zoomDelta, screenWidth, screenHeight) {
    {
      let screenAdjustX = screenX / screenWidth;
      let currWidth = float(this.seenWidth);
      this.seenWidth -= currWidth*zoomDelta*(2*screenAdjustX - 1);
      this.seenX += currWidth*screenAdjustX*zoomDelta;
    }
    {
      let screenAdjustY = screenY / screenHeight;
      let currHeight = float(this.seenHeight);
      this.seenHeight -= currHeight*zoomDelta*(2*screenAdjustY - 1);
      this.seenY += currHeight*screenAdjustY*zoomDelta;
    }

    // if (this.seenX < 0) {
    //   this.seenWidth += Math.abs(this.seenX);
    // }
    // if (this.seenX > screenWidth) {
    //   this.seenWidth -= Math.abs(screenWidth-this.seenX);
    // }
    // if (this.seenY < 0) {
    //   this.seenHeight += Math.abs(this.seenY);
    // }
    // if (this.seenY > screenHeight) {
    //   this.seenHeight -= Math.abs(screenHeight-this.seenY);
    // }
  }

  toString() {
    return `X=${this.seenX} W=${this.seenWidth} Y=${this.seenY} H=${this.seenHeight}`;
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
    theme: 'light', // dark, light, yorha, or theme object
    align: 'right', // left, right
    width: 500,
    barMode: 'offset', // none, overlay, above, offset
    panelMode: 'inner',
    panelOverflowBehavior: 'scroll',
    pollRateMs: 500,
    opacity: 1.0,
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
      label: getLocalized('crosshairFolder'),
      open: false
    },

    {
      type: 'button',
      label: getLocalized('openImageFiles'),
      object: this,
      // property: 'file',
      action: () => {
        gui.Toast('>>> Opened a file');
        generalSettings.openImageFiles();
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
        print(element.ariaLabel);
        element.innerText = getLocalized('controls');
      }
  }

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
  imageInfo.imageSizeStr = `${img.width} x ${img.height}`;
  createCanvas(windowWidth, windowHeight);
  windowResized();

  var gui = setupGui(gui, generalSettings);
  imgView = new ImageAABBView(img.width, img.height);
}

function drawCrosshair(x, y, beginOffset, endOffset, colorHexStr) {
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

function drawZoomRect() {
  push();
  stroke(255, 0, 0);
  noFill();
  let zoomScreenBbox = imgView.toScreenBbox(windowWidth, windowHeight);
  // print(zoomScreenBbox);
  rect(zoomScreenBbox.left, zoomScreenBbox.top, zoomScreenBbox.width, zoomScreenBbox.height);
  pop();
}

function draw() {
  clear();
  let zoomScreenBbox = imgView.toScreenBbox(windowWidth, windowHeight);
  image(img,
    zoomScreenBbox.left, zoomScreenBbox.top, zoomScreenBbox.width, zoomScreenBbox.height
    );
    // imgView.seenX, imgView.seenY,
    // // img.width, img.height,
    // imgView.seenWidth, imgView.seenHeight);

  drawZoomRect();

  if (crosshairSettings.crosshairEnabled) {
    drawCrosshair(mouseX, mouseY,
      beginOffset=crosshairSettings.crosshairRadius,
      endOffset=crosshairSettings.crosshairLinesEnd,
      colorHexStr=crosshairSettings.crosshairColor,
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