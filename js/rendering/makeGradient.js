import utils from '../utils/utils.js';

// Generate a SVG gradient tag for the map.
export default function makeGradient(id, light, dark) {
    return utils.elem('radialGradient', {
        i: id,
        cx: '-100%', cy: '50%',
        fx: '-100%', fy: '50%',
        r: '200%',
        gradientUnits: 'userSpaceOnUse' // we want it to scale with the map, not the region it's applied to
    }, gradientStop(60, dark) + gradientStop(100, light));
}

// Generate a SVG gradient stop tag.
function gradientStop(percent, color) {
    return utils.elem('stop', {
        offset: percent + '%',
        s: 'stop-color:' + color
    });
}