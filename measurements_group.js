
function tryCatch(func, failFunc) {
   try { return func() }
   catch(e) { return failFunc(e) }
}

function loadMeasurementsPreset(guifyInstance, measurementsGuiComposer, imageWidth, imageHeight) {
   measurementsGuiComposer.removeAllGroups(guifyInstance);
   const halfW = imageWidth / 2, halfH = imageHeight / 2;
   const dx = imageWidth*0.03, dy = imageHeight*0.03;
   const height1p3 = imageHeight - dy;
   const makeLine = function(x0, y0, x1, y1, denotation, boundBegin, boundEnd) {
      return {
      begin: createVector(x0, y0),
      end: createVector(x1, y1),
      denotationOverride: denotation || null,
      boundBegin: boundBegin || null,
      boundEnd: boundEnd || null,
      };
   }

   const heightDefaultMeasures = [
      makeLine(halfW, imageHeight - dy, halfW, dy, 'H'),
      makeLine(halfW+dx, imageHeight - dy, halfW + dx, height1p3, 'h_d'),
      makeLine(halfW+dx, imageHeight - dy, halfW + dx, height1p3, 'h_Dk'),
   ];
   const crownDefaultMeasures = [
      makeLine(dx, halfH, imageWidth - dx, halfH, 'Dk'),
      makeLine(halfW, imageHeight - dy, halfW, dy, 'D_d'),

   ]
   measurementsGuiComposer.newGroup(guifyInstance, getLocalized('measuresFolder'),
      getLocalized('heightMeasurementsGroup'),
      'H', heightDefaultMeasures[0], heightDefaultMeasures.slice(1));
   measurementsGuiComposer.newGroup(guifyInstance, getLocalized('measuresFolder'),
      getLocalized('crownDiameterMeasurementsGroup'),
      'D', {
      begin: createVector(),
      end: createVector()
      });
   measurementsGuiComposer.newGroup(guifyInstance, getLocalized('measuresFolder'),
      getLocalized('truckDiameterMeasurementsGroup'),
      'd', {
      begin: createVector(halfW - dy, height1p3),
      end: createVector(halfW + dy, height1p3)
      }, [
      {
         begin: createVector(halfW - imageWidth*0.03, imageHeight - imageHeight*0.05),
         end: createVector(halfW + imageWidth*0.03, imageHeight - imageHeight*0.05)
      }
      ]);
}

class MeasureGroupGuiComposer {
   static groupsDefaults = [
     { color: '#ff5e5e', denotation: 'a' },
     { color: '#fda703', denotation: 'b' },
     { color: '#0cff03', denotation: 'c' },
     { color: '#03b4ff', denotation: 'd' },
     { color: '#ff5ce4', denotation: 'e' },
     { color: '#ff0000', denotation: 'A' },
     { color: '#00ffff', denotation: 'B' },
     { color: '#0000ff', denotation: 'C' },
     { color: '#aaaaaa', denotation: 'D' },
     { color: '#ffffff', denotation: 'E' },
   ];
 
   constructor() {
     this.groups = [];
     this.nextDefaultIndex = 0;
     this.viewGuiObjects = {};
     this.viewMeasure = null;
     this.dummyVariable = null;
     this.dummyString = '<STUB>';
     this.boundMeasures = new Map();
     this.removeAllGroups();
   }
 
   getViewedMeasurement() {
     return this.viewMeasure;
   }
 
   viewGuiSetEnabled(isEnabled, isRemoveEnabled){
     Object.values(this.viewGuiObjects).forEach(guiObj => guiObj.SetEnabled(isEnabled));
     this.viewGuiObjects.removeButton.SetEnabled(isRemoveEnabled);
   }
 
