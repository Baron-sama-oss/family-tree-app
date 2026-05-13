const state = { trees: {}, activeTree: null };

const treeNameInput = document.getElementById("treeName");
const createTreeBtn = document.getElementById("createTreeBtn");
const treeSelect = document.getElementById("treeSelect");
const personForm = document.getElementById("personForm");
const relationType = document.getElementById("relationType");
const spouseTarget = document.getElementById("spouseTarget");
const motherTarget = document.getElementById("motherTarget");
const fatherTarget = document.getElementById("fatherTarget");
const brotherTarget = document.getElementById("brotherTarget");
const sisterTarget = document.getElementById("sisterTarget");
const spouseLabel = document.getElementById("spouseLabel");
const motherLabel = document.getElementById("motherLabel");
const fatherLabel = document.getElementById("fatherLabel");
const brotherLabel = document.getElementById("brotherLabel");
const sisterLabel = document.getElementById("sisterLabel");
const treeGraph = document.getElementById("treeGraph");

const editForm = document.getElementById("editForm");
const editPersonSelect = document.getElementById("editPersonSelect");
const editName = document.getElementById("editName");
const editFamily = document.getElementById("editFamily");
const editGender = document.getElementById("editGender");
const editImage = document.getElementById("editImage");
const deletePersonBtn = document.getElementById("deletePersonBtn");

const labelFor = (p) => `${p.name} [${p.gender}]`;

function option(el, value, text) { const o = document.createElement("option"); o.value = value; o.textContent = text; el.appendChild(o); }

function createTree(name) {
  if (!name || state.trees[name]) return;
  state.trees[name] = { people: [] };
  state.activeTree = name;
  refreshAll();
}

function refreshTreeSelectors() {
  treeSelect.innerHTML = "";
  Object.keys(state.trees).forEach((name) => option(treeSelect, name, name));
  treeSelect.value = state.activeTree || "";
}

function refreshPeopleDropdowns() {
  [spouseTarget, motherTarget, fatherTarget, brotherTarget, sisterTarget].forEach((el) => (el.innerHTML = ""));
  option(spouseTarget, "", "-- Select person --");
  option(motherTarget, "", "-- Select mother (Female) --");
  option(fatherTarget, "", "-- Select father (Male) --");
  option(brotherTarget, "", "-- Select brother target (Male) --");
  option(sisterTarget, "", "-- Select sister target (Female) --");

  const people = state.trees[state.activeTree]?.people || [];
  people.forEach((p) => {
    option(spouseTarget, p.id, labelFor(p));
    if (p.gender === "Female") { option(motherTarget, p.id, labelFor(p)); option(sisterTarget, p.id, labelFor(p)); }
    if (p.gender === "Male") { option(fatherTarget, p.id, labelFor(p)); option(brotherTarget, p.id, labelFor(p)); }
  });
}

function refreshEditFormList() {
  editPersonSelect.innerHTML = "";
  option(editPersonSelect, "", "-- Select person --");
  const people = state.trees[state.activeTree]?.people || [];
  people.forEach((p) => option(editPersonSelect, p.id, labelFor(p)));
}

function loadSelectedForEdit() {
  const people = state.trees[state.activeTree]?.people || [];
  const person = people.find((p) => p.id === editPersonSelect.value);
  if (!person) return;
  editName.value = person.name;
  editFamily.value = person.familyName;
  editGender.value = person.gender;
}

function toggleRelationFields() {
  const type = relationType.value;
  spouseLabel.style.display = type === "spouse" ? "flex" : "none";
  motherLabel.style.display = type === "child" ? "flex" : "none";
  fatherLabel.style.display = type === "child" ? "flex" : "none";
  brotherLabel.style.display = type === "brother" ? "flex" : "none";
  sisterLabel.style.display = type === "sister" ? "flex" : "none";
}

function computeLevels(people) {
  const byId = new Map(people.map((p) => [p.id, p]));
  const level = {};

  function setLevel(id) {
    if (level[id] !== undefined) return level[id];
    const person = byId.get(id);
    if (!person || !person.parents.length) return (level[id] = 0);
    level[id] = Math.max(...person.parents.map((pid) => setLevel(pid))) + 1;
    return level[id];
  }

  people.forEach((p) => setLevel(p.id));

  // Keep spouses on the same generation row so married pairs render side-by-side.
  let changed = true;
  while (changed) {
    changed = false;
    people.forEach((p) => {
      p.spouses.forEach((sid) => {
        if (level[sid] === undefined) return;
        const target = Math.max(level[p.id], level[sid]);
        if (level[p.id] !== target) {
          level[p.id] = target;
          changed = true;
        }
        if (level[sid] !== target) {
          level[sid] = target;
          changed = true;
        }
      });
    });
  }

  return level;
}

