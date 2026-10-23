// Offline BOM product scenes. Only the housing and cap reuse registered CAD;
// acrylic and extrusion proportions are illustration, not a fabrication release.
import {RoundedBoxGeometry} from "three/addons/geometries/RoundedBoxGeometry.js";

export const ids = ["magnet-cube", "printed-ring", "ring-cover", "acrylic", "aluminum-frame"];

const registeredR01 = [0.9999925155972529, 0.003868946817657601, 0, 0, -0.003868946817657601, 0.9999925155972529, 0, 0, 0, 0, 1, 0, 0, 0, 1.6171648557030746e-28, 1];

function edgeAccent(THREE, geometry, color, opacity = .15, angle = 35) {
  const edges = new THREE.LineSegments(new THREE.EdgesGeometry(geometry, angle), new THREE.LineBasicMaterial({color, transparent: true, opacity}));
  edges.renderOrder = 1;
  return edges;
}

function mesh(THREE, geometry, material) {
  const item = new THREE.Mesh(geometry, material);
  item.castShadow = true;
  item.receiveShadow = true;
  return item;
}

async function registeredSegment(THREE, name, {loadGLB}) {
  const source = await loadGLB("/assembly/layer-01.glb");
  source.updateMatrixWorld(true);
  const original = source.getObjectByName(name);
  if (!original?.isMesh) throw new Error(`Registered R01 CAD mesh not found: ${name}`);
  // Apply precisely the same proper rigid registration as the teaching scene.
  const conversion = new THREE.Matrix4().fromArray(registeredR01);
  const geometry = original.geometry.clone().applyMatrix4(conversion.multiply(original.matrixWorld));
  // Make a quarter sector read as a horizontal arch; rotate it onto the studio
  // floor while keeping CAD pockets, screw holes and sliding joints unchanged.
  if (name.startsWith("base")) geometry.rotateZ(Math.PI / 4);
  geometry.rotateX(-Math.PI / 2);
  geometry.computeBoundingBox();
  const bounds = geometry.boundingBox;
  const center = bounds.getCenter(new THREE.Vector3());
  geometry.translate(-center.x, -bounds.min.y, -center.z);
  geometry.computeBoundingBox();
  geometry.computeBoundingSphere();
  const group = new THREE.Group();
  const ivory = new THREE.MeshPhysicalMaterial({color: 0xd2c6b2, roughness: .42, metalness: 0, clearcoat: .1, clearcoatRoughness: .5});
  group.add(mesh(THREE, geometry, ivory));
  group.add(edgeAccent(THREE, geometry, 0x938e82, .16));
  group.userData.sourceNode = name;
  group.userData.sourceURL = "/assembly/layer-01.glb";
  return group;
}

function nickelCube(THREE) {
  const group = new THREE.Group();
  // Red N / blue S are teaching colours, not a claim about the supplied finish.
  // Split the existing rounded surface at the exact equator so both the saved
  // GLB and PNG have one sharp polarity boundary and the same 12 mm outer size.
  const geometry = new RoundedBoxGeometry(12, 12, 12, 5, .22);
  const positions = geometry.attributes.position, normals = geometry.attributes.normal;
  const indices = geometry.index?.array || Array.from({length: positions.count}, (_, i) => i);
  for (const sign of [1, -1]) {
    const clippedPositions = [], clippedNormals = [];
    for (let offset = 0; offset < indices.length; offset += 3) {
      let polygon = Array.from({length: 3}, (_, i) => {
        const index = indices[offset + i];
        return {p: new THREE.Vector3().fromBufferAttribute(positions, index), n: new THREE.Vector3().fromBufferAttribute(normals, index)};
      });
      const output = [];
      for (let i = 0; i < polygon.length; i++) {
        const a = polygon[i], b = polygon[(i + 1) % polygon.length];
        const insideA = sign * a.p.y >= -1e-8, insideB = sign * b.p.y >= -1e-8;
        if (insideA) output.push(a);
        if (insideA !== insideB) {
          const ratio = a.p.y / (a.p.y - b.p.y);
          output.push({p: a.p.clone().lerp(b.p, ratio), n: a.n.clone().lerp(b.n, ratio).normalize()});
        }
      }
      polygon = output;
      for (let i = 1; i + 1 < polygon.length; i++) for (const point of [polygon[0], polygon[i], polygon[i + 1]]) {
        clippedPositions.push(...point.p.toArray()); clippedNormals.push(...point.n.toArray());
      }
    }
    const half = new THREE.BufferGeometry();
    half.setAttribute("position", new THREE.Float32BufferAttribute(clippedPositions, 3));
    half.setAttribute("normal", new THREE.Float32BufferAttribute(clippedNormals, 3));
    const material = new THREE.MeshPhysicalMaterial({color: sign > 0 ? 0xe83835 : 0x0879db, metalness: 0, roughness: .58, clearcoat: .05, clearcoatRoughness: .5});
    const cubeHalf = mesh(THREE, half, material);
    cubeHalf.name = sign > 0 ? "N-pole-teaching-red" : "S-pole-teaching-blue";
    cubeHalf.position.y = 6;
    group.add(cubeHalf);
  }
  geometry.dispose();
  group.rotation.y = -.17;
  return group;
}