   viewMeasurement(measurementBoundData, isRemovable) {
     this.viewMeasure = measurementBoundData;
     print('Selected measurement');
 
     if (measurementBoundData === null) {
       this.viewGuiSetEnabled(false);
       return;
     }
     this.viewGuiSetEnabled(true, isRemovable);
     const boundMap = {
       x0: {object: measurementBoundData.begin, property: 'x'},
       y0: {object: measurementBoundData.begin, property: 'y'},
       x1: {object: measurementBoundData.end, property: 'x'},
       y1: {object: measurementBoundData.end, property: 'y'},
       relativeLength: {object: measurementBoundData, property: 'relativeLength'},
       absoluteLength: {object: measurementBoundData, property: 'absoluteLength'},
       denotationOverride: {object: measurementBoundData, property: 'denotationOverride'},
     }
     print(measurementBoundData.denotationOverride);
     for(const [key, mapping] of Object.entries(boundMap)) {
       this.viewGuiObjects[key].binding.object = mapping.object;
       this.viewGuiObjects[key].binding.property = mapping.property;
       this.viewGuiObjects[key].removeAllListeners('input');
       this.viewGuiObjects[key].on("input", (data) => {
         if(mapping.object && mapping.property) {
            mapping.object[mapping.property] = data;
         }
         if(mapping.onChange) {
            mapping.onChange(data);
         }
      });
     }

     print('@', this.viewGuiObjects.denotationOverride);
   }
 
   updateViewGui(imageWidth, imageHeight) {
     this.viewGuiObjects.x0.max = this.viewGuiObjects.x0.maxPos = this.viewGuiObjects.x0.input.max = imageWidth;
     this.viewGuiObjects.x1.max = this.viewGuiObjects.x1.maxPos = this.viewGuiObjects.x1.input.max = imageWidth;
     this.viewGuiObjects.y0.max = this.viewGuiObjects.y0.maxPos = this.viewGuiObjects.y0.input.max = imageHeight;
     this.viewGuiObjects.y1.max = this.viewGuiObjects.y1.maxPos = this.viewGuiObjects.y1.input.max = imageHeight;
   }
 
   addViewGui(guifyInstance, viewFolder, imageWidth, imageHeight) {
     const definitions = {
       label: {
         type: 'display',
         label: '',
         initial: getLocalized('guiSelectedMeasure'),
       },
       denotationOverride: {
         type: 'text',
         label: getLocalized('measureDenotation'),
         object: this, property: 'dummyString',
         onChange: (data) => {},
         onInitialize: (data) => {},
       },
       x0 : {
         type: 'range',
         label: getLocalized('beginPointX'),
         min: 0, max: imageWidth, step: 1,
         object: this, property: 'dummyVariable',
         onChange: (data) => {},
         onInitialize: (data) => {},
       },
       y0 : {
         type: 'range',
         label: getLocalized('beginPointY'),
         min: 0, max: imageHeight, step: 1,
         object: this, property: 'dummyVariable'
       },
       x1 : {
         type: 'range',
         label: getLocalized('endPointX'),
         min: 0, max: imageWidth, step: 1,
         object: this, property: 'dummyVariable'
       },
       y1 : {
         type: 'range',
         label: getLocalized('endPointY'),
         min: 0, max: imageHeight, step: 1,
         object: this, property: 'dummyVariable'
       },
       relativeLength : {
         type: 'display',
         label: getLocalized('guiRelativeLength'),
         object: this, property: 'dummyVariable'
       },
       absoluteLength : {
         type: 'display',
         label: getLocalized('guiAbsoluteLength'),
         object: this, property: 'dummyVariable'
       },
       removeButton : {
             type: 'button',
             label: getLocalized('guiRemoveMeasure'),
             action: () => {
               if (!this.viewGuiObjects) { return; }
               let measurementGroup = this.groups.find(group => group.groupFolder == this.viewGuiObjects[0].folder);
               let measurementIndex = measurementGroup.measures.findIndex(measure => measure == this.viewMeasure);
               measurementGroup.measures.splice(measurementIndex, 1);
               // Object.values(this.).forEach(obj => tryCatch(
               //   ()=>{ guifyInstance.Remove(obj); },
               //   (e)=>{}
               // ))
               // TODO delete from arrays
             },
       }
     };
     for (const [key, definition] of Object.entries(definitions)) {
       let guiObj = guifyInstance.Register(definition, { folder: viewFolder });
       this.viewGuiObjects[key] = guiObj;
     }
     this.viewGuiSetEnabled(false);
   }
 
