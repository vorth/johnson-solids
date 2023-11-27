import { models } from './johnson-solids-challenge-models.js';

let selectedRow;

const table = document.getElementById( "partsTable" );
const tbody = table.createTBody();
for (const jsolid of models) {
  // include a "ready" query param in the URL to show only the jsolids that have a URL defined 
  if(jsolid.url || (new URL(document.location)).searchParams.get("ready") == null) {
    const tr = tbody.insertRow();
    fillRow(tr, jsolid);
    tr.addEventListener("click", () => selectJohnsonSolid( jsolid, tr ) );
  }
}
selectJohnsonSolid( models[ 0 ], tbody .rows[ 0 ] );
document.getElementById( "showEdges" ).addEventListener("change", () => // use "change" here, not "click"
  {
    console.log("checkbox changed");
    setScene(selectedRow.dataset.field);
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
  const { id, title, field, url } = jsolid;
  if(!tr.id) {
    tr.id = "jsolid-" + id;
  }
  tr.setAttribute("data-field", field);
  // Id column
  let td = tr.insertCell();
  td.className = url ? "ident done" : "ident todo";
  td.innerHTML = id;
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
  document.getElementById( "viewer" ).src = jsolid.url;
  setScene( jsolid.field );
}

function setScene( field ) {
  const scene = sceneFor(field);
  document.getElementById( "viewer" ).scene = scene;
  if ( !!scene )
    document.getElementById( "zome-switch" ).className = 'zome';
  else
    document.getElementById( "zome-switch" ).className = 'no-zome';
  console.log("setScene( '" + field + "' ) = '" + scene + "'");
}

function sceneFor( field ) {
  return field == "Golden"
    ? document.getElementById( "showEdges" ).checked 
      ? "Edges"
      : "Faces"
    : "";
}

