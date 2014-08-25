// ==========================================================
// Game-wide constants
// ==========================================================

var mapWidth = 30, 
	mapHeight = 20, 
	maxRegionSize = 8,
	neededRegions = 20;

// ==========================================================
// The four elements and their properties
// ==========================================================

var earth = {c: '#554', t:'&#22303;'};
var air   = {c: '#ccf', t:'&#39080;', s: earth};
var fire  = {c: '#f00', t:'&#28779;', s: air};
var water = {c: '#06c', t:'&#27700;', s: fire};
var none = {c: '#777', t:''};

earth.s = water;
var elements = [earth, air, fire, water];

// ==========================================================
// Helper functions used for brevity or convenience.
// ==========================================================

var sin = Math.sin, cos = Math.cos, doc = document, $ = doc.querySelector.bind(doc);
function rint(low,high) {
	return Math.floor(low+Math.random()*(high-low));
}
function range(low,high) {
	var r = [];
	for (var i = low; i < high; i++)
		r.push(i);
	return r;
}
function map(seq,fn) {
	return [].slice.call(seq).map(fn);
}
function forEachProperty(obj,fn) {
	for (var property in obj)
		fn(obj[property], property);
}
function for2d(x1,y1,x2,y2,fn) {
	map(range(x1,x2), function(x) {
		map(range(y1,y2), fn.bind(0,x));
	});
}
function elem(tag,attrs,contents) {
	var expanded = {
		c: 'class',
		s: 'style',
		i: 'id'
	}
	var html = "<" + tag + " ";
	for (var attributeName in attrs) {
		html += (expanded[attributeName] || attributeName) + "='" + attrs[attributeName] + "'";
	}
	html += ">" + (contents || '') + "</" + tag + ">";

	return html;
}

// ==========================================================
// This part of the code initalizes a new game.
// ==========================================================

var state = makeInitialState();
prepareDisplay($('#m'), state);
updateDisplay(state);

// ==========================================================
// This part of the code deals with procedural map generation
// prior to gameplay.
// ==========================================================

function generateMap() {
	var perturbConst = rint(0,100000);
	var regionMap = range(0,mapWidth).map(function(){return []});
	var regions = [], count = 0;

	while(count < neededRegions) {
		var bounds = {
			l: rint(1, mapWidth-maxRegionSize+1),
			t: rint(1, mapHeight-maxRegionSize+1),
			w: rint(3, maxRegionSize), h: rint(3, maxRegionSize)
		}; 
		if (count && !overlaps(bounds)) continue;
		
		while(!shrink(bounds)) {
			if (!overlaps(bounds)) {
				regions.push(makeRegionAt(count++, bounds));
				break;
			}
		}
	}

	fillNeighbourLists();	
	return regions;
	
	function shrink(bounds) {
		var r = rint(0,4);
		if (r % 2) bounds.w--; else bounds.h--;
		if (r == 2) bounds.t++;
		if (r == 3) bounds.l++;
		return (bounds.w * bounds.h < 9);
	}

	function overlaps(bounds) {
		var rv = false;
		for2d(bounds.l, bounds.t, bounds.l+bounds.w, bounds.t+bounds.h, function(x,y) {
			rv = rv || regionMap[x][y];
		});
		return rv;
	}

	function makeRegionAt(index, bounds) {
		// make points for the region
		var l=bounds.l,t=bounds.t,w=bounds.w,h=bounds.h;
		var points = [];
		map(range(0,w), function(i) {
			points[i] = perturbedPoint(l+i,t);
			points[w+h+i] = perturbedPoint(l+w-i,t+h);
		});
		map(range(0,h), function(i) {
			points[w+i] = perturbedPoint(l+w,t+i);
			points[w+h+w+i] = perturbedPoint(l,t+h-i);
		});
		var region = {i: index, p: points};
		
		// mark it in the map
		for2d(bounds.l, bounds.t, bounds.l + bounds.w, bounds.t + bounds.h, function(x,y){
			regionMap[x][y] = region;
		});

		// return
		return region;
	}

	function perturbedPoint(x,y) {
		var angle = (sin(x*y*600+perturbConst*357)) * 6.28;
		var dist = (sin(x*y*600+perturbConst*211)) / 2;
		return [x+sin(angle)*dist, y+cos(angle)*dist];
	}

	function fillNeighbourLists() {
		for2d(1, 1, mapWidth-1, mapHeight-1, function(x,y) {
			var region = regionMap[x][y];
			if (region) {
				if (!region.n) region.n = [];
				for2d(-1,-1,2,2,function(dx,dy) {
					var potentialNeighbour = regionMap[x+dx][y+dy];
					if (potentialNeighbour && (potentialNeighbour != region) && (region.n.indexOf(potentialNeighbour) == -1))
						region.n.push(potentialNeighbour);
				});
			}
		});
	}
}

