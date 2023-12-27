import { models } from './johnson-solids-models.js';

let selectedRow;
const table = document.getElementById( "partsTable" );
const tbody = table.createTBody();
const viewer = document.getElementById( "viewer" );
const showEdges = document.getElementById( "showEdges" );
const zomeSwitch = document.getElementById( "zome-switch" );
const downloadLink = document.getElementById( "download" );

const shapeColors = new Map();
shapeColors.set( 3, "#F0A000"); // yellow strut
shapeColors.set( 4, "#007695"); // blue strut
shapeColors.set( 5, "#AF0000"); // red strut
shapeColors.set( 6, "#F7CF7F"); // yellow panel
shapeColors.set( 8, "#7FBACA"); // blue panel
shapeColors.set(10, "#D77F7F"); // red panel

// include a "download=true" query param in the URL to make the ID in the viewer become the recolor download link
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
		var stringifiedData = JSON.stringify( recolor(modelData), null, 2);
		const blobUrl = URL.createObjectURL(new Blob([stringifiedData], { type: "application/json" }));
		downloadLink.href = blobUrl;
		downloadLink.click();
	})
	.catch(error => {
		console.log(error);
		alert(error);
	});
}

function recolor(modelData) {
	const faceMap = new Map();
	for(const shape of modelData.shapes) {
		faceMap.set(shape.id, shape.vertices.length);
	}
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
	for(const scene of modelData.scenes) {
		if(facescenes.includes(scene.title)) {
			snapshots.push(scene.snapshot);
		}
	}
	for(const snapshot of snapshots) {
		for(let i = 0; i < modelData.snapshots[snapshot].length; i++) {
			const item = modelData.snapshots[snapshot][i];
			const shapeGuid = item.shape;
			const nVertices = faceMap.get(shapeGuid);
			const newColor = shapeColors.get(nVertices);
			if(newColor) {
				const oldColor = modelData.snapshots[snapshot][i].color;
				modelData.snapshots[snapshot][i].color = newColor;
			}
		}
	}
	return modelData;
}

viewer .addEventListener( "vzome-scenes-discovered", (e) => {
  // Just logging this to the console for now. Not actually using the scenes list.
  const scenes = e.detail;
  //console.log( "These scenes were discovered in " + viewer.src);
  console.log( JSON.stringify( scenes, null, 2 ) );
} );

for (const jsolid of models) {
  // include a "ready" query param in the URL to show only the jsolids that have a URL defined 
  if(jsolid.url || (new URL(document.location)).searchParams.get("ready") == null) {
    const tr = tbody.insertRow();
    fillRow(tr, jsolid);
    tr.addEventListener("click", () => selectJohnsonSolid( jsolid, tr ) );
  }
}
selectJohnsonSolid( models[ 0 ], tbody .rows[ 0 ] );
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
  const zomeBuildable = field == "Golden" && zometool == "true" && url ? "*" : "";
  td.innerHTML = zomeBuildable + "J" + id;
  // title column
  td = tr.insertCell();
  td.className = "title";
  if(!!field) {
    td.className += " " + field.toLowerCase();
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
