var mapView;

$(function() {

	var map = null;
	var draw = null;
	var geocoder = null;
	var bar = null;

	var cancellationToken = null;
	var requests = [];

	var sources = {

		"Bing Maps": "http://ecn.t0.tiles.virtualearth.net/tiles/r{quad}.jpeg?g=129&mkt=en&stl=H",
		"Bing Maps Satellite": "http://ecn.t0.tiles.virtualearth.net/tiles/a{quad}.jpeg?g=129&mkt=en&stl=H",
		"Bing Maps Hybrid": "http://ecn.t0.tiles.virtualearth.net/tiles/h{quad}.jpeg?g=129&mkt=en&stl=H",

		"div-1B": "",

		"Google Maps": "https://mt0.google.com/vt?lyrs=m&x={x}&s=&y={y}&z={z}",
		"Google Maps Satellite": "https://mt0.google.com/vt?lyrs=s&x={x}&s=&y={y}&z={z}",
		"Google Maps Hybrid": "https://mt0.google.com/vt?lyrs=h&x={x}&s=&y={y}&z={z}",
		"Google Maps Terrain": "https://mt0.google.com/vt?lyrs=p&x={x}&s=&y={y}&z={z}",

		"div-2": "",

		"Open Street Maps": "https://a.tile.openstreetmap.org/{z}/{x}/{y}.png",
		"Open Cycle Maps": "http://a.tile.opencyclemap.org/cycle/{z}/{x}/{y}.png",
		"Open PT Transport": "http://openptmap.org/tiles/{z}/{x}/{y}.png",

		"div-3": "",

		"ESRI World Imagery": "http://services.arcgisonline.com/arcgis/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}",
		"Wikimedia Maps": "https://maps.wikimedia.org/osm-intl/{z}/{x}/{y}.png",
		"NASA GIBS": "https://map1.vis.earthdata.nasa.gov/wmts-webmerc/MODIS_Terra_CorrectedReflectance_TrueColor/default/GoogleMapsCompatible_Level9/{z}/{y}/{x}.jpg",

		"div-4": "",

		"Carto Light": "http://cartodb-basemaps-c.global.ssl.fastly.net/light_all/{z}/{x}/{y}.png",
		"Stamen Toner B&W": "http://a.tile.stamen.com/toner/{z}/{x}/{y}.png",

	};

	function initializeMap() {

		mapboxgl.accessToken = 'pk.eyJ1Ijoid2lzZW1hbiIsImEiOiJHbzAtOHgwIn0.Pj1Nx77LS1-ujzRKJVOttA';

		map = new mapboxgl.Map({
			container: 'map-view',
			style: 'mapbox://styles/aliashraf/ck6lw9nr80lvo1ipj8zovttdx',
			center: [-73.983652, 40.755024], 
			zoom: 12
		});

		geocoder = new MapboxGeocoder({ accessToken: mapboxgl.accessToken });
		var control = map.addControl(geocoder);

		// Display output filename while hovering over a grid square in preview mode
		map.on('mousemove', handleMouseMove);
	}

	function initializeMaterialize() {
		$('select').formSelect();
		$('.dropdown-trigger').dropdown({
			constrainWidth: false,
		});
	}

	function initializeSources() {

		var dropdown = $("#sources");

		for(var key in sources) {
			var url = sources[key];

			if(url == "") {
				dropdown.append("<hr/>");
				continue;
			}

			var item = $("<li><a></a></li>");
			item.attr("data-url", url);
			item.find("a").text(key);

			item.click(function() {
				var url = $(this).attr("data-url");
				$("#source-box").val(url);
			})

			dropdown.append(item);
		}
	}

	function initializeSearch() {
		$("#search-form").submit(function(e) {
			var location = $("#location-box").val();
			geocoder.query(location);

			e.preventDefault();
		})
	}

	function initializeMoreOptions() {

		$("#more-options-toggle").click(function() {
			$("#more-options").toggle();
		})

		var outputFileBox = $("#output-file-box")
		$("#output-type").change(function() {
			var outputType = $("#output-type").val();
			if(outputType == "mbtiles") {
				outputFileBox.val("tiles.mbtiles")
			} else if(outputType == "repo") {
				outputFileBox.val("tiles.repo")
			} else if(outputType == "directory") {
				outputFileBox.val("{z}/{x}/{y}.png")
			}
		})

	}

	// Initialise zoom-set buttons to jump map to desired zoom level
	function initializeZoomButtons() {
		$("#zoom-from-set").click(function() {
			var z = parseInt($("#zoom-from-box").val());
			if(!isNaN(z)) {
				map.setZoom(z);
			}
		});
		$("#zoom-to-set").click(function() {
			var z = parseInt($("#zoom-to-box").val());
			if(!isNaN(z)) {
				map.setZoom(z);
			}
		});
	}

	// Open current map view in Google Maps aerial view (satellite)
	function initializeOpenInGoogle() {
		$("#open-gmaps-button").click(function() {
			var center = map.getCenter();
			var zoom = Math.round(map.getZoom());
			// Google Maps Maps URLs API (satellite basemap)
			var url = `https://www.google.com/maps/@?api=1&map_action=map&basemap=satellite&center=${center.lat.toFixed(6)},${center.lng.toFixed(6)}&zoom=${zoom}`;
			window.open(url, "_blank");
		});
	}

	function initializeRectangleTool() {
		
		var modes = MapboxDraw.modes;
		modes.draw_rectangle = DrawRectangle.default;

		draw = new MapboxDraw({
			modes: modes
		});
		map.addControl(draw);

		map.on('draw.create', function (e) {
			M.Toast.dismissAll();
		});

		$("#rectangle-draw-button").click(function() {
			startDrawing();
		})

	}

	function startDrawing() {
		removeGrid();
		draw.deleteAll();
		draw.changeMode('draw_rectangle');

		M.Toast.dismissAll();
		M.toast({html: 'Click two points on the map to make a rectangle.', displayLength: 7000})
	}

	function initializeGridPreview() {
		$("#grid-preview-button").click(previewGrid);

		map.on('click', showTilePopup);
	}

	function showTilePopup(e) {

		if(!e.originalEvent.ctrlKey) {
			return;
		}

		var maxZoom = getMaxZoom();

		var x = lat2tile(e.lngLat.lat, maxZoom);
		var y = long2tile(e.lngLat.lng, maxZoom);

		var content = "X, Y, Z<br/><b>" + x + ", " + y + ", " + maxZoom + "</b><hr/>";
		content += "Lat, Lng<br/><b>" + e.lngLat.lat + ", " + e.lngLat.lng + "</b>";

        new mapboxgl.Popup()
            .setLngLat(e.lngLat)
            .setHTML(content)
            .addTo(map);

        console.log(e.lngLat)

	}

	function long2tile(lon,zoom) {
		return (Math.floor((lon+180)/360*Math.pow(2,zoom)));
	}

	function lat2tile(lat,zoom)  {
		return (Math.floor((1-Math.log(Math.tan(lat*Math.PI/180) + 1/Math.cos(lat*Math.PI/180))/Math.PI)/2 *Math.pow(2,zoom)));
	}

	function tile2long(x,z) {
		return (x/Math.pow(2,z)*360-180);
	}

	function tile2lat(y,z) {
		var n=Math.PI-2*Math.PI*y/Math.pow(2,z);
		return (180/Math.PI*Math.atan(0.5*(Math.exp(n)-Math.exp(-n))));
	}

	function getTileRect(x, y, zoom) {

		var c1 = new mapboxgl.LngLat(tile2long(x, zoom), tile2lat(y, zoom));
		var c2 = new mapboxgl.LngLat(tile2long(x + 1, zoom), tile2lat(y + 1, zoom));

		return new mapboxgl.LngLatBounds(c1, c2);
	}

	function getMinZoom() {
		return Math.min(parseInt($("#zoom-from-box").val()), parseInt($("#zoom-to-box").val()));
	}

	function getMaxZoom() {
		return Math.max(parseInt($("#zoom-from-box").val()), parseInt($("#zoom-to-box").val()));
	}

	function getArrayByBounds(bounds) {

		var tileArray = [
			[ bounds.getSouthWest().lng, bounds.getNorthEast().lat ],
			[ bounds.getNorthEast().lng, bounds.getNorthEast().lat ],
			[ bounds.getNorthEast().lng, bounds.getSouthWest().lat ],
			[ bounds.getSouthWest().lng, bounds.getSouthWest().lat ],
			[ bounds.getSouthWest().lng, bounds.getNorthEast().lat ],
		];

		return tileArray;
	}

	function getPolygonByBounds(bounds) {

		var tilePolygonData = getArrayByBounds(bounds);

		var polygon = turf.polygon([tilePolygonData]);

		return polygon;
	}

	function isTileInSelection(tileRect) {

		var polygon = getPolygonByBounds(tileRect);

		var areaPolygon = draw.getAll().features[0];

		if(turf.booleanDisjoint(polygon, areaPolygon) == false) {
			return true;
		}

		return false;
	}

	function getBounds() {

		var coordinates = draw.getAll().features[0].geometry.coordinates[0];

		var bounds = coordinates.reduce(function(bounds, coord) {
			return bounds.extend(coord);
		}, new mapboxgl.LngLatBounds(coordinates[0], coordinates[0]));

		return bounds;
	}

	function getGrid(zoomLevel) {

		var bounds = getBounds();

		var rects = [];

		var outputScale = $("#output-scale").val();
		//var thisZoom = zoomLevel - (outputScale-1)
		var thisZoom = zoomLevel

		var TY    = lat2tile(bounds.getNorthEast().lat, thisZoom);
		var LX   = long2tile(bounds.getSouthWest().lng, thisZoom);
		var BY = lat2tile(bounds.getSouthWest().lat, thisZoom);
		var RX  = long2tile(bounds.getNorthEast().lng, thisZoom);

		for(var y = TY; y <= BY; y++) {
			for(var x = LX; x <= RX; x++) {

				var rect = getTileRect(x, y, thisZoom);

				rects.push({
					x: x,
					y: y,
					z: thisZoom,
					rect: rect,
				});

			}
		}

		return rects
	}

	function getAllGridTiles() {
		var allTiles = [];

		for(var z = getMinZoom(); z <= getMaxZoom(); z++) {
			var grid = getGrid(z);
			// TODO shuffle grid via a heuristic (hamlet curve? :/)
			allTiles = allTiles.concat(grid);
		}

		return allTiles;
	}

	function removeGrid() {
		removeLayer("grid-preview");
		$("#tile-info").text("");
	}

	// NEW: quick helpers --------------------------------------------------
	// Return a human-readable string given a size in kilobytes
	function humanReadableSize(kb) {
		var size = kb;
		var unit = " KB";
		if(size >= 1024) {
			size = size / 1024; // → MB
			unit = " MB";
			if(size >= 1024) {
				size = size / 1024; // → GB
				unit = " GB";
				if(size >= 1024) {
					size = size / 1024; // → TB
					unit = " TB";
				}
			}
		}
		// Keep one decimal place, strip trailing .0
		var str = size.toFixed(1);
		if(/\.0$/.test(str)) {
			str = parseInt(str);
		}
		return str.toLocaleString() + unit;
	}

	// Quickly estimate the total number of tiles across all zoom levels
	// WITHOUT generating the full grid (fast and safe)
	function estimateTileCount() {
		var bounds = getBounds();
		var minZ   = getMinZoom();
		var maxZ   = getMaxZoom();
		var total  = 0;

		for(var z = minZ; z <= maxZ; z++) {
			var TY = lat2tile(bounds.getNorthEast().lat, z);
			var LX = long2tile(bounds.getSouthWest().lng, z);
			var BY = lat2tile(bounds.getSouthWest().lat, z);
			var RX = long2tile(bounds.getNorthEast().lng, z);
			total += (BY - TY + 1) * (RX - LX + 1);
		}
		return total;
	}
	// ---------------------------------------------------------------------

	// Preview optimisation -------------------------------------------------
	const PREVIEW_Z_LIMIT = 20; // do not render grids finer than z 20

	// Build a single MultiLineString GeoJSON feature covering the grid lines
	function buildGridLines(bounds, zoom) {
		const TY = lat2tile(bounds.getNorthEast().lat,  zoom);
		const LX = long2tile(bounds.getSouthWest().lng, zoom);
		const BY = lat2tile(bounds.getSouthWest().lat,  zoom);
		const RX = long2tile(bounds.getNorthEast().lng, zoom);

		const lines = [];
		// Vertical grid lines (every x)
		for(let x = LX; x <= RX + 1; x++) {
			lines.push([
				[ tile2long(x, zoom), tile2lat(TY, zoom) ],
				[ tile2long(x, zoom), tile2lat(BY+1, zoom) ]
			]);
		}
		// Horizontal grid lines (every y)
		for(let y = TY; y <= BY + 1; y++) {
			lines.push([
				[ tile2long(LX, zoom),     tile2lat(y, zoom) ],
				[ tile2long(RX+1, zoom),   tile2lat(y, zoom) ]
			]);
		}

		return {
			type: "Feature",
			geometry: { type: "MultiLineString", coordinates: lines }
		};
	}
	// ---------------------------------------------------------------------

	function previewGrid() {

		// Guard: ensure a region is selected before previewing the grid
		if(draw.getAll().features.length === 0) {
			M.toast({html: 'You need to select a region first.', displayLength: 3000});
			return;
		}

		// 1. Show a quick estimate before heavy grid generation -------------
		var totalTiles = estimateTileCount();
		var estimatedKB = totalTiles * 155; // 155 KB per tile heuristic
		var estimatedSizeString = humanReadableSize(estimatedKB);
		M.toast({html: 'Total ' + totalTiles.toLocaleString() + ' tiles (~' + estimatedSizeString + ') in the region.', displayLength: 5000});
		// ------------------------------------------------------------------

		// Build lightweight grid preview using lines instead of polygons
		var previewZoom = Math.min(getMaxZoom(), PREVIEW_Z_LIMIT);
		var bounds = getBounds();
		var gridLines = buildGridLines(bounds, previewZoom);

		removeGrid();

		map.addLayer({
			id: "grid-preview",
			type: "line",
			source: { type: "geojson", data: gridLines },
			layout: {},
			paint: { "line-color": "#fa8231", "line-width": 2 }
		});

		// Tiles & size already shown earlier – no need to repeat here
	}

	function previewRect(rectInfo) {

		var array = getArrayByBounds(rectInfo.rect);

		var id = "temp-" + rectInfo.x + '-' + rectInfo.y + '-' + rectInfo.z;

		map.addLayer({
			'id': id,
			'type': 'line',
			'source': {
				'type': 'geojson',
				'data': turf.polygon([array]),
			},
			'layout': {},
			'paint': {
				"line-color": "#ff9f1a",
				"line-width": 3,
			}
		});

		return id;
	}

	function removeLayer(id) {
		if(map.getSource(id) != null) {
			map.removeLayer(id);
			map.removeSource(id);
		}
	}

	function generateQuadKey(x, y, z) {
	    var quadKey = [];
	    for (var i = z; i > 0; i--) {
	        var digit = '0';
	        var mask = 1 << (i - 1);
	        if ((x & mask) != 0) {
	            digit++;
	        }
	        if ((y & mask) != 0) {
	            digit++;
	            digit++;
	        }
	        quadKey.push(digit);
	    }
	    return quadKey.join('');
	}

	function initializeDownloader() {

		bar = new ProgressBar.Circle($('#progress-radial').get(0), {
			strokeWidth: 12,
			easing: 'easeOut',
			duration: 200,
			trailColor: '#eee',
			trailWidth: 1,
			from: {color: '#0fb9b1', a:0},
			to: {color: '#20bf6b', a:1},
			svgStyle: null,
			step: function(state, circle) {
				circle.path.setAttribute('stroke', state.color);
			}
		});

		$("#download-button").click(startDownloading)
		$("#stop-button").click(stopDownloading)

		var timestamp = Date.now().toString();
		//$("#output-directory-box").val(timestamp)
	}

	function showTinyTile(base64) {
		var currentImages = $(".tile-strip img");

		for(var i = 4; i < currentImages.length; i++) {
			$(currentImages[i]).remove();
		}

		var image = $("<img/>").attr('src', "data:image/png;base64, " + base64)

		var strip = $(".tile-strip");
		strip.prepend(image)
	}

	async function startDownloading() {

		if(draw.getAll().features.length == 0) {
			M.toast({html: 'You need to select a region first.', displayLength: 3000})
			return;
		}

		cancellationToken = false; 
		requests = [];

		$("#main-sidebar").hide();
		$("#download-sidebar").show();
		$(".tile-strip").html("");
		$("#stop-button").html("STOP");
		removeGrid();
		clearLogs();
		M.Toast.dismissAll();

		var timestamp = Date.now().toString();

		var allTiles = getAllGridTiles();
		updateProgress(0, allTiles.length);

		var numThreads = parseInt($("#parallel-threads-box").val());
		var outputDirectory = $("#output-directory-box").val();
		var outputFile = $("#output-file-box").val();
		var outputType = $("#output-type").val();
		var outputScale = $("#output-scale").val();
		var source = $("#source-box").val()

		var bounds = getBounds();
		var boundsArray = [bounds.getSouthWest().lng, bounds.getSouthWest().lat, bounds.getNorthEast().lng, bounds.getNorthEast().lat]
		var centerArray = [bounds.getCenter().lng, bounds.getCenter().lat, getMaxZoom()]
		
		var data = new FormData();
		data.append('minZoom', getMinZoom())
		data.append('maxZoom', getMaxZoom())
		data.append('outputDirectory', outputDirectory)
		data.append('outputFile', outputFile)
		data.append('outputType', outputType)
		data.append('outputScale', outputScale)
		data.append('source', source)
		data.append('timestamp', timestamp)
		data.append('bounds', boundsArray.join(","))
		data.append('center', centerArray.join(","))

		var request = await $.ajax({
			url: "/start-download",
			async: true,
			timeout: 30 * 1000,
			type: "post",
			contentType: false,
			processData: false,
			data: data,
			dataType: 'json',
		})

		let i = 0;
		var iterator = async.eachLimit(allTiles, numThreads, function(item, done) {

			if(cancellationToken) {
				return;
			}

			var boxLayer = previewRect(item);

			var url = "/download-tile";

			var data = new FormData();
			data.append('x', item.x)
			data.append('y', item.y)
			data.append('z', item.z)
			data.append('quad', generateQuadKey(item.x, item.y, item.z))
			data.append('outputDirectory', outputDirectory)
			data.append('outputFile', outputFile)
			data.append('outputType', outputType)
			data.append('outputScale', outputScale)
			data.append('timestamp', timestamp)
			data.append('source', source)
			data.append('bounds', boundsArray.join(","))
			data.append('center', centerArray.join(","))

			var request = $.ajax({
				"url": url,
				async: true,
				timeout: 30 * 1000,
				type: "post",
			    contentType: false,
			    processData: false,
				data: data,
				dataType: 'json',
			}).done(function(data) {

				if(cancellationToken) {
					return;
				}

				if(data.code == 200) {
					showTinyTile(data.image)
					logItem(item.x, item.y, item.z, data.message);
				} else {
					logItem(item.x, item.y, item.z, data.code + " Error downloading tile");
				}

			}).fail(function(data, textStatus, errorThrown) {

				if(cancellationToken) {
					return;
				}

				logItem(item.x, item.y, item.z, "Error while relaying tile");
				//allTiles.push(item);

			}).always(function(data) {
				i++;

				removeLayer(boxLayer);
				updateProgress(i, allTiles.length);

				done();
				
				if(cancellationToken) {
					return;
				}
			});

			requests.push(request);

		}, async function(err) {

			var request = await $.ajax({
				url: "/end-download",
				async: true,
				timeout: 30 * 1000,
				type: "post",
				contentType: false,
				processData: false,
				data: data,
				dataType: 'json',
			})

			updateProgress(allTiles.length, allTiles.length);
			logItemRaw("All requests are done");

			$("#stop-button").html("FINISH");
		});

	}

	function updateProgress(value, total) {
		var progress = value / total;

		bar.animate(progress);
		bar.setText(Math.round(progress * 100) + '<span>%</span>');

		$("#progress-subtitle").html(value.toLocaleString() + " <span>out of</span> " + total.toLocaleString())
	}

	function logItem(x, y, z, text) {
		logItemRaw(x + ',' + y + ',' + z + ' : ' + text)
	}

	function logItemRaw(text) {

		var logger = $('#log-view');
		logger.val(logger.val() + '\n' + text);

		logger.scrollTop(logger[0].scrollHeight);
	}

	function clearLogs() {
		var logger = $('#log-view');
		logger.val('');
	}

	function stopDownloading() {
		cancellationToken = true;

		for(var i =0 ; i < requests.length; i++) {
			var request = requests[i];
			try {
				request.abort();
			} catch(e) {

			}
		}

		$("#main-sidebar").show();
		$("#download-sidebar").hide();
		removeGrid();
		clearLogs();

	}

	// Build the final output path for a given tile x, y, z using the current
	// values from the "More Options" section (directory / filename templates)
	function buildOutputPath(x, y, z) {
		var outputDirectory = $("#output-directory-box").val();
		var outputFile = $("#output-file-box").val();

		// Ensure we have some directory text – fallback to empty string
		if(!outputDirectory) {
			outputDirectory = "";
		}

		var quad = generateQuadKey(x, y, z);

		var path = (outputDirectory ? outputDirectory + "/" : "") + outputFile;

		var replacements = {
			"{x}": x,
			"{y}": y,
			"{z}": z,
			"{quad}": quad
		};

		for (var key in replacements) {
			path = path.split(key).join(replacements[key]);
		}

		return path;
	}

	// Mouse-move handler to update filename preview under the main title
	function handleMouseMove(e) {
		// We only want to react when the user has previewed the grid
		if(map.getLayer("grid-preview") == null) {
			$("#tile-info").text("");
			return;
		}

		// Guard: ensure draw is initialised and a selection exists
		if(!draw || draw.getAll().features.length === 0) {
			$("#tile-info").text("");
			return;
		}

		// Check if the mouse is inside the selected polygon
		var point = turf.point([e.lngLat.lng, e.lngLat.lat]);
		var selectionPolygon = draw.getAll().features[0];
		if(turf.booleanPointInPolygon(point, selectionPolygon) === false) {
			$("#tile-info").text("");
			return;
		}

		var z = getMaxZoom();
		var x = long2tile(e.lngLat.lng, z);
		var y = lat2tile(e.lngLat.lat, z);

		var path = buildOutputPath(x, y, z);
		$("#tile-info").text(path);
	}

	initializeMaterialize();
	initializeSources();
	initializeMap();
	initializeSearch();
	initializeRectangleTool();
	initializeGridPreview();
	initializeMoreOptions();
	initializeZoomButtons();
	initializeOpenInGoogle();
	initializeDownloader();
});