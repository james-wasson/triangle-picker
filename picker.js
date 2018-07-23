(function($, $window, $document, undefined) {	
    // define "globals"
    var pluginName = "trianglePicker";
    var i;
    var pickerWrapperClass = "triangle-picker-wrapper";
    var pickerClass = "triangle-picker";
    var pickerHandleClass = "triangle-picker-handle";
    var pickerPolygonClass = "triangle-picker-polygon";
    var dataNamespace = "trianglepicker";
    var pointNames = ['bottomLeft', 'bottomRight', 'topMiddle'];
    var defaults = {
        polygon: {
            width: null,
            fillColor: null,
            line: { 
                width: 2,
                color: 'black',
                centerLines: true,
                centerLineWidth: null
            }
        },
        handle: {
            color: null,
            width: null,
            height: null,
            borderRadius: null
        },
        inputs: {
            bottomRight: {
                name: 'bottomRight',
                id: '',
                class: ''
            },
            topMiddle: {
                name: 'topMiddle',
                id: '',
                class: ''
            },
            bottomLeft: {
                name: 'bottomLeft',
                id: '',
                class: ''
            },
            decimalPlaces: 2
        }
    };
    var publicMethods = ['moveHandleToCenter', 'onWindowResize', 'onSvgMouseDown', 'onHandleMouseDown', 'onMouseUp', 'onMouseMove', 'onHandleMove', 'redrawTriangle', 'bindOnChange', 'onChange', 'handleValues', 'handlePosition', 'handleDimensions', 'svgDimensions', 'svgOffset', 'svgPosition', 'destroy', 'teardown', 'unbind'];



    function PluginMaker(plugin, pluginName, publicMethods) {
        if (!Array.isArray(publicMethods))
            publicMethods = null;
        (function(plugin, pluginName, publicMethods) {
            // add the plugin function as a jQuery plugin
            $.fn[pluginName] = function(options) {
                // get the arguments 
                var args = $.makeArray(arguments),
                    after = args.slice(1);
                var instance;
                return this.each(function() {
                    // see if we have an instance
                    instance = $.data(this, pluginName);
                    if (instance !== undefined) {
                        // call a method on the instance
                        if (typeof options === "string") {
                            // checks if it is a public method
                            if (publicMethods !== null) {
                                if (!publicMethods.includes(options)) {
                                    console.warn('Method is not public');
                                    return;
                                }
                            }
                            instance[options].apply(instance, after);
                        } else if (typeof instance.update === 'function') {
                            // call update on the instance
                            instance.update.apply(instance, args);
                        }
                    } else {
                        // create the plugin
                        instance = new plugin(this);
                        // initalizes the plugin
                        if (typeof instance.init === 'function')
                            instance.init.apply(instance, args);
                    }
                });
            };
        }(plugin, pluginName, publicMethods));
    }

    function trianglePicker(el) {
        this.element = $(el);
    }

    $.extend(trianglePicker.prototype, 
    {
        name: "trianglePicker",
        picker: null,
        handle: null,
        svg: null,
        polygon: null,
        inputBoxes: [],
        centerLines: [],
        mouseIsDown: false,
        init: function(options, onChange) {
            // init the element
            $.data(this.element, pluginName, this); // add the element to the widgit
            
            this.currentValues = null;
            this.options = setUpOptions(options, this);

            this.name = this.options.name || this.element.attr('name') || this.element.attr('id') || 'trianglePicker';

            setUpPicker(this, this.options);

            this.bind();

            if (onChange !== undefined)
                this.bindOnChange(onChange);

            this.moveHandleToCenter();

            this.onWindowResize();
        },
        bind: function() {
            $window.bind("resize", $.proxy(this.onWindowResize, this));
            this.handle.on("mousedown", $.proxy(this.onHandleMouseDown, this));
            this.svg.on("mousedown", $.proxy(this.onSvgMouseDown, this));
            $document.on("mousemove", $.proxy(this.onMouseMove, this));
            $document.on("mouseup", $.proxy(this.onMouseUp, this));
        },

        /**** Move methods ****/

        moveHandleToCenter: function() {
            moveEleToPoint(this.handle, this.pickerPoints().midPoint, this.handleDimensions());
            this.positionPercent(true);
        },

        onSvgMouseDown: function(e) {
            this.mouseIsDown = true;
            this.onElementDrag(e, false);
        },
        onHandleMouseDown: function(e) {
            this.mouseIsDown = true;
            this.onElementDrag(e);
        },
        onMouseUp: function(e) {
            this.mouseIsDown = false;
        },
        onMouseMove: function(e) {
            this.onElementDrag(e);
        },
        onElementDrag: function (e, moveToIntersect) {
            if (this.mouseIsDown !== true) return;
            e = e || window.event;
            e.preventDefault(); // keeps text from being selected
            // calculate the new cursor position:
            var newHandlePosition = { 
                x: e.pageX - this.svgOffset().left,
                y: e.pageY - this.svgOffset().top 
            };
            // check if we should move
            if (isNewPointInTriangle(newHandlePosition, this.pickerPoints())) {
                // set the element's new position:
                moveEleToPoint(this.handle, newHandlePosition, this.handleDimensions());
                this.onHandleMove();
            } else if (moveToIntersect !== false) {
                var intersect = getPolygonTriangleLineIntersection(newHandlePosition, this.svgDimensions(), this.handleDimensions(), this.pickerPoints());
                if (intersect !== false) {
                    moveEleToPoint(this.handle, intersect, this.handleDimensions());
                    this.onHandleMove();
                }
            }
            
        },

        onHandleMove: function() {
            this.handlePosition(true);
            this.positionPercent(true);
            this.onChange();
        },

        /**** End Move methods ****/

        /**** Resize methods ****/

        onWindowResize: function(e) {
            this.redrawTriangle();
            this.handleResize();
            this.handlePosition(true);
        },

        redrawTriangle: function() {
            this.handleDimensions(true);
            redrawTriangle(this);
            this.svgPosition(true);
            this.svgOffset(true);
            this.svgDimensions(true);
        },

        handleResize: function () {
            var newPosition = { 
                y: this.svgDimensions().height * this.positionPercent().y,
                x: this.svgDimensions().width * this.positionPercent().x
            };
            if (isNewPointInTriangle(newPosition, this.pickerPoints())) {
                moveEleToPoint(this.handle, newPosition, this.handleDimensions());
            } else {
                var intersection = getPolygonTriangleLineIntersection(newPosition, this.svgDimensions(), this.handleDimensions(), this.pickerPoints());
                if (intersection !== false)
                    moveEleToPoint(this.handle, intersection, this.handleDimensions());
                else
                    moveToPolygonCenter(this.handle, this.handleDimensions(), this.svgDimensions());
            }
        },

        /**** End Resize methods ****/

        /**** Change Methods ****/

        onChangeFunctions: [],
        bindOnChange: function(func) {
            if (typeof func !== 'function') {
                console.warn("Must pass a function to have it bound to on change.");
                return;
            }
            this.onChangeFunctions.push(func);
        },
        onChange: function() {
            var unnamedValues = getValues(this.handlePosition(), this.handleDimensions(), this.pickerPoints(), this.options);
            this.currentValues = updateInputBoxValues(unnamedValues, this.inputBoxes, this.options);
            var args = [this.name, this.currentValues, this.element];
            this.onChangeFunctions.forEach(function(func) { 
                func.apply(null, args);
            });
        },

        /**** End Change Methods ****/

        /**** Get And Set Values ****/

        currentValues: {
            bottomRight: 33.33,
            topMiddle: 33.33,
            bottomLeft: 33.33,
        },
        handleValues: function(values) {
            if (values === undefined)
                return this.currentValues;
            this.currentValues = values;
            // TODO: move the handle to the correct value
            // TODO: set the input values
            return this;
        },

        /**** End Get And Set Values ****/

        /**** Get and set Position/Offest/Dimension Properties ****/

        _handlePosition: null,
        handlePosition: function(set, value) {
            if (set !== true) {
                if (this._handlePosition === null)
                    this.handlePosition(true); // init the value if its not already
                return this._handlePosition;
            }
            if (value !== undefined)
                this.handle.css({ top: value.y - handleDimensions.height / 2, left: value.x - handleDimensions.width / 2 });
            this._handlePosition = this.handle.position();
            return this;
        },

        _handleDimensions: null,
        handleDimensions: function(set, value) {
            if (set !== true) {
                if (this._handleDimensions === null)
                    this.handleDimensions(true); // init the value if its not already
                return this._handleDimensions;
            }
            if (value !== undefined) {
                this.handle.css({ height: value.height, width: value.width });
            }
            this._handleDimensions = getElementDimensions(this.handle, 'outer');
            return this;
        },

        _svgDimensions: null,
        svgDimensions: function(set, value) {
            if (set !== true) {
                if (this._svgDimensions === null)
                    this.svgDimensions(true); // init the value if its not already
                return this._svgDimensions;
            }
            if (value !== undefined) {
                this.svg.attr('height', value.height);
                this.svg.attr('width', value.width);
                this._svgDimensions = $.extend({}, value);
            } else {
                this._svgDimensions = getElementDimensions(this.svg, 'attr');
            }
            return this;
        },

        _svgOffset: null,
        svgOffset: function(set) {
            if (set !== true) {
                if (this._svgOffset === null)
                    this.svgOffset(true); // init the value if its not already
                return this._svgOffset;
            }
                this._svgOffset = this.svg.offset();
            return this;
        },

        _svgPosition: null,
        svgPosition: function(set) {
            if (set !== true) {
                if (this._svgPosition === null)
                    this.svgPosition(true); // init the value if its not already
                return this._svgPosition;
            }
                this._svgPosition = this.svg.position();
            return this;
        },

        _positionPercent: null,
        positionPercent: function (set) {
            if (set !== true) {
                if (_positionPercent === null) this.positionPercent(true);
                return _positionPercent;
            }
            var x = (this.handlePosition().left + this.handleDimensions().width / 2) / this.svgDimensions().width;
            var y = (this.handlePosition().top + this.handleDimensions().height / 2)/ this.svgDimensions().height;
            if (x > 1) x = 1;
            if (y > 1) y = 1;
            if (x < 0) x = 0;
            if (y < 0) y = 0;
            _positionPercent = { x: x, y: y };
        },

        _pickerPoints: null,
        pickerPoints: function(set) {
            if (set !== true) {
                if (this._pickerPoints === null)
                    this.pickerPoints(true);
                return this._pickerPoints;
            }
            this._pickerPoints =  {
                bottomLeft: { x: this.options.polygon.line.width, y: this.svgDimensions().height - this.options.polygon.line.width / 2 },
                topMiddle: { x: this.svgDimensions().width / 2, y: this.options.polygon.line.width },
                bottomRight: { x: this.svgDimensions().width - this.options.polygon.line.width, y: this.svgDimensions().height - this.options.polygon.line.width / 2 },
                midPoint: { x: this.svgDimensions().width / 2, y: this.svgDimensions().height * 2/3 } 
            };
            return this;
        },


        /**** End Get and set Position/Offest/Dimension Properties ****/

        destroy: function() {
            this.element.unbind("destroyed", 
            this.teardown);
            this.teardown();
        },

        // set back our element
        teardown: function() {
            $.removeData(this.element[0], this.pluginName);
            this.element.removeClass(this.pluginName);
            this.unbind();
            this.element = null;
        },
        unbind: function() {  
            $window.unbind("resize", this.onWindowResize);
        }
    });

    PluginMaker(trianglePicker, pluginName, publicMethods);

    function setUpPicker(plugin, options) {
        plugin.element.empty();
        plugin.element.addClass(pickerWrapperClass);
        plugin.picker = $('<div class="'+pickerClass+'"></div>');
        
        plugin.element.append(plugin.picker);
        
        plugin.handle = $('<div class="'+pickerHandleClass+'"></div>');
        plugin.picker.append(plugin.handle);
        setUpHandleStyles(plugin.handle, plugin.options);

        plugin.inputBoxes = [];
        for(i in pointNames) {
            var input = makeInput(plugin.options.inputs[pointNames[i]], pointNames[i]);
            plugin.picker.append(input);
            plugin.inputBoxes.push(input);
        }

        var width = plugin.options.polygon.width || plugin.picker.outerWidth();
        var height= width*(Math.sqrt(3)/2);
        
        plugin.svg = $(makeSVG({ 
            height: height,
            width: width,
            class: pickerPolygonClass
        }, plugin.picker[0]));

        plugin.svgDimensions(true, { width: width, height: height }); // equilateral triangle's height

        plugin.pickerPoints(true);

        var lineStyles = { 
            fill: plugin.options.polygon.fillColor,
            stroke: plugin.options.polygon.line.color,
            'stroke-width': plugin.options.polygon.line.width,
            'fill-rule': 'nonzero',
        };

        plugin.polygon = $(makePolygon(
        [
            plugin.pickerPoints().bottomLeft,
            plugin.pickerPoints().topMiddle,
            plugin.pickerPoints().bottomRight,
        ], lineStyles, plugin.svg[0]));

        // move down for drawing purposes
        if (plugin.options.polygon.line.centerLines === true) {
            if (plugin.options.polygon.line.centerLineWidth !== undefined && plugin.options.polygon.line.centerLineWidth !== null)
                lineStyles['stroke-width'] = plugin.options.polygon.line.centerLineWidth;
            lineStyles['stroke-linecap'] = "round";
            for(i in pointNames)
                plugin.centerLines.push($(makeSvgLine(getCombinedLinePoints(pointNames[i], plugin.pickerPoints(), plugin.options), lineStyles, plugin.svg[0], pointNames[i])));
        }

        setupPickerLabels(plugin.element, plugin.options);
    }

    function makePolygon(points, polyAttrs, parent) {
        var poly = document.createElementNS('http://www.w3.org/2000/svg', 'polygon');
        poly.setAttribute('points', mapPointsToString(points));
        setElementAttributes(poly, polyAttrs);
        if (parent !== undefined || parent !== null)
            parent.appendChild(poly);
        return poly;
    }

    function makeSvgLine(combinedPoints, lineAttrs, parent, type) {
        var line = document.createElementNS('http://www.w3.org/2000/svg', 'line');
        // adds attributes x1, x2, y1, y2
        polyAttrs = $.extend(true, lineAttrs, combinedPoints);
        setElementAttributes(line, lineAttrs);
        if (type !== undefined && type !== null) {
            line.setAttribute('data-' + dataNamespace + '-type', type);
        }
        if (parent !== undefined || parent !== null)
            parent.appendChild(line);
        return line;
    }

    function makeSVG(svgAttrs, parent) {
        var svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
        setElementAttributes(svg, svgAttrs);
        if (parent !== undefined || parent !== null)
            parent.appendChild(svg);
        return svg;
    }

    function makeInput(opts, type) {
        return $('<input type="number"' +
            'id="' + (typeof opts.id === 'string' ? opts.id : '') +
            '" name="' + (typeof opts.name === 'string' ? opts.name : '') +
            '" class="' + (typeof opts.class === 'string' ? opts.class : '') +
            '" style="display: none;" data-' + dataNamespace + '-type="' + type + '"></input>')[0];
    }

    function setElementAttributes(ele, attrs) {
        for (var k in attrs)
            if (attrs[k] !== undefined && attrs[k] !== null) {
                if (typeof ele.setAttribute === 'function') ele.setAttribute(k, attrs[k]);
                else if (typeof ele.attr  === 'function') ele.attr(k, attrs[k]);
                else console.warn("Cannot set attribute, no suitable method found");
            }
                
    }

    function redrawTriangle(plugin) {
        var width = plugin.options.polygon.width || plugin.picker.outerWidth();
        var height = width*(Math.sqrt(3)/2) - plugin.options.polygon.line.width; // equilateral triangle's height
        plugin.svgDimensions(true, { height: height, width: width });
        plugin.pickerPoints(true);
        plugin.polygon.attr('points', mapPointsToString([
            plugin.pickerPoints().bottomLeft,
            plugin.pickerPoints().topMiddle,
            plugin.pickerPoints().bottomRight
        ]));
        
        // updates the lines
        plugin.centerLines.forEach(function($line) {
            var type = $line.attr('data-' + dataNamespace + '-type');
            setElementAttributes($line, getCombinedLinePoints(type, plugin.pickerPoints(), plugin.options));
        });
    }

    function setupPickerLabels($wrapper, options) {
        
        $wrapper.prepend($('<div class="triangle-picker-top-label-wrapper"><label class="topMiddleLabel triangle-picker-label">'+getInputName('topMiddle', options)+'</label></div>'));
        var bottomContainer = $('<div class="triangle-picker-bottom-label-wrapper"></div>');
        bottomContainer.append($('<label class="bottomLeft triangle-picker-label">'+getInputName('bottomLeft', options)+'</label>'));
        bottomContainer.append($('<label class="bottomRight triangle-picker-label">'+getInputName('bottomRight', options)+'</label>'));
        $wrapper.append(bottomContainer);
    }

    function getCombinedLinePoints(type, pickerPoints, options) {
        var centerLineWidth = (options.polygon.line.centerLineWidth || options.polygon.line.width || 0);
        var outerLineWidth = (options.polygon.line.width || 0);
        var mid = { x: pickerPoints.midPoint.x, y: pickerPoints.midPoint.y };
        if (type === 'bottomLeft')
            overwrite = combinePoints(mid, { x: pickerPoints.bottomLeft.x + centerLineWidth, y: pickerPoints.bottomLeft.y - centerLineWidth / 2 });
        else if (type === 'topMiddle')
            overwrite = combinePoints(mid, { x: pickerPoints.topMiddle.x, y: pickerPoints.topMiddle.y + centerLineWidth });
        else if (type === 'bottomRight')
            overwrite = combinePoints(mid, { x: pickerPoints.bottomRight.x - centerLineWidth, y: pickerPoints.bottomRight.y - centerLineWidth / 2 });
        return overwrite;
    }

    function moveToPolygonCenter($handle, handleDimensions, svgDimensions) {
        var heightToCenter = svgDimensions.height * 2/3;
        $handle.css({ top: heightToCenter - handleDimensions.height / 2, left: svgDimensions.width / 2 - handleDimensions.width / 2 });
    }

    function isNewPointInTriangle(newHandlePosition, pickerPoints) {
        return pointInTriangle(
            { x: newHandlePosition.x, y: newHandlePosition.y }, // the new handle position
            { x: pickerPoints.topMiddle.x, y: pickerPoints.topMiddle.y }, // top point
            { x: pickerPoints.bottomLeft.x, y: pickerPoints.bottomLeft.y }, // left point
            { x: pickerPoints.bottomRight.x, y: pickerPoints.bottomRight.y } // right point
        );
    }

    // taken from https://stackoverflow.com/questions/2049582/how-to-determine-if-a-point-is-in-a-2d-triangle
    function pointInTriangle(point, triVec0, triVec1, triVec2)
    {   // using barycentric coordinates
        var as_x = point.x - triVec0.x;
        var as_y = point.y - triVec0.y;
        var s_ab = (triVec1.x - triVec0.x) * as_y - (triVec1.y - triVec0.y) * as_x > 0;

        if((triVec2.x - triVec0.x) * as_y - (triVec2.y-triVec0.y) * as_x > 0 == s_ab) 
            return false;

        if((triVec2.x - triVec1.x) * (point.y - triVec1.y) - (triVec2.y - triVec1.y) * (point.x - triVec1.x) > 0 != s_ab)
            return false;

        return true;
    }

    function getPolygonTriangleLineIntersection(testLocation, svgDimensions, handleDimensions, pickerPoints) {
        var triangleLines = [
            // bottom line boundary
            combinePoints(pickerPoints.bottomLeft, pickerPoints.bottomRight),
            // left line boundary
            combinePoints(pickerPoints.bottomLeft, pickerPoints.topMiddle),
            // right line boundary
            combinePoints(pickerPoints.bottomRight, pickerPoints.topMiddle)
        ];

        var centerCusorLine = {
            // center line
            x1: svgDimensions.width / 2 + handleDimensions.width / 2,
            y1: svgDimensions.height * 2/3 + handleDimensions.height / 2,
            // cursor location (or other object)
            x2: testLocation.x,
            y2: testLocation.y
        };
        var intersection = false;
        for(var i in triangleLines) {
            intersection = intersect(triangleLines[i], centerCusorLine);
            if (intersection !== false) break;
        }
        if (intersection === false) return false;
        return {
            x: intersection.x,
            y: intersection.y
        };
    }
    

    function intersect(line1, line2, unbounded) {
        // Check if none of the lines are of length 0
        if ((line1.x1 === line1.x2 && line1.y1 === line1.y2) || (line2.x1 === line2.x2 && line2.y1 === line2.y2)) {
            return false;
        }

        denominator = ((line2.y2 - line2.y1) * (line1.x2 - line1.x1) - (line2.x2 - line2.x1) * (line1.y2 - line1.y1));

        // Lines are parallel
        if (denominator === 0) {
            return false;
        }

        var ua = ((line2.x2 - line2.x1) * (line1.y1 - line2.y1) - (line2.y2 - line2.y1) * (line1.x1 - line2.x1)) / denominator;
        var ub = ((line1.x2 - line1.x1) * (line1.y1 - line2.y1) - (line1.y2 - line1.y1) * (line1.x1 - line2.x1)) / denominator;

        // is the intersection along the segments
        if (unbounded !== true) {
            if (ua < 0 || ua > 1 || ub < 0 || ub > 1) {
                return false;
            }
        }

        // Return a object with the x and y coordinates of the intersection
        var x = line1.x1 + ua * (line1.x2 - line1.x1);
        var y = line1.y1 + ua * (line1.y2 - line1.y1);

        return { x: x, y: y };
    }

    function getElementDimensions($item, type) {
        if (type === 'outer')
            return { height: $item.outerHeight(), width: $item.outerWidth() };
        if (type === 'attr')
            return { height: Number($item.attr('height')), width: Number($item.attr('width')) };
        return { height: $item.height(), width: $item.width() };
    }

    function moveEleToPoint($ele, point, handleDimensions) {
        $ele.css({ top: point.y - handleDimensions.height / 2, left: point.x - handleDimensions.width / 2 });
    }

    function setUpOptions(passedOpts, ele) {
        if (typeof passedOpts === 'function') 
            passedOpts = passedOpts(ele);
        if (passedOpts === undefined) 
            passedOpts = null; // null is inherently an object
        else if (typeof passedOpts !== 'object')
            console.warn('The options passed into the triangle picker are not of type object.');

        return $.extend(true, {}, defaults, passedOpts);
    }

    function getDistanceBetweenPoints(point1, point2) {
        return Math.sqrt( Math.pow(Math.abs(point1.x-point2.x), 2) + Math.pow(Math.abs(point1.y-point2.y), 2) );
    }

    function setUpHandleStyles($handle, options) {
        if (options.handle.color !== null) $handle.css("background-color", options.handle.color);
        if (options.handle.width !== null)  $handle.css("width", options.handle.width);
        if (options.handle.height !== null)  $handle.css("height", options.handle.height);
        else if (options.handle.width !== null) $handle.css("height", options.handle.width);
        if (options.handle.borderRadius !== null) $handle.css("border-radius", options.handle.borderRadius);
    }

    

    function mapPointsToString(points) {
        return points.map(function(pt) { return pt.x + "," + pt.y; }).join(' ');
    }

    function combinePoints(point1, point2) {
        return {
            x1: point1.x,
            y1: point1.y,
            x2: point2.x,
            y2: point2.y
        };
    }

    function getValues(handlePosition, handleDimensions, pickerPoints, options) {
        handlePosition = {
            x: handlePosition.left + handleDimensions.width / 2,
            y: handlePosition.top + handleDimensions.height / 2
        };
        var triangleLines = [
            // bottom line boundary
            combinePoints(pickerPoints.bottomLeft, pickerPoints.bottomRight),
            // left line boundary
            combinePoints(pickerPoints.bottomLeft, pickerPoints.topMiddle),
            // right line boundary
            combinePoints(pickerPoints.bottomRight, pickerPoints.topMiddle)
        ];

        var cornerHandleLines = {
            bottomLeft: combinePoints(handlePosition, pickerPoints.bottomLeft),
            bottomRight: combinePoints(handlePosition, pickerPoints.bottomRight),
            topMiddle: combinePoints(handlePosition, pickerPoints.topMiddle),
        };

        var values = {};

        var intersectionAction = function(inter) {
            var test = getDistanceBetweenPoints(inter, pickerPoints[cornerType]);
            if (test > maxDist) maxDist = test;
        };

        for (var cornerType in cornerHandleLines) {
            var intersections = [];
            for(var i in triangleLines) {
                var intersection = intersect(cornerHandleLines[cornerType], triangleLines[i], true);
                if (intersection !== false) intersections.push(intersection);
            }
            var maxDist = 0;
            intersections.forEach(intersectionAction);
            var actualDist = getDistanceBetweenPoints(handlePosition, pickerPoints[cornerType]);
            var value = (1.0 - actualDist / maxDist) * 100.0;
            if (value < 0.0) value = 0.0;
            if (value > 100.0) value = 100.0;
            value = parseFloat(value.toFixed(options.inputs.decimalPlaces));
            values[cornerType] = value;
        }
        return values;
    }

    function updateInputBoxValues(currentValues, $valueBoxes, options) {
        var mappedValues = {};
        $valueBoxes.forEach(function(box) {
            var type = box.getAttribute('data-' + dataNamespace + '-type');
            box.value = currentValues[type];
            var name = getInputName(type, options);
            mappedValues[name] = currentValues[type];
        });
        return mappedValues;
    }

    function getInputName(type, options) {
        var typeOpts = options.inputs[type];
        return typeOpts !== undefined ? options.inputs[type].name || options.inputs[type].id : type;
    }
}(jQuery, jQuery(window), jQuery(document)));