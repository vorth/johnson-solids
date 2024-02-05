import { models } from './johnson-solids-models.js';

let selectedRow;
const table = document.getElementById( "partsTable" );
const tbody = table.createTBody();
const viewer = document.getElementById( "viewer" );
const showEdges = document.getElementById( "showEdges" );
const zomeSwitch = document.getElementById( "zome-switch" );
const downloadLink = document.getElementById( "download" );
const sigfig = 1000000000; // significant digits for rounding

const shapeColors = new Map();
shapeColors.set( 3, "#F0A000"); // yellow strut
shapeColors.set( 4, "#007695"); // blue strut
shapeColors.set( 5, "#AF0000"); // red strut
shapeColors.set( 6, "#008D36"); // green strut
shapeColors.set( 8, "#DC4C00"); // orange strut
shapeColors.set(10, "#6C00C6"); // purple strut

// include a "download=true" query param in the URL to make the ID in the viewer become the .shapes.json download link
if(new URL(document.location).searchParams.get("download") == "true") {
	document.getElementById( "index" ).addEventListener( "click", downloadShapesJson );
}

function downloadShapesJson() {
	const url = viewer.src.replace( ".vZome", ".shapes.json" );
	const filename = url.substring(url.lastIndexOf( "/" ) + 1);
	alert( url );
	
	fetch(url)
	.then(response => {
        if(!response.ok) {
			console.log(response);
			throw new Error(response.url + "\n\n" + response.status + " " + response.statusText) 
        } 
		downloadLink.setAttribute( "download", filename );
		return response.json(); 
	} )
	.then(modelData => {
		const stringifiedData = JSON.stringify(postProceess(modelData), null, 2);
		const blobUrl = URL.createObjectURL(new Blob([stringifiedData], { type: "application/json" }));
		downloadLink.href = blobUrl;
		downloadLink.click();
		URL.revokeObjectURL(blobUrl); // release blobURL resources now that we're done with it.
		downloadLink.href = ""; // remove the reference to the released blobURL.
	})
	.catch(error => {
		console.log(error);
		alert(error);
	});
}

function postProceess(modelData) {
	//recolor(modelData); // Shouldn't be needed any more
	rescale(modelData);
	standardizeCameras(modelData);
	return modelData;
}

function standardizeCameras(modelData) {
	// Adjust all camera settings to the same values
	// so that any model that's the first one loaded will have the same the initial camera.
	// Any model could be the one that sets the default camera if the "J=" queryparam is used.
	standardizeCamera(modelData.camera);
	for(let scene of modelData.scenes) {
		// scene views are not used by the Johnson solids app, but we'll standardize them anyway since we're here
		standardizeCamera(scene.view);
	}
	return modelData;
}

function standardizeCamera(camera) {
	const viewDistance = 10;
    camera.viewDistance = 10;
    camera.farClipDistance = viewDistance * 2;
	camera.nearClipDistance = viewDistance * .0025;
    camera.fieldOfView = viewDistance * .44;
    camera.width = viewDistance * .45;

	camera.perspective = true;
	camera.stereo = false;

	camera.position.x = 0;
	camera.position.y = 0;
	camera.position.z = camera.viewDistance;

    camera.lookAtPoint.x = 0;
    camera.lookAtPoint.y = 0;
    camera.lookAtPoint.z = 0;

    camera.upDirection.x = 0;
    camera.upDirection.y = 1;
    camera.upDirection.z = 0;
	
    camera.lookDirection.x = 0;
    camera.lookDirection.y = 0;
    camera.lookDirection.z = -1;
    
	// don't need to return the camera because it's passed by reference and updated in situ
}

