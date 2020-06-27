export default {
    rint, range, identity, deepCopy, clamp, lerp, template, forEachProperty, for2d
};

// Returns a random number between low (inclusive) and high (exclusive).
function rint(low, high) {
    return Math.floor(low + Math.random() * (high - low));
}

// Returns an array of integers from low (inclusive) to high (exclusive).
function range(low, high) {
    var r = [];
    for (var i = low; i < high; i++)
        r.push(i);
    return r;
}

// Identity function (useful as a default for callback accepting functions like min).
function identity(x) { return x; }

// Creates a deep copy of an object, handling nested objects and arrays. Depth controls how deep
// the copy goes - the number of nesting levels that should be replicated.
function deepCopy(obj, depth) {
    if ((!depth) || (typeof obj != 'object')) return obj;

    var copy = (obj.length !== undefined) ? [] : {};
    forEachProperty(obj, function(value, key) {
        copy[key] = deepCopy(value, depth - 1);
    });
    return copy;
}

// Clamps a number - if it's lower than low or higher than high, it's brought into range.
function clamp(number, low, high) {
    return (number < low) ? low : ((number > high) ? high : number);
}

function lerp(alpha, from, to) {
    alpha = clamp(alpha, 0, 1);
    return to * alpha + from * (1 - alpha);
}

// Treats a given text as a template, replacing 'X' with the second parameter.
function template(text, replacement) {
    return text.replace(/X/g, replacement);
}

// Iterates over all properties of an object, and calls the callback with (value, propertyName).
function forEachProperty(obj, fn) {
    for (var property in obj)
        fn(obj[property], property);
}

// Iterates over a rectangle (x1, y1) - (x2, y2), and calls fn with (x, y) of each integer point.
function for2d(x1, y1, x2, y2, fn) {
    range(x1, x2).map(function(x) {
        range(y1, y2).map(y => fn(x, y));
    });
}