function renderGraph() {
  treeGraph.innerHTML = "";
  const people = state.trees[state.activeTree]?.people || [];
  if (!people.length) return;

  const levels = computeLevels(people), grouped = {};
  people.forEach((p) => { const lvl = levels[p.id] || 0; (grouped[lvl] ||= []).push(p); });

  const nodeW = 205, nodeH = 102, gapX = 50, gapY = 95, margin = 40;
  const maxCols = Math.max(...Object.values(grouped).map((arr) => arr.length));
  const width = margin * 2 + maxCols * nodeW + (maxCols - 1) * gapX;
  const depth = Object.keys(grouped).length;
  const height = margin * 2 + depth * nodeH + (depth - 1) * gapY;

  const pos = {};
  Object.entries(grouped).forEach(([lvl, arr]) => {
    const total = arr.length * nodeW + (arr.length - 1) * gapX;
    let x = (width - total) / 2;
    const y = margin + Number(lvl) * (nodeH + gapY);
    arr.forEach((p) => { pos[p.id] = { x, y }; x += nodeW + gapX; });
  });

  const svg = document.createElementNS("http://www.w3.org/2000/svg", "svg");
  svg.setAttribute("width", width); svg.setAttribute("height", height);

  people.forEach((child) => child.parents.forEach((pid) => {
    const p1 = pos[pid], p2 = pos[child.id]; if (!p1 || !p2) return;
    const line = document.createElementNS(svg.namespaceURI, "line");
    line.setAttribute("x1", p1.x + nodeW / 2); line.setAttribute("y1", p1.y + nodeH);
    line.setAttribute("x2", p2.x + nodeW / 2); line.setAttribute("y2", p2.y);
    line.setAttribute("stroke", "#d4af37"); line.setAttribute("stroke-width", "2.4"); svg.appendChild(line);
  }));

  people.forEach((p) => p.spouses.forEach((sid) => {
    if (p.id > sid) return; const a = pos[p.id], b = pos[sid]; if (!a || !b || a.y !== b.y) return;
    const line = document.createElementNS(svg.namespaceURI, "line");
    line.setAttribute("x1", a.x + nodeW); line.setAttribute("y1", a.y + nodeH / 2);
    line.setAttribute("x2", b.x); line.setAttribute("y2", b.y + nodeH / 2);
    line.setAttribute("stroke", "#8c6239"); line.setAttribute("stroke-width", "2"); line.setAttribute("stroke-dasharray", "6 5");
    svg.appendChild(line);
  }));


  // Sibling lines (single solid lines): connect siblings sharing at least one parent.
  const siblingPairs = new Set();
  people.forEach((p) => {
    p.parents.forEach((pid) => {
      const parent = people.find((x) => x.id === pid);
      if (!parent) return;
      parent.children.forEach((cid) => {
        if (cid === p.id) return;
        const key = [p.id, cid].sort().join("::");
        siblingPairs.add(key);
      });
    });
  });

  siblingPairs.forEach((key) => {
    const [aId, bId] = key.split("::");
    const a = pos[aId], b = pos[bId];
    if (!a || !b || a.y !== b.y) return;
    const line = document.createElementNS(svg.namespaceURI, "line");
    line.setAttribute("x1", a.x + nodeW / 2);
    line.setAttribute("y1", a.y + nodeH + 8);
    line.setAttribute("x2", b.x + nodeW / 2);
    line.setAttribute("y2", b.y + nodeH + 8);
    line.setAttribute("stroke", "#d4af37");
    line.setAttribute("stroke-width", "1.8");
    svg.appendChild(line);
  });

  people.forEach((p) => {
    const { x, y } = pos[p.id];
    const rect = document.createElementNS(svg.namespaceURI, "rect");
    rect.setAttribute("x", x); rect.setAttribute("y", y); rect.setAttribute("width", nodeW); rect.setAttribute("height", nodeH);
    rect.setAttribute("rx", "11"); rect.setAttribute("fill", "#111"); rect.setAttribute("stroke", "#8c6239"); rect.setAttribute("stroke-width", "1.6");

    const name = document.createElementNS(svg.namespaceURI, "text");
    name.setAttribute("x", x + 76); name.setAttribute("y", y + 30); name.setAttribute("fill", "#f8ebc6");
    name.setAttribute("font-size", "15"); name.setAttribute("font-family", "Georgia, serif"); name.textContent = `${p.name} [${p.gender}]`;

    const meta = document.createElementNS(svg.namespaceURI, "text");
    meta.setAttribute("x", x + 76); meta.setAttribute("y", y + 53); meta.setAttribute("fill", "#baa57a"); meta.setAttribute("font-size", "12");
    meta.textContent = `Family: ${p.familyName}`;

    const image = document.createElementNS(svg.namespaceURI, "image");
    image.setAttribute("href", p.image || "https://placehold.co/60x60/111111/d4af37?text=%E2%98%85");
    image.setAttribute("x", x + 10); image.setAttribute("y", y + 16); image.setAttribute("width", 56); image.setAttribute("height", 56);
    image.setAttribute("preserveAspectRatio", "xMidYMid slice");

    svg.append(rect, image, name, meta);
  });

  treeGraph.appendChild(svg);
}