function clearQuarter(THREE) {
  const group = new THREE.Group();
  const shape = new THREE.Shape();
  // A broad curved piece illustrates circumferential insertion. These are
  // display proportions only: independent outline / hole CAD is pending.
  // Thickness is explicitly confirmed by the supplied assembly feedback.
  const inner = 115, outer = 200, start = Math.PI / 4, end = Math.PI * 3 / 4;
  shape.moveTo(outer * Math.cos(start), outer * Math.sin(start));
  shape.absarc(0, 0, outer, start, end, false);
  shape.lineTo(inner * Math.cos(end), inner * Math.sin(end));
  shape.absarc(0, 0, inner, end, start, true);
  shape.closePath();
  const geometry = new THREE.ExtrudeGeometry(shape, {depth: 2, bevelEnabled: false, curveSegments: 80});
  geometry.rotateX(-Math.PI / 2);
  geometry.computeBoundingBox();
  const bounds = geometry.boundingBox, center = bounds.getCenter(new THREE.Vector3());
  geometry.translate(-center.x, -bounds.min.y, -center.z);
  const material = new THREE.MeshPhysicalMaterial({color: 0xc7e3eb, metalness: 0, roughness: .14, transmission: .76, thickness: 2, ior: 1.49, clearcoat: .75, clearcoatRoughness: .13, transparent: true, opacity: .83, side: THREE.DoubleSide, depthWrite: false});
  const clear = mesh(THREE, geometry, material);
  clear.castShadow = false;
  clear.receiveShadow = false;
  group.add(clear, edgeAccent(THREE, geometry, 0x527a8f, .6, 30));
  return group;
}

function extrusionGeometry(THREE, width, height, length) {
  const minor = Math.min(width, height), opening = minor * .105, chamber = minor * .23, lip = minor * .075, depth = minor * .23, radius = minor * .075;
  const shape = new THREE.Shape();
  shape.moveTo(-width / 2 + radius, height / 2);
  for (let face = 0; face < 4; face++) {
    const span = (face % 2 ? height : width) / 2, reach = (face % 2 ? width : height) / 2;
    const tangent = new THREE.Vector2(Math.cos(-face * Math.PI / 2), Math.sin(-face * Math.PI / 2));
    const normal = new THREE.Vector2(-tangent.y, tangent.x);
    const side = [[-opening, reach], [-opening, reach - lip], [-chamber, reach - lip], [-chamber, reach - depth], [chamber, reach - depth], [chamber, reach - lip], [opening, reach - lip], [opening, reach], [span - radius, reach]];
    for (const [a, b] of side) shape.lineTo(tangent.x * a + normal.x * b, tangent.y * a + normal.y * b);
    const center = tangent.clone().multiplyScalar(span - radius).addScaledVector(normal, reach - radius);
    shape.absarc(center.x, center.y, radius, Math.PI / 2 - face * Math.PI / 2, -face * Math.PI / 2, true);
  }
  shape.closePath();
  const bore = new THREE.Path();
  bore.absarc(0, 0, minor * .105, 0, Math.PI * 2, false);
  shape.holes.push(bore);
  const geometry = new THREE.ExtrudeGeometry(shape, {depth: length, bevelEnabled: false, curveSegments: 12, steps: 1});
  geometry.translate(0, 0, -length / 2);
  return geometry;
}