function rescale(modelData) {
	// Get a list of facescene(s) of all models that use the selected jsolid's URL.
	// There may be only one facescene, but there may be more than one. e.g. J38 & J39
	const url = viewer.src;
	const facescenes = [];
	for(const model of models) {
		if(model.url == url) {
			facescenes.push(model.facescene);
		}
	}
	const snapshots = [];
	// if(facescenes.includes("default scene")) {
	// 	snapshots.push(0);
	// }
	for(const scene of modelData.scenes) {
		if(facescenes.includes(scene.title)) {
			snapshots.push(scene.snapshot);
		}
	}
	const shapeMap = new Map();
	for(const shape of modelData.shapes) {
		shapeMap.set(shape.id, shape);
	}
	var nTriangleEdges = 0;
	var sumOfLengths = 0;
	for(const snapshot of snapshots) {
		const ss = modelData.snapshots[snapshot];
		for(let i = 0; i < ss.length; i++) {
			const item = ss[i];
			const shapeGuid = item.shape;
			const vertices = shapeMap.get(shapeGuid).vertices;
			if(vertices.length == 3) {
				// All Johnson solids have at least one equilateral triangle face.
				// All other polygons are chopped into triangles that are not necessarily equilateral.
				// I'll use the average length of all the edges of all the triangular faces
				// to calculate the rescaling factor.
				// Note that the edges will be counted twice when two triangles share an edge,
				// and other triangle edges will only be counted once when a triangle shares
				// an edge with a larger polygon such as a square.
				// It's not worth the effort to distinguish the two cases for this application.
				// In fact, it would work well enough by just using the first equilateral triangle 
				// edge length that we encounter.
				sumOfLengths += edgeLength(vertices[0], vertices[1]); nTriangleEdges++;
				sumOfLengths += edgeLength(vertices[1], vertices[2]); nTriangleEdges++;
				sumOfLengths += edgeLength(vertices[2], vertices[0]); nTriangleEdges++;
			}
		}
	}
	
	const averageLength = sumOfLengths / nTriangleEdges;
	console.log("averageLength = " + averageLength + "  (Ideal length = 2.0.)");
	
	// Many models have an averageLength of 8.472135952064994 = (2+4phi) corresponding to blue zometool lengths.
	// The target edge length will be 2 because most of the coordinates on qfbox and wikipedia
	// have edge length of 2, resulting in a half edge length of 1 on each side of the symmetry plane(s).
	const scaleFactor = Math.round((2.0 / averageLength) * sigfig) / sigfig;
	
	console.log("scaleFactor = " + scaleFactor);
	if(!!modelData.scaleFactor) {
		console.log("Previously calculated scaleFactor of " + modelData.scaleFactor + " will not be modified.");
	} else {
		// persist scaleFactor in the json
		modelData.scaleFactor = scaleFactor;
		
		const sigScaleFactor = scaleFactor * sigfig; // scaleVector() will divide by sigfig after rounding
		// scale all shapes
		for(let s = 0; s < modelData.shapes.length; s++) {
			for(let v = 0; v < modelData.shapes[s].vertices.length; v++) {
				scaleVector(sigScaleFactor, modelData.shapes[s].vertices[v]);
			}
		}
		// scale all instances
		//console.log(modelData.instances.length + " instances");
		for(let i = 0; i < modelData.instances.length; i++) {
			scaleVector(sigScaleFactor, modelData.instances[i].position);
		}
		// scale all snapshots
		//console.log(modelData.snapshots.length + " snapshots");
		for(let i = 0; i < modelData.snapshots.length; i++) {
			//console.log(modelData.snapshots[i].length + " snapshot[" + i + "]");
			for(let j = 0; j < modelData.snapshots[i].length; j++) {
				scaleVector(sigScaleFactor, modelData.snapshots[i][j].position);
			}
		}
	}
	return modelData;
}

function edgeLength(v0, v1) {
	const x = v0.x - v1.x;
	const y = v0.y - v1.y;
	const z = v0.z - v1.z;
	return Math.sqrt((x*x)+(y*y)+(z*z));
}

function scaleVector(scalar, vector) {
	vector.x = Math.round( vector.x * scalar ) / sigfig;
	vector.y = Math.round( vector.y * scalar ) / sigfig;
	vector.z = Math.round( vector.z * scalar ) / sigfig;
	// don't need to return the vector because it's passed by reference and updated in situ
}

