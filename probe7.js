// Probe d'introspection : lister TOUS les champs du type NBACard
async function run() {
  const q = `query {
    __type(name: "NBACard") {
      fields {
        name
        type { name kind ofType { name kind } }
      }
    }
  }`;
  const r = await fetch('https://api.sorare.com/federation/graphql', {
    method:'POST', headers:{'Content-Type':'application/json'}, body:JSON.stringify({query:q})
  });
  const d = await r.json();
  if (d.errors) { console.log("ERREUR:", JSON.stringify(d.errors)); return; }
  const fields = d.data.__type.fields;
  console.log("=== CHAMPS DISPONIBLES SUR NBACard ===\n");
  for (const f of fields) {
    const t = f.type.name || f.type.ofType?.name || f.type.kind;
    console.log(f.name + "  (" + t + ")");
  }
}
run();