function aluminumFrame(THREE) {
  const group = new THREE.Group();
  const aluminum = new THREE.MeshPhysicalMaterial({color: 0xbcc4cc, metalness: .87, roughness: .31, clearcoat: .12, clearcoatRoughness: .3});
  const connections = new THREE.MeshStandardMaterial({color: 0x929da8, metalness: .86, roughness: .38});
  const geometryCache = new Map();
  function beam(position, width, height, length, axis = "z") {
    const key = `${width}/${height}/${length}`;
    if (!geometryCache.has(key)) geometryCache.set(key, extrusionGeometry(THREE, width, height, length));
    const geometry = geometryCache.get(key);
    const bar = mesh(THREE, geometry, aluminum), accents = edgeAccent(THREE, geometry, 0x4c5864, .21, 36);
    bar.position.set(...position);
    if (axis === "x") bar.rotation.y = Math.PI / 2;
    if (axis === "y") bar.rotation.x = -Math.PI / 2;
    accents.position.copy(bar.position);
    accents.quaternion.copy(bar.quaternion);
    group.add(bar, accents);
  }
  // Match the existing teaching frame topology, with visible four-sided T-slots
  // and through-bores. This is not an approved stock series or cut-length list.
  for (const z of [-295, 295]) {
    for (const x of [-235.1, 235.1]) beam([x, 187.5, z], 40, 40, 335, "y");
    beam([0, 0, z], 40, 40, 510.2, "x");
  }
  for (const x of [-235.1, 235.1]) beam([x, 275.1, 0], 40, 80, 550);
  beam([0, 40, 0], 80, 40, 590);
  const bracketShape = new THREE.Shape();
  bracketShape.moveTo(0, 0);
  for (const point of [[27, 0], [27, 3], [3, 3], [3, 27], [0, 27]]) bracketShape.lineTo(...point);
  bracketShape.closePath();
  const bracketGeometry = new THREE.ExtrudeGeometry(bracketShape, {depth: 18, bevelEnabled: true, bevelThickness: .3, bevelSize: .3, bevelSegments: 1, steps: 1});
  bracketGeometry.translate(0, 0, -9);
  for (const x of [-215.1, 215.1]) for (const y of [20, 255.1]) for (const z of [-275, 275]) {
    const bracket = mesh(THREE, bracketGeometry, connections);
    bracket.position.set(x, y, z);
    bracket.rotation.y = z < 0 ? -Math.PI / 2 : Math.PI / 2;
    group.add(bracket);
  }
  group.userData.profileStatus = "illustrative-not-stock-series";
  return group;
}

export async function buildPart(THREE, id, options = {}) {
  if (id === "magnet-cube") return {object: nickelCube(THREE), provenance: "schematic", note: "True 12 mm cube outer size. Red indicates N and blue indicates S for teaching; these colours and edge treatment are not supplied-finish specifications."};
  if (id === "printed-ring") return {object: await registeredSegment(THREE, "base-05", options), provenance: "cad", source: "模型/layer1.step · base-05", note: "One actual registered R01 quarter housing. Polymer colour illustrates the current print material setting."};
  if (id === "ring-cover") return {object: await registeredSegment(THREE, "cover-04", options), provenance: "cad", source: "模型/layer1.step · cover-04", note: "One actual registered R01 cap. Its CAD openings and screw holes are preserved."};
  if (id === "acrylic") return {object: clearQuarter(THREE), provenance: "schematic", note: "Confirmed 2 mm clear-cover thickness. Curved outline remains illustrative: matching DXF and hole coordinates have not been provided, so no fastening holes are invented.", confirmedThicknessMM: 2, holeGeometryStatus: "matching-dxf-not-provided"};
  if (id === "aluminum-frame") return {object: aluminumFrame(THREE), provenance: "schematic", note: "Detailed illustrative T-slot frame based on the current teaching topology. Supplied extrusion series, cut lengths and joint hardware are not inferred."};
  throw new Error(`Unknown core BOM scene: ${id}`);
}