// ==========================================================
// This part of the code creates the initial rendering of the
// game map as an SVG object.
// ==========================================================

function centerOfWeight(points) {
	var xc = 0.0, yc = 0.0, l = points.length;
	map(points, function(p) {
		xc += p[0]; yc += p[1];
	});
	return [xc/l, yc/l];
}

function transformPoints(points, xm, ym, xd, yd) {
	var c = centerOfWeight(points);
	return map(points, function(p) {
		return [c[0] + (p[0]-c[0]) * xm + xd, c[1] + (p[1]-c[1]) * ym + yd];
	});
}

function projectPoint(p) {
	var x = p[0] / mapWidth, y = p[1] / mapHeight;
	var alpha = x * .4 + .6;
	y = y * alpha + 0.5 * (1-alpha);
	return [x*100, y*100];
}

function gradientStop(percent, color) {
	return elem('stop', {
		offset: percent + '%',
		s: 'stop-color:' + color
	});
}

function makeGradient(id, light, dark) {
	return elem('radialGradient', {
		i: id,
		cx: '-100%', cy: '50%',
		fx: '-100%', fy: '50%',
		r: '200%',
		gradientUnits: 'userSpaceOnUse'
	}, gradientStop(60, dark) + gradientStop(100, light));
}

function makePolygon(points, id, fill, noStroke) {
	return elem('polygon', {
		i: id,
		points: map(points, projectPoint).join(' '),
		s: 'fill:url(#' + fill + ');' + ((noStroke) ? '' : 'stroke:#000;stroke-width:0.25')
	})
}


function prepareDisplay(container, gameState) {
	var regions = gameState.r;

	var defs = elem('defs', {}, 		
		makeGradient('b', '#88f', "#113") + 
		makeGradient('l', '#fc9', '#530') + 	
		makeGradient('d', '#210', '#000') +
		makeGradient('w', '#55f', '#003') +
		map(gameState.p, function(player, index) {
			return makeGradient('p' + index, player.l, player.d);
		}).join(""));

	var ocean = makePolygon([[0,0],[mapWidth,0],[mapWidth,mapHeight],[0,mapHeight]], 'b', 'b');
	var tops = makeRegionPolys('r', 'l', 1, 1, 0, 0);
	var bottoms = makeRegionPolys('d', 'd', 1, 1, .05, .05);
	var shadows = makeRegionPolys('w', 'w', 1.05, 1.05, .2, .2, true);

	container.innerHTML = elem('svg', {
		viewbox: '0 0 100 100',
		preserveAspectRatio: 'none'
	}, defs + ocean + shadows + bottoms + tops);

	map(regions, function(region, index) {
		region.e = $('#r' + index);
		region.c = projectPoint(centerOfWeight(region.p));
	});

	makeTemples();

	function makeRegionPolys(idPrefix, gradient, xm, ym, xd, yd, noStroke) {
		return elem('g', {}, map(regions, function(region, index) {
			return makePolygon(transformPoints(region.p, xm, ym, xd, yd), idPrefix + index, gradient, noStroke);
		}).join(""));
	}

	function makeTemples() {
		forEachProperty(gameState.t, function(temple, index) {

			var center = temple.r.c, 
				id = 'tp' + index, iid = 'ti' + index,
				style = 'left:' + (center[0]-1.5) + '%;top:' + (center[1]-4) + '%';
			
			var templeHTML = elem('div', {
				i: id,
				c: 'o',
				s: style
			}, elem('div', {i: iid, c: 'i'}));

			container.insertAdjacentHTML('beforeend', templeHTML);
			temple.e = $('#'+id);
			temple.i = $('#'+iid);			
		});
	}
}

