var sequenceUtils = (function (my) {

    // Takes a sequence, and returns the smallest element according to a given key function.
    // If no key is given, the elements themselves are compared.
    my.min = function(seq, keyFn) {
        keyFn = keyFn || utils.identity;
        let smallestElement = seq[0];
        let smallestValue = keyFn(smallestElement);

        for (let i = 1; i < seq.length; i++) {
            const e = seq[i];
            const value = keyFn(e);
            if (value <= smallestValue) {
                smallestElement = e;
                smallestValue = value;
            }
        }
        return smallestElement;
    }

    // Returns the biggest element of a sequence, see 'min'.
    my.max = function(seq, keyFn) {
        keyFn = keyFn || utils.identity;
        return my.min(seq, function(elem) { return -keyFn(elem); })
    }

    // Returns the sum of a sequences, optionally taking a function that maps elements to numbers.
    my.sum = function(seq, keyFn) {
        var total = 0;
        seq.map(elem => total += keyFn(elem) );
        return total;
    }

    // Checks whether a sequence contains a given element.
    my.contains = function(seq, elem) {
        return !!seq && (seq.indexOf(elem) >= 0);
    }

    // Takes an array, and returns another array containing the result of applying a function
    // on all possible pairs of elements.
    my.pairwise = function(array, fn, globalArray) {
        const result = [];
        const fullArray = globalArray ? globalArray : array;
        array.map(function(elem1, index) {
            array.slice(index + 1).map(function(elem2) {
                result.push(fn(elem1, elem2, fullArray));
            });
        });
        return result;
    }

    // Shuffles a sequence (in place) and returns it.
    my.shuffle = function(seq) {
        seq.map(function(_, index) {
            const otherIndex = utils.rint(index, seq.length);
            const t = seq[otherIndex];
            seq[otherIndex] = seq[index];
            seq[index] = t;
        });
        return seq;
    }

    return my;
} (sequenceUtils || {}));