async function fileToDataUrl(file) {
  return new Promise((resolve) => { if (!file) return resolve(""); const reader = new FileReader(); reader.onload = () => resolve(reader.result); reader.readAsDataURL(file); });
}

function refreshAll() { refreshTreeSelectors(); refreshPeopleDropdowns(); refreshEditFormList(); renderGraph(); }

createTreeBtn.addEventListener("click", () => { createTree(treeNameInput.value.trim()); treeNameInput.value = ""; });
treeSelect.addEventListener("change", () => { state.activeTree = treeSelect.value; refreshAll(); });
relationType.addEventListener("change", toggleRelationFields);
editPersonSelect.addEventListener("change", loadSelectedForEdit);

personForm.addEventListener("submit", async (e) => {
  e.preventDefault();
  if (!state.activeTree) return alert("Create a tree first.");
  const person = {
    id: crypto.randomUUID(),
    name: document.getElementById("personName").value.trim(),
    familyName: document.getElementById("personFamily").value.trim(),
    gender: document.getElementById("personGender").value,
    image: await fileToDataUrl(document.getElementById("personImage").files[0]),
    spouses: [], parents: [], children: [],
  };

  const people = state.trees[state.activeTree].people;
  people.push(person);
  const relType = relationType.value;

  if (relType === "spouse" && spouseTarget.value) {
    const partner = people.find((p) => p.id === spouseTarget.value);
    if (partner) { person.spouses.push(partner.id); partner.spouses.push(person.id); }
  }
  if (relType === "child") {
    const mother = people.find((p) => p.id === motherTarget.value), father = people.find((p) => p.id === fatherTarget.value);
    if (!mother || !father || mother.id === father.id) { people.pop(); return alert("Child requires both mother and father."); }
    person.parents.push(mother.id, father.id); mother.children.push(person.id); father.children.push(person.id);
    if (!mother.spouses.includes(father.id)) mother.spouses.push(father.id);
    if (!father.spouses.includes(mother.id)) father.spouses.push(mother.id);
  }
  if (relType === "brother" || relType === "sister") {
    const targetId = relType === "brother" ? brotherTarget.value : sisterTarget.value;
    const sibling = people.find((p) => p.id === targetId);
    if (!sibling) { people.pop(); return alert(`Please select a ${relType} target.`); }
    person.parents = [...sibling.parents];
    sibling.parents.forEach((pid) => { const parent = people.find((p) => p.id === pid); if (parent) parent.children.push(person.id); });
  }

  personForm.reset();
  toggleRelationFields();
  refreshAll();
});

editForm.addEventListener("submit", async (e) => {
  e.preventDefault();
  const people = state.trees[state.activeTree]?.people || [];
  const person = people.find((p) => p.id === editPersonSelect.value);
  if (!person) return alert("Select a person to edit.");
  person.name = editName.value.trim() || person.name;
  person.familyName = editFamily.value.trim() || person.familyName;
  person.gender = editGender.value;
  if (editImage.files[0]) person.image = await fileToDataUrl(editImage.files[0]);
  refreshAll();
});

deletePersonBtn.addEventListener("click", () => {
  const people = state.trees[state.activeTree]?.people || [];
  const id = editPersonSelect.value;
  if (!id) return alert("Select a person to remove.");
  const idx = people.findIndex((p) => p.id === id);
  if (idx === -1) return;
  people.splice(idx, 1);
  people.forEach((p) => {
    p.spouses = p.spouses.filter((sid) => sid !== id);
    p.parents = p.parents.filter((pid) => pid !== id);
    p.children = p.children.filter((cid) => cid !== id);
  });
  editForm.reset();
  refreshAll();
});

toggleRelationFields();