// ==========================================================
// This part of the code deals with updating the display to
// match the current game state.
// ==========================================================

function updateDisplay(gameState) {
	map(gameState.r, updateRegionDisplay);
	forEachProperty(gameState.t, updateTempleDisplay);
	forEachProperty(gameState.s, function(soldiers, regionIndex) {
		map(soldiers, updateSoldierDisplay.bind(0,gameState.r[regionIndex]));
	});

	function updateRegionDisplay(region) {
		var owner = gameState.o[region.i];
		region.e.style.fill = 'url(#' + (owner ? 'p' + owner.i : 'l') + ')';		
	}
	function updateTempleDisplay(temple) {
		temple.e.style.background = temple.t.c;
		temple.i.innerHTML = temple.t.t;
	}
	function updateSoldierDisplay(region, soldier, index) {
		var center = region.c;
		var totalSoldiers = gameState.s[region.i].length;
		var domElement = $('#s'+soldier.i);
		if (!domElement) {
			var html = elem('div', {
				c: 's',
				i: 's' + soldier.i,
				s: 'background:' + soldier.t.c
			});
			$('#m').insertAdjacentHTML('beforeEnd', html);
			domElement = $('#s' + soldier.i);
		}
		var offset = (-0.6 * totalSoldiers + index * 1.2);
		domElement.style.left = (center[0]+offset-0.3) + '%';
		domElement.style.top  = (center[1]+1.5+offset*0.2) + '%';
	}
}

// ==========================================================
// Game logic
// ==========================================================

var soldierCounter;
function addSoldier(gameState, region, element) {
	soldierCounter = (soldierCounter + 1) || 0;
	if (!gameState.s[region.i])
		gameState.s[region.i] = [];
	gameState.s[region.i].push({
		i: soldierCounter++,
		t: element
	});
}

function makeInitialState(regions) {
	var regions = generateMap();
	// 	'#fc9', '#530')
	var players = [
		{i:0, l: '#ffa', d:'#960'}, 
		{i:1, l: '#f88', d:'#722'},
		{i:2, l: '#d9d', d:'#537'}
	];
	var gameState = {
		r: regions,
		p: players,
		o: {}, t: {}, s: {}
	}

	setupPlayerBases();

	return gameState;

	function distanceSquared(region1, region2) {
		var c1 = centerOfWeight(region1.p), c2 = centerOfWeight(region2.p),
			dx = c1[0]-c2[0];
			dy = c1[1]-c2[1];
		return dx*dx+dy*dy;
	}

	function randomRegion() {
		return regions[rint(0, regions.length)];
	}

	function setupPlayerBases() {
		// pick three regions that are as far away as possible from each other
		var bestDistance = 0.0, bestRegions;
		for (var i = 0; i < 1000; i++) {
			var r1 = randomRegion(), r2 = randomRegion(), r3 = randomRegion();			
			var distance = distanceSquared(r1, r2) * distanceSquared(r1, r3) * distanceSquared(r2, r3);
			if (distance > bestDistance) {
				bestDistance = distance;
				bestRegions = [r1, r2, r3];
			}
		}

		// we have the regions, set up each player
		map(players, function(player, index) {
			var region = bestRegions[index];
			// make one of the regions your own
			gameState.o[region.i] = player;
			// put a temple and 4 soldiers in it
			var element = elements[rint(0,4)];
			putTemple(region, element);
			map(range(0,4), function() {
				addSoldier(gameState, region, element);
			});
		});
	}

	function putTemple(region, element) {
		var index = region.i;
		gameState.t[index] = {r: region, i: index, t: element};
	}

/*	return {
		r: regions,
		p: players,
		o: {0: players[0], 4: players[1]},
		t: {
			0: {r:regions[0], t: water}, 
			4: {r:regions[4], t: air}, 
			7: {r:regions[7], t: none}
		},
		s: {
			0: [
				{i:0,t:water},
				{i:1,t:water},
				{i:2,t:water},
				{i:3,t:water},
			],
			4: [
				{i:4,t:air},
				{i:5,t:air}
			]
		}
	}*/
}