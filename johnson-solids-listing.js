import { models } from './johnson-solids-models.js';

let selectedRow;
const table = document.getElementById( "partsTable" );
const tbody = table.createTBody();
const viewer = document.getElementById( "viewer" );
const showEdges = document.getElementById( "showEdges" );
const zomeSwitch = document.getElementById( "zome-switch" );

viewer .addEventListener( "vzome-scenes-discovered", (e) => {
  // Just logging this to the console for now. Not actually using the scenes list.
  const scenes = e.detail;
  console.log( "These scenes were discovered in " + viewer.src + "\n" + JSON.stringify( scenes, null, 2 ) );
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
  zomeSwitch.className = ( !!zometool ) ? 'zome' : 'no-zome';
  viewer.scene = scene;
  console.log("Setting scene to '" + scene + "'");
  viewer.update({ camera: false });
}
