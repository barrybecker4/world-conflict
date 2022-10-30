
function getResultsFromServer() {
   return QUnitGS2.getResultsFromServer();
}

var unitTests = (function (my) {

    function divideThenRound(numerator, denominator) {
      return numerator / denominator;
    }

    my.getUnitTestHtml = function() {
         QUnitGS2.init();
         const QUnit = QUnitGS2.QUnit;

         /**
          * Add your test functions here.
          */
         QUnit.test("simple numbers", function( assert ) {
             assert.equal(divideThenRound(10, 2), 5, "whole numbers");
             assert.equal(divideThenRound(10, 4), 2.5, "decimal numbers");
         });

         QUnit.test("simple numbers2", function( assert ) {
             assert.equal(divideThenRound(15, 5), 3, "whole numbers2");
             assert.equal(divideThenRound(100, 4), 25, "decimal numbers2");
         });

         QUnit.start();
         return QUnitGS2.getHtml();
    }

    return my;
} (unitTests || {}));

