import { models } from './johnson-solids-models.js';

let selectedRow;
let scenes;

const table = document.getElementById( "partsTable" );
const tbody = table.createTBody();
const viewer = document.getElementById( "viewer" );
const showEdges = document.getElementById( "showEdges" );

viewer .addEventListener( "vzome-scenes-discovered", (e) => {
  scenes = e.detail;
  console.log( "scenes discovered in " + viewer.src + "\n" + JSON.stringify( scenes, null, 2 ) );
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
    const { field, edgeScene, faceScene, zometool } = selectedRow.dataset;
    setScene(field, zometool);
  } );

function selectJohnsonSolid( jsolid, tr ) {
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

function fillRow(tr, jsolid) {
  const { id, title, field, url, edgeScene, faceScene, zometool } = jsolid;
  tr.setAttribute("data-field", field);
  tr.setAttribute("data-edgeScene", edgeScene);
  tr.setAttribute("data-faceScene", faceScene);
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
  const { field, url, zometool } = jsolid;
  viewer.src = url;
  setScene( field, zometool );
}

function setScene( field, zometool ) {
  const scene = sceneFor(field, zometool);
  document.getElementById( "zome-switch" ).className = ( !!scene && !!zometool ) ? 'zome' : 'no-zome';
  viewer.scene = scene;
  viewer.update({ camera: false });
  console.log("setScene( '" + field + "', '" + zometool + "' ) = '" + scene + "'");
}

function sceneFor( field, zometool ) {
  // TODO: update this to use edgeScene and faceScene from the json
  // instead of relying on naming convention.
  // That will also allow multiple solids to share the same vZome file.
  return field == "Golden" && zometool == "true"
    ? showEdges.checked 
      ? "Edges"
      : "Faces"
    : "";
}