   _addMeasureGui({guifyInstance=null, parentFolder=null, label=null, boundData=null, isRemovable=true}) {
     let definitions = [
       {
         type: 'button',
         label: label,
         folder: parentFolder,
         action: () => {
           this.viewMeasurement(boundData, isRemovable);
         }
       },
     ];
     let objects = [];
     for (let definition of definitions) {
       objects.push(guifyInstance.Register(definition));
     }
     return objects;
   }
 
   _addFloatNoSlider(guifyInstance, definition) {
     let obj = guifyInstance.Register(definition);
     obj.container.querySelectorAll('.guifyInstance-value-input').forEach(
       el => { el.style.width = "56%"; }
     );
     return obj;
   }
 
   addMeasure(guifyInstance, groupFolder, groupBoundData, destinationGuiObjects, measureOverrideData) {
     let index = groupBoundData.measures.length;
     let defaults = {
       begin: createVector(0, 0),
       end: createVector(Math.random()*1000, Math.random()*1000),
       denotationOverride: null,
     };
     Object.assign(defaults, measureOverrideData);
     groupBoundData.measures.push(defaults);
     let measureGuiObjects = this._addMeasureGui({
       guifyInstance: guifyInstance, parentFolder: groupFolder,
       label: defaults.denotationOverride || `${getLocalized('measure')} ${index+1}`,
       boundData: groupBoundData.measures[index],
       groupFolder: groupFolder,
     });
     defaults.guiObjects = measureGuiObjects;
     destinationGuiObjects.push(...measureGuiObjects);
   }
 
   bindMeasures(observerMeasure, isObserverBegin, isObserverEnd, sourceMeasure, isSourceBegin, isSourceEnd) {
     if (this.boundMeasures.has(observerMeasure)) {
       let state = this.boundMeasures.get(observerMeasure);
       if (isObserverBegin) {
         state.begin = isSourceBegin ? sourceMeasure.begin : sourceMeasure.end;
       }
       if (isObserverEnd) {
         state.end = isSourceBegin ? sourceMeasure.begin : sourceMeasure.end;
       }
     } else {
       this.boundMeasures.set(observerMeasure, { 
         begin: isObserverBegin ? (isSourceBegin ? sourceMeasure.begin : sourceMeasure.end) : null,
         end: isObserverEnd ? (isSourceBegin ? sourceMeasure.begin : sourceMeasure.end) : null,
       })
     }
   }
 
