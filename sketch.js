const h = 270;
const w = 480;

let iterations;
let heightCorrection;
let offsets = [];

let loopFrameCountText;

/* utils */
const gcd = (a, b) => a ? gcd(b % a, a) : b;
const lcm = (a, b) => a * b / gcd(a, b);

/* sliders */
let sliders = {};

/* color pickers */
let backgroundColorPicker, waveColorPicker, dotColorPicker, curveFillColorPicker;

/* checkboxes */
let enableOffsetsCheckbox, enableLinesCheckbox, enableCirclesCheckbox, enableAmplitudeAnimationCheckbox, enableSecondaryAnimationCheckbox, evenSamplingCheckbox, renderCurveFillCheckbox, upsampleExportCheckbox, useSecondaryWaveCheckbox;

/* radio */
let curveRadio;

let secondarySineSettings;

const data = {};

const sketch = (p) => {
  p.setup = (gfx = p) => {
    gfx.frameRate(24);
    gfx.colorMode(gfx.HSB);
    let canvas = gfx.createCanvas(w, h);

    sliders = {};

    // UI GROUPS ///////////////////////////////////////////////////////////////////////
    let FPSDisplay = gfx.createP();
    setInterval(() => { FPSDisplay.html("FPS: " + gfx.frameRate()) }, 1000);

    enableAmplitudeAnimationCheckbox = gfx.createCheckbox("Animate Amplitude", false);
    enableSecondaryAnimationCheckbox = gfx.createCheckbox("Animate Secondary Amplitude", false);
    useSecondaryWaveCheckbox = gfx.createCheckbox("Enable Secondary Wave");
    secondarySineSettings = createSineSettings("secondaryWave");
    let waveSettings = createSection("Wave Settings", [
      createLabeledSlider("Spacing", "spacing", 1, p.ceil(h / 2), 6, 1),
      createLabeledSlider("Amplitude Delay", "amplitudeDelay", -0.1, 0.1, 0.000, 0.002),
      createLabeledSlider("Sampling Frequency", "lineSharpness", 1, p.width, p.width * 0.99, 1),
      evenSamplingCheckbox = gfx.createCheckbox("Even Sampling", false),
      createSineSettings("mainWave"),
      enableAmplitudeAnimationCheckbox,
      useSecondaryWaveCheckbox,
      secondarySineSettings,
      enableSecondaryAnimationCheckbox,
    ]);

    enableOffsetsCheckbox = gfx.createCheckbox("Animate Offsets", false);
    let horizontalWaveOffsets = createSection("Horizontal Wave Offsets", [
      createLabeledSlider("Vertical Offset", "offsetOffset", 0, h, 0.05, 0.01),
      createSineSettings("offset"),
      enableOffsetsCheckbox,
    ]);

    // Shape style
    let shapeStyle = createSection("Shape Style", [
      createLabeledSlider("Line Thickness", "lineThickness", 0.1, 10, 1.5, 0.1),
      createLabeledSlider("Curve Tightness", "curveTightness", -5, 5, 0, 0.01),
      createLabeledSlider("Circle Radius", "circleRadius", 0.5, 50, 5, 0.5),
      createLabeledSlider("Opacity", "alphaChannel", 0, 1, 0.9, 0.001),
    ]);

    let radioDiv = gfx.createDiv();
    gfx.createP("Render Mode").parent(radioDiv);
    curveRadio = gfx.createRadio();
    curveRadio.option('line');
    curveRadio.option('curve');
    curveRadio.selected('line');
    curveRadio.parent(radioDiv);
    enableLinesCheckbox = gfx.createCheckbox("Render Curves", true);
    renderCurveFillCheckbox = gfx.createCheckbox("Render Curve Fill", false);
    enableCirclesCheckbox = gfx.createCheckbox("Render Circles", false);
    let renderSettings = createSection("Render Settings", [enableLinesCheckbox, renderCurveFillCheckbox, enableCirclesCheckbox, radioDiv]);

    backgroundColorPicker = gfx.createColorPicker(gfx.color('black'));
    waveColorPicker = gfx.createColorPicker(gfx.color('green'));
    dotColorPicker = gfx.createColorPicker(gfx.color('orange'));
    curveFillColorPicker = gfx.createColorPicker(gfx.color('pink'));
    let colorSettings = createSection("Color Settings", [
      createColorPickerDiv("Background Color", backgroundColorPicker),
      createColorPickerDiv("Wave Color", waveColorPicker),
      createColorPickerDiv("Dot Color", dotColorPicker),
      createColorPickerDiv("Fill Color", curveFillColorPicker),
      createLabeledSlider("Wave Hue Shift", "hueShift", -5, 5, 0, 0.01),
    ]);

    // export
    upsampleExportCheckbox = gfx.createCheckbox("Upscale when exporting", true);

    let buttonGIF = gfx.createButton('Download GIF loop');
    buttonGIF.mousePressed(() => gfx.saveGif('mySketch', getLoopLength(), { units: 'frames', notificationDuration: 3 }));
    loopFrameCountText = gfx.createP();
    let gifSection = createSubSection('GIF', [loopFrameCountText, buttonGIF]);

    let buttonSVG = gfx.createButton('Download SVG');
    buttonSVG.mousePressed(() => {
      const svgGfx = p.createGraphics(p.width, p.height, p.SVG);
      p.draw(svgGfx);
      svgGfx.save("drawing.svg");
    });
    let svgSection = createSubSection('SVG', [buttonSVG]);

    let buttonPNGqHD = gfx.createButton('Download qHD PNG');
    buttonPNGqHD.mousePressed(() => savePNG(2, false));
    let buttonPNGFHD = gfx.createButton('Download Full HD PNG');
    buttonPNGFHD.mousePressed(() => savePNG(4, false));
    let buttonPNG4K = gfx.createButton('Download 4K PNG');
    buttonPNG4K.mousePressed(() => savePNG(8, false));
    let pngSection = createSubSection('PNG', [buttonPNGqHD, buttonPNGFHD, buttonPNG4K]);

    let buttonPNGqHDSeq = gfx.createButton('Download qHD PNG sequence');
    buttonPNGqHDSeq.mousePressed(() => savePNG(2, true));
    let buttonPNGFHDSeq = gfx.createButton('Download Full HD PNG sequence');
    buttonPNGFHDSeq.mousePressed(() => savePNG(4, true));
    let buttonPNG4KSeq = gfx.createButton('Download 4K PNG sequence');
    buttonPNG4KSeq.mousePressed(() => savePNG(8, true));
    let pngSeqSection = createSubSection('PNG Sequence', [buttonPNGqHDSeq, buttonPNGFHDSeq, buttonPNG4KSeq]);

    let buttonJSON = gfx.createButton('Download JSON');
    buttonJSON.mousePressed(() => gfx.saveJSON(data, 'sine-stacker-data.json'));
    let jsonExportSection = createSubSection('JSON', [buttonJSON]);

    let exportSection = createSection("Export", [
      upsampleExportCheckbox,
      gifSection,
      svgSection,
      pngSection,
      pngSeqSection,
      jsonExportSection,
    ]);

    let fileInput = gfx.createFileInput(loadParameters);
    let importSection = createSection("Import", [fileInput]);

    // UI GROUPS ^^ /////////////////////////////////////////////////////////////////////

    let canvasSection = createSection("", [
      canvas,
      FPSDisplay,
    ], false);

    let settingsSection = createFlexSection("", [
      canvasSection,
      waveSettings,
      horizontalWaveOffsets,
      shapeStyle,
      renderSettings,
      colorSettings,
      exportSection,
      importSection,
    ], false, false, "#191919");

    gfx.createButton('About').mousePressed(() => alert('Author: Vojtěch Hyánek\nCreated at FI MU as a part of the PV097 course\nSemester "Spring 2025"'))
  };

  function createSection(title, elements, border = true, background = '#222') {
    const section = p.createDiv().style('margin', '9px 4px').style('padding', '10px').style('width', 'fit-content').style('height', 'fit-content');
    if (border) section.style('border', '1px solid #666');
    section.style('background', background).style('color', '#ddd').style('border-radius', '8px');

    p.createElement('h3', title).parent(section).style('margin-bottom', '10px').style('margin-top', '0px').style('font-size', '16px');

    elements.forEach(el => {
      if (el.parent) el.parent(section);
    });
    return section;
  }

  function createFlexSection(title, elements, border = true, margin = true, background = '#222') {
    const section = p.createDiv().style('padding', '10px').style('width', 'fit-content').style('height', 'fit-content').style("display", "flex").style("flex-wrap", "wrap");
    if (border) section.style('border', '1px solid #666');
    if (margin) section.style('margin', '9px 4px');
    section.style('background', background).style('color', '#ddd').style('border-radius', '8px');

    p.createElement('h3', title).parent(section).style('margin-bottom', '10px').style('margin-top', '0px').style('font-size', '16px');

    elements.forEach(el => {
      if (el.parent) el.parent(section);
    });
    return section;
  }

  function createSubSection(title, elements) {
    const section = p.createDiv().style('margin', '15px 0').style('padding', '10px').style('border', '1px solid #666');
    section.style('background', '#333').style('color', '#ddd').style('border-radius', '8px');

    p.createElement('h3', title).parent(section).style('margin-bottom', '10px').style('margin-top', '0px').style('font-size', '16px');

    elements.forEach(el => {
      if (el.parent) el.parent(section);
    });
    return section;
  }

  function createColorPickerDiv(title, colorPicker) {
    let pickerDiv = p.createDiv().style("gap", "5px").style("display", "flex").style("align-items", "center");
    colorPicker.parent(pickerDiv);
    p.createP(title).parent(pickerDiv);
    return pickerDiv;
  }

  function createLabeledSlider(label, key, min, max, value, step, prefix = "") {
    key = prefix + key;
    const wrapper = p.createDiv().style("margin-bottom", "5px").style("gap", "5px").style("display", "flex").style("align-items", "center");
    const slider = p.createSlider(min, max, value, step).parent(wrapper);
    p.createSpan(label + ": ").parent(wrapper).style("margin-right", "5px");
    const valueSpan = p.createSpan("").parent(wrapper);

    sliders[key] = {
      slider,
      valueSpan,
      key,
      get value() {
        return slider.value();
      },
      updateLabel() {
        valueSpan.html(p.nf(slider.value(), 1, 3));
      },
      updateValue() {
        data[key] = slider.value();
      },
      changeSlider(val) {
        slider.value(val);
      }
    };

    return wrapper;
  }

  function createSineSettings(name = "Wave",) {
    return createSubSection(name + " Settings", [
      createLabeledSlider("Amplitude Multiplier", "AmplitudeMultiplier", 0, 150, 10, 0.1, name),
      createLabeledSlider("Amplitude Speed", "AmplitudeSpeed", 10, 500, 100, 10, name),
      createLabeledSlider("Frequency", "Frequency", 0, 0.3, 0.05, 0, name),
      createLabeledSlider("Progress", "Progress", 0, 1, 0.3, 0, name),
    ]);
  }

  p.draw = (gfx = p, renderingLoop = false) => {
    // set this to correctly render images (PNG, SVG)
    gfx.colorMode(gfx.HSB);

    // update parameters from sliders
    Object.values(sliders).forEach(s => s.updateLabel());
    Object.values(sliders).forEach(s => s.updateValue());

    data.backgroundColor = p.color(backgroundColorPicker.value());
    data.waveColor = p.color(waveColorPicker.value());
    data.dotColor = p.color(dotColorPicker.value());
    data.curveFillColor = p.color(curveFillColorPicker.value());
    data.enableOffsets = enableOffsetsCheckbox.checked();
    data.enableLines = enableLinesCheckbox.checked();
    data.enableCircles = enableCirclesCheckbox.checked();
    // need to put w here to not undersample in higher resolutions
    data.lineSharpness = w + 1 - data.lineSharpness;
    data.enableAmplitudeAnimation = enableAmplitudeAnimationCheckbox.checked();
    data.enableSecondaryAnimation = enableSecondaryAnimationCheckbox.checked();
    data.evenSampling = evenSamplingCheckbox.checked();
    data.renderCurveFill = renderCurveFillCheckbox.checked();
    data.waveColor.setAlpha(data.alphaChannel);
    data.dotColor.setAlpha(data.alphaChannel);
    data.curveFillColor.setAlpha(data.alphaChannel);
    data.lineRenderMode = curveRadio.value();
    data.upsampleExport = upsampleExportCheckbox.checked();
    data.useSecondaryWave = useSecondaryWaveCheckbox.checked();

    if (data.useSecondaryWave) {
      secondarySineSettings.show();
      enableSecondaryAnimationCheckbox.show();
    } else {
      secondarySineSettings.hide();
      enableSecondaryAnimationCheckbox.hide();
    }

    // for rendering images of different sizes
    if (!renderingLoop) {
      if (data.upsampleExport) {
        gfx.scale(gfx.width / w, gfx.height / h);
      }
    }

    gfx.background(data.backgroundColor);

    iterations = (data.upsampleExport) 
      ? gfx.int(h + data.mainWaveAmplitudeMultiplier * data.secondaryWaveAmplitudeMultiplier * 2)
      : gfx.int(gfx.height + data.mainWaveAmplitudeMultiplier * data.secondaryWaveAmplitudeMultiplier * 2);
    offsets = new Array(iterations + 1);
    heightCorrection = -data.mainWaveAmplitudeMultiplier * data.secondaryWaveAmplitudeMultiplier;

    loopFrameCountText.html("GIF loop frame count (least common multiple of Offset Speed and Amplitude Speed): <b>" + getLoopLength() + "</b>")

    drawWaves(gfx, data, offsets, iterations, heightCorrection);

    if (data.enableOffsets) {
      data.offsetCounter++;
      sliders["offsetProgress"].slider.value(gfx.map(data.offsetCounter % data.offsetAmplitudeSpeed, 0, data.offsetAmplitudeSpeed, 0, 1));
    } else {
      data.offsetCounter = gfx.map(sliders["offsetProgress"].slider.value(), 0, 1, 0, data.offsetAmplitudeSpeed);
    };

    if (data.enableAmplitudeAnimation) {
      data.mainWaveCounter++;
      sliders["mainWaveProgress"].slider.value(gfx.map(data.mainWaveCounter % data.mainWaveAmplitudeSpeed, 0, data.mainWaveAmplitudeSpeed, 0, 1));
    } else {
      data.mainWaveCounter = gfx.map(sliders["mainWaveProgress"].slider.value(), 0, 1, 0, data.mainWaveAmplitudeSpeed);
    };

    if (data.enableSecondaryAnimation) {
      data.secondaryWaveCounter++;
      sliders["secondaryWaveProgress"].slider.value(gfx.map(data.secondaryWaveCounter % data.secondaryWaveAmplitudeSpeed, 0, data.secondaryWaveAmplitudeSpeed, 0, 1));
    } else {
      data.secondaryWaveCounter = gfx.map(sliders["secondaryWaveProgress"].slider.value(), 0, 1, 0, data.secondaryWaveAmplitudeSpeed);
    };
  };

  function loadParameters(file) {
    Object.assign(data, file.data);
    Object.values(sliders).forEach(s => {
      s.changeSlider(data[s.key])
    });

    backgroundColorPicker.value(colorToCss(file.data.backgroundColor));
    waveColorPicker.value(colorToCss(file.data.waveColor));
    dotColorPicker.value(colorToCss(file.data.dotColor));
    curveFillColorPicker.value(colorToCss(file.data.curveFillColor));
    enableOffsetsCheckbox.checked(data.enableOffsets);
    enableLinesCheckbox.checked(data.enableLines);
    enableCirclesCheckbox.checked(data.enableCircles);
    sliders.lineSharpness.slider.value(w + 1 - data.lineSharpness);
    enableAmplitudeAnimationCheckbox.checked(data.enableAmplitudeAnimation);
    enableSecondaryAnimationCheckbox.checked(data.enableSecondaryAnimation);
    evenSamplingCheckbox.checked(data.evenSampling);
    useSecondaryWaveCheckbox.checked(data.useSecondaryWave);

    data.mainWaveCounter = data.mainWaveProgress;
    data.secondaryWaveCounter = data.secondaryWaveProgress;
    data.offsetCounter = data.offsetProgress;

    renderCurveFillCheckbox.checked(data.renderCurveFill);
    curveRadio.value(data.lineRenderMode);
    upsampleExportCheckbox.checked(data.upsampleExport);

    curveRadio.selected(data.lineRenderMode);
  }

  function getLoopLength() {
    return [
      (data.enableOffsets) ? data.offsetAmplitudeSpeed : 1,
      (data.enableAmplitudeAnimation) ? data.mainWaveAmplitudeSpeed : 1,
      (data.enableSecondaryAnimation) ? data.secondaryWaveAmplitudeSpeed : 1,
    ].reduce(lcm);
  }

  function savePNG(pngScaleFactor, loop) {
    const pngGfx = p.createGraphics(w * pngScaleFactor / 2, h * pngScaleFactor / 2);
    let frames = loop ? getLoopLength() : 1;
    if (loop && data.upsampleExport) pngGfx.scale(pngGfx.width / w, pngGfx.height / h);
    for (let i = 0; i < frames; i++) {
      p.draw(pngGfx, loop);
      pngGfx.save("drawing.png");
    }
  }

  function colorToCss(colorObject) {
    return '#' + colorObject.levels
      .slice(0, 3)
      .map(c => c.toString(16).padStart(2, '0'))
      .join('');
  }
};

