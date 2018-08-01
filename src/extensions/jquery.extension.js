$.fn[pluginName] = function(options, onChange) {
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
            new trianglePicker(this, options, onChange);
        }
    });
};