   newGroup(guifyInstance, parentFolder, groupFolder, groupDenotation, baseDefaultCoords, measuresDefaultCoords) {
     let guiObjects = [];
     guiObjects.push(guifyInstance.Register({
       type: 'folder',
       label: groupFolder,
       folder: parentFolder,
       open: false
     }));
     let defaults;
     if (this.nextDefaultIndex < this.constructor.groupsDefaults.length) {
       defaults = this.constructor.groupsDefaults[this.nextDefaultIndex];
       ++this.nextDefaultIndex;
     } else {
       const randomColor = '#' + Math.floor(Math.random()*16777215).toString(16);
       defaults = { color: randomColor, denotation: groupDenotation }
     }
     if (groupDenotation !== undefined) {
       defaults.denotation = groupDenotation;
     }
     let groupBoundData = {
       ...defaults,
       opacity: 1.0,
       isRendered: true,
       baseMeasure: {
         begin: createVector(Math.random()*1000, Math.random()*1000),
         end: createVector(Math.random()*1000, Math.random()*1000),
         denotationOverride: null,
         guiObjects: null},
       baseAbsoluteLength: 1.0,
       measures: []
     };
     if (baseDefaultCoords !== undefined) {
       Object.assign(groupBoundData.baseMeasure, baseDefaultCoords);
     }
     guiObjects.push(guifyInstance.Register({
       type: 'button',
       label: getLocalized('guiRemoveGroup'),
       folder: groupFolder,
       action: () => {
         if (this.groups.length == 1 || confirm(getLocalized('removeGroupDialog') + ' ' + groupFolder)) {
           this.removeGroup(guifyInstance, groupFolder);
         } else {
           print('Cancel removing of group');
         }
       }
     }));
     guiObjects.push(guifyInstance.Register({
       type: 'checkbox',
       label: getLocalized('guiGroupIsRendered'),
       property: 'isRendered',
       object: groupBoundData, folder: groupFolder,
     }));
     guiObjects.push(guifyInstance.Register({
         type: 'color',
         label: getLocalized('guiGroupColor'),
         format: 'hex',
         property: 'color',
         object: groupBoundData, folder: groupFolder
     }));
     guiObjects.push(guifyInstance.Register({
         type: 'text',
         label: getLocalized('guiGroupDenotation'),
         property: 'denotation',
         object: groupBoundData, folder: groupFolder,
     }));
     guiObjects.push(this._addFloatNoSlider(guifyInstance, {
       type: 'range',
       label: getLocalized('guiBaseAbsoluteValue'),
       min: 1e-3, max: 1e6, step:1e-6, precision: 20,
       property: 'baseAbsoluteLength',
       object: groupBoundData, folder: groupFolder,
     }));
 
     guiObjects.push(guifyInstance.Register({
       type: 'button',
       label: getLocalized('guiNewMeasure'),
       folder: groupFolder,
       action: () => this.addMeasure(guifyInstance, groupFolder, groupBoundData, guiObjects),
     }));
     const baseGuiObjects = this._addMeasureGui({
       guifyInstance: guifyInstance, parentFolder: groupFolder,
       label: (groupBoundData.baseMeasure.denotationOverride || getLocalized('baseMeasurePrefix')) + getLocalized('baseMeasureSuffix'),
       boundData: groupBoundData.baseMeasure,
       isRemovable: false,
     });
     guiObjects.push(...baseGuiObjects);
     groupBoundData.baseMeasure.guiObjects = baseGuiObjects;
     this.groups.push({guiObjects: guiObjects, data: groupBoundData, groupFolder: groupFolder});
     if (measuresDefaultCoords !== undefined) {
       measuresDefaultCoords.forEach(measureOverride => {
         this.addMeasure(guifyInstance, groupFolder, groupBoundData, guiObjects, measureOverride);
       })
     }
   }
 
   _removeGuiObjects(guifyInstance, guiObjects) {
     guiObjects.forEach(
       obj => tryCatch(
         () => { guifyInstance.Remove(obj) },
         (e) => { print('Error deleting', e, obj); }
       )
     )
     guiObjects.splice(0, guiObjects.length);
   }
   removeGroup(guifyInstance, groupFolder) {
     let groupIndex = this.groups.findIndex(group => group.groupFolder == groupFolder);
     this._removeGuiObjects(guifyInstance, this.groups[groupIndex].guiObjects);
     this.groups.splice(groupIndex, 1);
     this.viewMeasurement(null);
   }
 
   removeAllGroups(guifyInstance) {
     while(this.groups.length > 0) {
       print(this.groups[this.groups.length - 1].groupFolder);
       this.removeGroup(guifyInstance, this.groups[this.groups.length - 1].groupFolder);
     }
     this.nextDefaultIndex = 0;
   }
 
   forEachMeasure(func) {
     this.groups.forEach(group => {
       func(group.data.baseMeasure);
       group.data.measures.forEach(measure => {
         func(measure);
       })
     });
   }
 
   forEachPoint(func) {
     this.forEachMeasure(measure => {
       func(measure.begin);
       func(measure.end);
     })
   }
 }