function drawWaves(p, data, offsets, iterations, heightCorrection) {
  p.curveTightness(data.curveTightness);
  for (let i = 0; i < offsets.length; i++) {
    let speedNorm = p.sin((data.offsetCounter * p.TWO_PI) / data.offsetAmplitudeSpeed % p.TWO_PI) * data.offsetAmplitudeMultiplier;
    offsets[i] = speedNorm * p.sin((i + data.offsetOffset) * data.offsetFrequency);
    offsets[i] = sampleSineWave(data.offsetOffset, data.offsetAmplitudeSpeed, data.offsetAmplitudeMultiplier, data.offsetCounter, data.offsetFrequency, i);
  }
  p.strokeWeight(data.lineThickness);
  p.colorMode(p.HSB);

  let strokeColor = data.waveColor;
  // assuming 360 is hue max value
  let hueIncrement = (360 * data.hueShift) / (iterations / data.spacing);
  for (let y = iterations; y > 0; y -= data.spacing) {
    p.stroke(strokeColor);
    strokeColor = p.color(modulo(p.hue(strokeColor) + hueIncrement, 360), p.saturation(strokeColor), p.brightness(strokeColor));
    strokeColor.setAlpha(data.alphaChannel);

    if (data.renderCurveFill) {
      p.fill(data.curveFillColor);
    } else {
      p.noFill();
    }
    let vertices = [];
    let rightmost = p.ceil(p.max(offsets));
    p.beginShape();
    // 2 * sharpness because curve doesn't render first and last point
    let start = data.evenSampling ? -data.lineSharpness : modulo(offsets[y], data.lineSharpness) - 2 * data.lineSharpness;
    for (let x = start; x <= p.width + rightmost + 2 * data.lineSharpness; x += data.lineSharpness) {
      let vertexX = x;
      let mainWave = sampleSineWave(offsets[y], data.mainWaveAmplitudeSpeed, data.mainWaveAmplitudeMultiplier, data.mainWaveCounter, data.mainWaveFrequency, x, y, heightCorrection);
      let vertexY = !data.useSecondaryWave ? mainWave
        : ((mainWave - y - heightCorrection)
          * (sampleSineWave(offsets[y], data.secondaryWaveAmplitudeSpeed, data.secondaryWaveAmplitudeMultiplier, data.secondaryWaveCounter, data.secondaryWaveFrequency, x, y, heightCorrection) - y - heightCorrection)
          + y + heightCorrection);
      vertices.push(vertexX); vertices.push(vertexY);
      if (data.enableLines) {
        if (data.lineRenderMode == 'line') { p.vertex(vertexX, vertexY); } else { p.curveVertex(vertexX, vertexY); }
      }
    }
    p.endShape();

    for (let i = 0; i < vertices.length; i += 2) {
      if (data.enableCircles) {
        drawCircle(vertices[i], vertices[i + 1], data.circleRadius, data, p);
      }
    }
  }

  function simpleAmplitude(y, speed, multiplier, counter) {
    return p.sin((counter * p.TWO_PI) / speed % p.TWO_PI + (y * data.amplitudeDelay)) * multiplier;
  }

  function sampleSineWave(offset, speed, multiplier, counter, frequency, x, y = 0, yShift = 0) {
    return simpleAmplitude(y, speed, multiplier, counter) * p.sin((x + offset) * frequency) + y + yShift;
  }

  function drawCircle(x, y, radius, data, p) {
    p.noStroke();
    p.fill(data.dotColor);
    p.circle(x, y, radius);
    p.stroke(strokeColor);
    p.noFill()
  }

  function modulo(n, d) {
    return ((n % d) + d) % d;
  }
}

new p5(sketch);
