import utils from './utils.js';

export default {
    min, max, sum, contains, pairwise, shuffle,
};

// Takes a sequence, and returns the smallest element according to a given key function.
// If no key is given, the elements themselves are compared.
function min(seq, keyFn) {
    keyFn = keyFn || utils.identity;
    var smallestValue = keyFn(seq[0]), smallestElement;
    seq.map(e => {
        if (keyFn(e) <= smallestValue) {
            smallestElement = e;
            smallestValue = keyFn(e);
        }
    });
    return smallestElement;
}

// Returns the biggest element of a sequence, see 'min'.
function max(seq, keyFn) {
    keyFn = keyFn || utils.identity;
    return min(seq, function(elem) { return -keyFn(elem); })
}

// Returns the sum of a sequences, optionally taking a function that maps elements to numbers.
function sum(seq, keyFn) {
    var total = 0;
    seq.map(elem => total += keyFn(elem) );
    return total;
}

// Checks whether a sequence contains a given element.
function contains(seq, elem) {
    return seq && (seq.indexOf(elem) >= 0);
}

// Takes an array, and returns another array containing the result of applying a function
// on all possible pairs of elements.
function pairwise(array, fn) {
    var result = [];
    array.map(function(elem1, index) {
        array.slice(index + 1).map(function(elem2) {
            result.push(fn(elem1, elem2));
        });
    });
    return result;
}

// Shuffles a sequence (in place) and returns it.
function shuffle(seq) {
    seq.map(function(_, index) {
        var otherIndex = utils.rint(index, seq.length);
        var t = seq[otherIndex];
        seq[otherIndex] = seq[index];
        seq[index] = t;
    });
    return seq;
}