/*
function recolor(modelData) {
	// Get a list of facescene(s) of all models that use the selected jsolid's URL.
	// There may be only one facescene, but there may be more than one. e.g. J38 & J39
	const url = viewer.src;
	const facescenes = [];
	for(const model of models) {
		if(model.url == url) {
			facescenes.push(model.facescene);
		}
	}
	const snapshots = [];
	// if(facescenes.includes("default scene")) {
	// 	snapshots.push(0);
	// }
	for(const scene of modelData.scenes) {
		if(facescenes.includes(scene.title)) {
			snapshots.push(scene.snapshot);
		}
	}
	const shapeMap = new Map();
	for(const shape of modelData.shapes) {
		shapeMap.set(shape.id, shape.vertices.length);
	}
	console.dir(snapshots);
	for(const snapshot of snapshots) {
		const ss = modelData.snapshots[snapshot];
		for(let i = 0; i < ss.length; i++) {
			const item = ss[i];
			const shapeGuid = item.shape;
			const nVertices = shapeMap.get(shapeGuid);
			const newColor = shapeColors.get(nVertices);
			if(newColor) {
				modelData.snapshots[snapshot][i].color = newColor;
			}
		}
	}
	return modelData;
}
*/

viewer .addEventListener( "vzome-scenes-discovered", (e) => {
  // Just logging this to the console for now. Not actually using the scenes list.
  const scenes = e.detail;
  //console.log( "These scenes were discovered in " + viewer.src);
  console.log( JSON.stringify( scenes, null, 2 ) );
} );

for (const jsolid of models) {
  const tr = tbody.insertRow();
  fillRow(tr, jsolid);
  tr.addEventListener("click", () => selectJohnsonSolid( jsolid, tr ) );
}

var initialId = 1;
const jId = parseInt(new URL(document.location).searchParams.get("J"));
if(jId >= 1 && jId <= 92) {
	initialId = jId;
}
const initialRow = tbody.rows[ initialId - 1 ];
selectJohnsonSolid( models[ initialId - 1 ], initialRow );
initialRow.scrollIntoView(); // Note that this scrolls the table header row out of view. That's OK for now...

showEdges.addEventListener("change", // use "change" here, not "click"
  () => {
    setScene(selectedRow.dataset);
  } );

function selectJohnsonSolid( jsolid, tr ) {
	if(tr != selectedRow) {
	  const { url, id } = jsolid;
		if(url) {
		  if ( selectedRow ) {
			selectedRow.className = "";
		  }
		  selectedRow = tr;
		  selectedRow.className = "selected";
		  document.getElementById( "index" ).textContent = "J" +id;
		  //const shapes = url.replace( ".vZome", ".shapes.json" );
		  //downloadLink.href = shapes;
		  //const filename = shapes.substring(shapes.lastIndexOf('/')+1);
		  //downloadLink.download = filename;
		  /* 
		  Downloads local files as expected, but it won't directly download cross origin files in-situ.
		  One possible react solution is https://medium.com/charisol-community/downloading-resources-in-html5-a-download-may-not-work-as-expected-bf63546e2baa
		  The local downloadShapesJson() method works with local files as well as cross origin files.
		  */
		  switchModel(jsolid);
	  } else {
		  alert("Johnson solid J" + id + " is not yet available.\n\nPlease help us collect the full set.");
	  }
	}
}

function fillRow(tr, jsolid) {
  const { id, title, field, url, edgescene, facescene, zometool } = jsolid;
  // Data attribute names must be prefixed with 'data-' and should not contain any uppercase letters,
  tr.setAttribute("data-field", field);
  tr.setAttribute("data-edgescene", edgescene);
  tr.setAttribute("data-facescene", facescene);
  tr.setAttribute("data-zometool", !!zometool);
  if(!tr.id) {
    tr.id = "jsolid-" + id;
  }
  // Id column
  let td = tr.insertCell();
  td.className = url ? "ident done" : "ident todo";
  td.innerHTML = "J" + id;
  // title column
  td = tr.insertCell();
  td.className = "title";
  if(field == "Golden" && zometool == "true" && url) {
    td.className += " zometool";
  }
  if(!!title) {
    td.innerHTML = title;  
  }
}

function switchModel( jsolid ) {
  viewer.src = jsolid.url;
  setScene( jsolid );
}

function setScene( jsolidSceneData ) {
  // jsolidSceneData may be a jsolid object from the JSON
  /// or it may be selectedRow.dataset.
  // Either one should have these properties, all in lower case
  const { field, edgescene, facescene, zometool } = jsolidSceneData;
  const scene = field == "Golden" && zometool == "true" && showEdges.checked ? edgescene : facescene;
  zomeSwitch.className = ( zometool == "true" ) ? 'zome' : 'no-zome';
  viewer.scene = scene;
  //console.log("Setting scene to '" + scene + "'");
  viewer.update({ camera: false });
}
