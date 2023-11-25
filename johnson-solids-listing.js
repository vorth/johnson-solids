import { models } from './johnson-solids-challenge-models.js';

let selectedRow;

const table = document.getElementById( "partsTable" );
const tbody = table.createTBody();
for (const jsolid of models) {
  const id = jsolid.id;
  const tr = tbody.insertRow();
  fillRow(tr, jsolid);
  tr.addEventListener("click",
    () => { 
        if(jsolid.url) {
          switchModel(jsolid);
          if ( selectedRow ) {
            selectedRow.className = "";
          }
          selectedRow = tr;
          selectedRow.className = "selected";
          const index = document.getElementById( "index" );
          // TODO: Don't overwrite scene checkbox here. Use an inner div. 
          index.textContent = "J" +id;
      } else {
        alert("Johnson solid J" + id + " is not yet available.\n\nPlease help us collect the full set.");
      }
    }
  );
}
document.getElementById( "showEdges" ),addEventListener("click",
  () => {
    // TODO: setScene("data-field" of the selected tr (which will initially be null or undefined));
  }
)

function fillRow(tr, jsolid) {
  const id = jsolid.id;
  const title = jsolid.title;
  const field = jsolid.field;
  const url = jsolid.url;
  if(!tr.id) {
    tr.id = "jsolid-" + id;
  }
  tr.setAttribute("data-id", id);
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
  const viewer = document.getElementById( "viewer" );
  viewer.src = jsolid.url;
  setScene( jsolid.field );
}

function setScene( field ) {
  let sceneName = "";
  if(field == "Golden") {
    sceneName = document.getElementById( "showEdges" ).checked ? "Edges" : "Faces";
  }
  const viewer = document.getElementById( "viewer" );
  viewer.scene = sceneName;
}
